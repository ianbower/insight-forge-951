import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { Shield } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
  requiredPermission?: "canViewAdmin" | "canManageUsers" | "hasGlobalAccess" | "canCreateProjects";
}

export function ProtectedRoute({ children, requiredRoles, requiredPermission }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { roles, loading: roleLoading, canViewAdmin, canManageUsers, hasGlobalAccess, canCreateProjects } = useUserRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check required roles
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((role) => roles.includes(role));
    if (!hasRequiredRole) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <Shield className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground text-center max-w-md">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          <Navigate to="/" replace />
        </div>
      );
    }
  }

  // Check required permission
  if (requiredPermission) {
    const permissionMap: Record<string, boolean> = {
      canViewAdmin,
      canManageUsers,
      hasGlobalAccess,
      canCreateProjects,
    };

    if (!permissionMap[requiredPermission]) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <Shield className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground text-center max-w-md">
            You don't have the required permissions to access this page.
          </p>
          <Navigate to="/" replace />
        </div>
      );
    }
  }

  return <>{children}</>;
}
