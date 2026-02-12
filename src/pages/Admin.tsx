import { Settings, Users, Database, Shield, Building2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";
import { UserManagement } from "@/components/admin/UserManagement";
import { AccountAccessManager } from "@/components/admin/AccountAccessManager";
import { LLMSettings } from "@/components/admin/LLMSettings";
import { RoleBadge } from "@/components/admin/RoleSelector";
import { Navigate } from "react-router-dom";

export default function Admin() {
  const { role, canViewAdmin, canManageUsers, hasGlobalAccess } = useUserRole();

  // Redirect users who can't view admin
  if (!canViewAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Admin Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage workspace settings and configurations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Your role:</span>
          <RoleBadge role={role} />
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-muted/50">
          {canManageUsers && (
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          )}
          {hasGlobalAccess && (
            <TabsTrigger value="accounts" className="gap-2">
              <Building2 className="h-4 w-4" />
              Account Access
            </TabsTrigger>
          )}
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          {canManageUsers && (
            <TabsTrigger value="llm" className="gap-2">
              <Brain className="h-4 w-4" />
              AI / LLM
            </TabsTrigger>
          )}
        </TabsList>

        {canManageUsers && (
          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>
        )}

        {hasGlobalAccess && (
          <TabsContent value="accounts" className="space-y-6">
            <AccountAccessManager />
          </TabsContent>
        )}

        <TabsContent value="general" className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold font-display mb-4">Workspace Settings</h3>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  defaultValue="aXet Consult"
                  className="max-w-md"
                  disabled={!canManageUsers}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  defaultValue="aXet Consulting"
                  className="max-w-md"
                  disabled={!canManageUsers}
                />
              </div>
              <div className="flex items-center justify-between max-w-md">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about project activity
                  </p>
                </div>
                <Switch defaultChecked disabled={!canManageUsers} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold font-display mb-4">Appearance</h3>
            <div className="flex items-center justify-between max-w-md">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle dark theme
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold font-display mb-4">Data Management</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between max-w-md">
                <div className="space-y-0.5">
                  <Label>Auto-save</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save canvas changes
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="pt-4 border-t border-border">
                <Button variant="outline" className="gap-2" disabled={!canManageUsers}>
                  <Database className="h-4 w-4" />
                  Export All Data
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold font-display mb-4">Security Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between max-w-md">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security
                  </p>
                </div>
                <Switch disabled={!canManageUsers} />
              </div>
              <div className="flex items-center justify-between max-w-md">
                <div className="space-y-0.5">
                  <Label>Session Timeout</Label>
                  <p className="text-sm text-muted-foreground">
                    Auto-logout after 30 minutes of inactivity
                  </p>
                </div>
                <Switch defaultChecked disabled={!canManageUsers} />
              </div>
            </div>
          </div>
        </TabsContent>

        {canManageUsers && (
          <TabsContent value="llm" className="space-y-6">
            <LLMSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
