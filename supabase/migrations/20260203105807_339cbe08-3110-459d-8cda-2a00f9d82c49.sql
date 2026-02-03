-- Migration 2: Create client_access table and security functions

-- Create client_access table for account-level permissions
CREATE TABLE IF NOT EXISTS public.client_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    access_level text NOT NULL DEFAULT 'view',
    granted_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, client_id)
);

ALTER TABLE public.client_access ENABLE ROW LEVEL SECURITY;

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
    has_global_access(_user_id)
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN client_access ca ON ca.client_id = p.client_id
      WHERE p.id = _project_id AND ca.user_id = _user_id
    )
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = _project_id AND pm.user_id = _user_id
    )
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = _project_id 
      AND (p.owner_id = _user_id OR p.created_by = _user_id)
    )
$$;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Check if user can manage users (super_admin or admin)
CREATE OR REPLACE FUNCTION public.can_manage_users(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$$;

-- RLS policies for client_access table
CREATE POLICY "Global access users can view all client access" ON public.client_access
FOR SELECT USING (has_global_access(auth.uid()));

CREATE POLICY "Global access users can manage client access" ON public.client_access
FOR ALL USING (has_global_access(auth.uid()))
WITH CHECK (has_global_access(auth.uid()));

CREATE POLICY "Users can view their own client access" ON public.client_access
FOR SELECT USING (user_id = auth.uid());

-- Update RLS policies for projects table
DROP POLICY IF EXISTS "Users can view accessible projects" ON projects;
DROP POLICY IF EXISTS "Elevated users can create projects" ON projects;

CREATE POLICY "Users can view accessible projects" ON projects
FOR SELECT USING (
  has_global_access(auth.uid())
  OR has_client_access(auth.uid(), client_id)
  OR is_project_member(id)
  OR owner_id = auth.uid()
  OR created_by = auth.uid()
);

CREATE POLICY "Authorized users can create projects" ON projects
FOR INSERT WITH CHECK (
  has_global_access(auth.uid())
  OR has_client_access(auth.uid(), client_id)
);

-- Update RLS policies for clients table  
DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;

CREATE POLICY "Users can view accessible clients" ON clients
FOR SELECT USING (
  has_global_access(auth.uid())
  OR has_client_access(auth.uid(), id)
  OR id IN (
    SELECT client_id FROM projects 
    WHERE is_project_member(id) OR owner_id = auth.uid() OR created_by = auth.uid()
  )
);