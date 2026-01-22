import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "practice_leader" | "engagement_lead" | "member";

interface UserRoleContextType {
  role: AppRole;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isPracticeLeader: boolean;
  isEngagementLead: boolean;
  isMember: boolean;
  canCreateProjects: boolean;
  canManageUsers: boolean;
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
      setRoles(userRoles.length > 0 ? userRoles : ["member"]);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      setRoles(["member"]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [user]);

  // Get the highest priority role
  const getHighestRole = (): AppRole => {
    if (roles.includes("admin")) return "admin";
    if (roles.includes("practice_leader")) return "practice_leader";
    if (roles.includes("engagement_lead")) return "engagement_lead";
    return "member";
  };

  const isAdmin = roles.includes("admin");
  const isPracticeLeader = roles.includes("practice_leader") || isAdmin;
  const isEngagementLead = roles.includes("engagement_lead") || isPracticeLeader;
  const isMember = roles.includes("member");

  const value: UserRoleContextType = {
    role: getHighestRole(),
    roles,
    loading,
    isAdmin,
    isPracticeLeader,
    isEngagementLead,
    isMember,
    canCreateProjects: isAdmin || isPracticeLeader || isEngagementLead,
    canManageUsers: isAdmin,
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
