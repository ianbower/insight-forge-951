import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Crown, Briefcase, Users, UserCheck, User } from "lucide-react";
import { AppRole } from "@/hooks/useUserRole";

interface RoleSelectorProps {
  value: AppRole;
  onChange: (role: AppRole) => void;
  disabled?: boolean;
  canAssignSuperAdmin?: boolean;
}

const roleConfig: Record<string, { label: string; icon: React.ReactNode; description: string; color: string }> = {
  super_admin: {
    label: "Super Admin",
    icon: <Crown className="h-4 w-4" />,
    description: "Full system access",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  admin: {
    label: "Admin",
    icon: <Shield className="h-4 w-4" />,
    description: "User & settings management",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  partner: {
    label: "Partner",
    icon: <Briefcase className="h-4 w-4" />,
    description: "Global project visibility",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  account_lead: {
    label: "Account Lead",
    icon: <Users className="h-4 w-4" />,
    description: "Assigned accounts access",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  delivery_lead: {
    label: "Delivery Lead",
    icon: <UserCheck className="h-4 w-4" />,
    description: "Assigned projects access",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  consultant: {
    label: "Consultant",
    icon: <User className="h-4 w-4" />,
    description: "Assigned tasks access",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  },
};

export function RoleSelector({ value, onChange, disabled, canAssignSuperAdmin }: RoleSelectorProps) {
  const roles = canAssignSuperAdmin 
    ? Object.keys(roleConfig) as AppRole[]
    : (Object.keys(roleConfig) as AppRole[]).filter(r => r !== "super_admin");

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue>
          {roleConfig[value] && (
            <div className="flex items-center gap-2">
              {roleConfig[value].icon}
              <span>{roleConfig[value].label}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role} value={role}>
            <div className="flex items-center gap-2">
              {roleConfig[role].icon}
              <div>
                <div className="font-medium">{roleConfig[role].label}</div>
                <div className="text-xs text-muted-foreground">{roleConfig[role].description}</div>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function RoleBadge({ role }: { role: AppRole }) {
  const config = roleConfig[role] || roleConfig.consultant;
  
  return (
    <Badge className={`${config.color} gap-1`} variant="secondary">
      {config.icon}
      {config.label}
    </Badge>
  );
}
