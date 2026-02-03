
# Enhanced Role-Based Access Control (RBAC) for aXet Consult

## Executive Summary

This plan redesigns the access control system to reflect how a professional consulting firm operates, with clear hierarchies, account-level access control, and strict client data segregation. The new model introduces a **Super Admin** tier, expands the role hierarchy, and adds **Account Lead** functionality for managing client-level access.

---

## Current State Analysis

### Existing Role Structure
| Role | Current Permissions |
|------|---------------------|
| `admin` | Full platform access, user management |
| `practice_leader` | Create projects, elevated access |
| `engagement_lead` | Create projects, elevated access |
| `member` | Access only to assigned projects |

### Current Limitations
1. **No Super Admin distinction** - Admin and Super Admin have identical powers
2. **No account-level access** - Cannot grant access to all projects for a specific client
3. **Limited granularity** - All elevated roles have similar permissions
4. **No user management UI** - Admin page uses static mock data
5. **Partners/Principals not represented** - Senior leadership roles missing

---

## Proposed Role Hierarchy

```text
SUPER_ADMIN
    |
    +-- ADMIN
          |
          +-- PARTNER
                |
                +-- ACCOUNT_LEAD
                      |
                      +-- DELIVERY_LEAD
                            |
                            +-- CONSULTANT
```

### Role Definitions

| Role | Description | Project Access | Admin Access |
|------|-------------|----------------|--------------|
| **super_admin** | Platform owner. Full system access including billing, security settings, and all data | All projects globally | Full system configuration |
| **admin** | IT/Operations admin. Manages users, roles, and platform settings | All projects globally | User management, settings |
| **partner** | Senior Partner/Principal. Oversees all client engagements | All projects globally | View-only admin dashboard |
| **account_lead** | Account/Client Lead. Manages specific client accounts | All projects for assigned accounts | None |
| **delivery_lead** | Engagement/Delivery Manager. Runs specific engagements | Assigned projects only | None |
| **consultant** | Team member. Works on assigned project tasks | Assigned projects only | None |

---

## Database Schema Changes

### 1. Update Role Enum
```sql
-- Add new roles to the enum
ALTER TYPE public.app_role ADD VALUE 'super_admin';
ALTER TYPE public.app_role ADD VALUE 'partner';
ALTER TYPE public.app_role ADD VALUE 'account_lead';
ALTER TYPE public.app_role ADD VALUE 'delivery_lead';
ALTER TYPE public.app_role RENAME VALUE 'member' TO 'consultant';
-- Note: engagement_lead and practice_leader will be deprecated
```

### 2. Create Account Assignments Table
This enables account-level access for Account Leads.

```sql
CREATE TABLE public.client_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    access_level text NOT NULL DEFAULT 'view', -- 'view', 'edit', 'manage'
    granted_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, client_id)
);

ALTER TABLE public.client_access ENABLE ROW LEVEL SECURITY;
```

### 3. New Security Functions
```sql
-- Check if user has global access (super_admin, admin, or partner)
CREATE OR REPLACE FUNCTION public.has_global_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('super_admin', 'admin', 'partner')
  )
$$;

-- Check if user has client-level access
CREATE OR REPLACE FUNCTION public.has_client_access(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_access
    WHERE user_id = _user_id AND client_id = _client_id
  )
$$;

-- Check if user can access a project (comprehensive check)
CREATE OR REPLACE FUNCTION public.can_access_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Global access roles
    has_global_access(_user_id)
    -- Account-level access
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN client_access ca ON ca.client_id = p.client_id
      WHERE p.id = _project_id AND ca.user_id = _user_id
    )
    -- Direct project membership
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = _project_id AND pm.user_id = _user_id
    )
    -- Project ownership
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = _project_id 
      AND (p.owner_id = _user_id OR p.created_by = _user_id)
    )
$$;
```

---

## Updated RLS Policies

### Projects Table
```sql
-- Replace existing SELECT policy
DROP POLICY IF EXISTS "Users can view accessible projects" ON projects;

CREATE POLICY "Users can view accessible projects" ON projects
FOR SELECT USING (
  has_global_access(auth.uid())
  OR has_client_access(auth.uid(), client_id)
  OR is_project_member(id)
  OR owner_id = auth.uid()
  OR created_by = auth.uid()
);
```

### Clients Table
```sql
-- Account Leads can only see their assigned clients
DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;

CREATE POLICY "Users can view accessible clients" ON clients
FOR SELECT USING (
  has_global_access(auth.uid())
  OR has_client_access(auth.uid(), id)
  OR id IN (
    SELECT client_id FROM projects 
    WHERE is_project_member(id) OR owner_id = auth.uid()
  )
);
```

---

## Frontend Implementation

### 1. Update useUserRole Hook
**File**: `src/hooks/useUserRole.tsx`

- Add new role types to `AppRole`
- Add new permission flags:
  - `isSuperAdmin`
  - `isPartner`
  - `isAccountLead`
  - `isDeliveryLead`
  - `isConsultant`
  - `hasGlobalAccess`
  - `canManageAccounts`

### 2. Enhanced Admin Page
**File**: `src/pages/Admin.tsx`

- Replace mock data with real database queries
- Add new tab: **"User Management"**
  - View all platform users with their roles
  - Assign/modify user roles (Super Admin and Admin only)
  - Invite new users via email
- Add new tab: **"Account Access"**
  - Assign Account Leads to specific clients
  - View who has access to which accounts
- Show role-appropriate content based on user permissions

### 3. Role-Based Navigation
**File**: `src/components/layout/AppSidebar.tsx`

- Hide Admin link for Consultants and Delivery Leads
- Show Documentation to all authenticated users
- Add visual indicator for current user's role

### 4. Protected Route Enhancement
**File**: `src/components/auth/ProtectedRoute.tsx`

- Add optional `requiredRoles` prop
- Redirect unauthorized users to appropriate pages
- Show "Access Denied" message for insufficient permissions

---

## Access Control Matrix

| Feature | Super Admin | Admin | Partner | Account Lead | Delivery Lead | Consultant |
|---------|:-----------:|:-----:|:-------:|:------------:|:-------------:|:----------:|
| View all projects | Yes | Yes | Yes | Assigned accounts only | Assigned projects | Assigned projects |
| Create projects | Yes | Yes | Yes | For assigned accounts | No | No |
| Manage users | Yes | Yes | No | No | No | No |
| Assign roles | Yes | Yes (except super_admin) | No | No | No | No |
| Manage account access | Yes | Yes | Yes | No | No | No |
| View Admin page | Yes | Yes | Yes (read-only) | No | No | No |
| Use Tool Library | Yes | Yes | Yes | Yes | Yes | Yes |
| Use Expert AI | Yes | Yes | Yes | Yes | Yes | Yes |
| Create Assessments | Yes | Yes | Yes | Yes | Yes | No |
| Manage Team Library | Yes | Yes | Yes | No | No | No |

---

## Migration Strategy

### Phase 1: Database Updates
1. Add new role enum values
2. Create `client_access` table
3. Create new security functions
4. Update RLS policies

### Phase 2: Data Migration
1. Map existing `practice_leader` → `partner`
2. Map existing `engagement_lead` → `delivery_lead`
3. Map existing `member` → `consultant`
4. Preserve existing `admin` users

### Phase 3: Frontend Updates
1. Update `useUserRole` hook with new roles
2. Enhance Admin page with user management
3. Add role-based navigation filtering
4. Update route protection

### Phase 4: Testing & Validation
1. Verify all role permissions work correctly
2. Test cross-account access restrictions
3. Validate data segregation between clients

---

## Security Considerations

1. **Super Admin Protection**: Only Super Admins can create or demote other Super Admins
2. **Audit Trail**: Log all role changes and access grants
3. **Client Isolation**: Account Leads cannot see other accounts' data
4. **No Anonymous Access**: All core tables require authentication
5. **Principle of Least Privilege**: Default role is `consultant` with minimal access

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| Database migration | Create | Add new roles, tables, functions, policies |
| `src/hooks/useUserRole.tsx` | Modify | Add new role types and permissions |
| `src/pages/Admin.tsx` | Modify | Add real user management functionality |
| `src/components/layout/AppSidebar.tsx` | Modify | Role-based navigation visibility |
| `src/components/auth/ProtectedRoute.tsx` | Modify | Add role-based route protection |
| `src/components/admin/UserManagement.tsx` | Create | User list with role assignment |
| `src/components/admin/AccountAccessManager.tsx` | Create | Client-level access assignment |
| `src/components/admin/RoleSelector.tsx` | Create | Reusable role selection component |

---

## Technical Notes

- All role checks use **Security Definer** functions to prevent RLS recursion
- Role enum is extended (not recreated) to preserve existing data
- `client_access` table enables granular account-level permissions
- Frontend caches role data in React Context for performance
- Role changes take effect immediately (no cache refresh required)
