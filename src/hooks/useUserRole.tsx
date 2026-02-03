import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Extended role types - includes both new and legacy roles for backward compatibility
export type AppRole = 
  | "super_admin" 
  | "admin" 
  | "partner" 
  | "account_lead" 
  | "delivery_lead" 
  | "consultant"
  // Legacy roles (for backward compatibility during migration)
  | "practice_leader" 
  | "engagement_lead" 
  | "member";

interface UserRoleContextType {
  role: AppRole;
  roles: AppRole[];
  loading: boolean;
  // Role checks
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isPartner: boolean;
  isAccountLead: boolean;
  isDeliveryLead: boolean;
  isConsultant: boolean;
  // Permission checks
  hasGlobalAccess: boolean;
  canManageUsers: boolean;
  canManageAccounts: boolean;
  canCreateProjects: boolean;
  canViewAdmin: boolean;
  canManageTeam: boolean;
  canCreateAssessments: boolean;
  // Legacy compatibility
  isPracticeLeader: boolean;
  isEngagementLead: boolean;
  isMember: boolean;
  refetch: () => Promise<void>;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;

      const userRoles = (data || []).map((r) => r.role as AppRole);
      setRoles(userRoles.length > 0 ? userRoles : ["consultant"]);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      setRoles(["consultant"]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [user]);

  // Get the highest priority role (for display purposes)
  const getHighestRole = (): AppRole => {
    if (roles.includes("super_admin")) return "super_admin";
    if (roles.includes("admin")) return "admin";
    if (roles.includes("partner") || roles.includes("practice_leader")) return "partner";
    if (roles.includes("account_lead")) return "account_lead";
    if (roles.includes("delivery_lead") || roles.includes("engagement_lead")) return "delivery_lead";
    return "consultant";
  };

  // Role checks
  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = roles.includes("admin") || isSuperAdmin;
  const isPartner = roles.includes("partner") || roles.includes("practice_leader") || isAdmin;
  const isAccountLead = roles.includes("account_lead");
  const isDeliveryLead = roles.includes("delivery_lead") || roles.includes("engagement_lead");
  const isConsultant = roles.includes("consultant") || roles.includes("member");

  // Legacy compatibility
  const isPracticeLeader = isPartner;
  const isEngagementLead = isDeliveryLead || isPartner;
  const isMember = true; // All authenticated users are at least members

  // Permission checks
  const hasGlobalAccess = isSuperAdmin || isAdmin || isPartner;
  const canManageUsers = isSuperAdmin || isAdmin;
  const canManageAccounts = hasGlobalAccess;
  const canCreateProjects = hasGlobalAccess || isAccountLead;
  const canViewAdmin = hasGlobalAccess;
  const canManageTeam = hasGlobalAccess;
  const canCreateAssessments = hasGlobalAccess || isAccountLead || isDeliveryLead;

  const value: UserRoleContextType = {
    role: getHighestRole(),
    roles,
    loading,
    // Role checks
    isSuperAdmin,
    isAdmin,
    isPartner,
    isAccountLead,
    isDeliveryLead,
    isConsultant,
    // Permission checks
    hasGlobalAccess,
    canManageUsers,
    canManageAccounts,
    canCreateProjects,
    canViewAdmin,
    canManageTeam,
    canCreateAssessments,
    // Legacy compatibility
    isPracticeLeader,
    isEngagementLead,
    isMember,
    refetch: fetchRoles,
  };

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }
  return context;
}
