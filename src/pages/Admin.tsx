import { Settings, Users, Database, Shield, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Admin() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">
          Admin Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage workspace settings and configurations
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold font-display mb-4">Workspace Settings</h3>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  defaultValue="Consulting Workbench"
                  className="max-w-md"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  defaultValue="Your Consulting Firm"
                  className="max-w-md"
                />
              </div>
              <div className="flex items-center justify-between max-w-md">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about project activity
                  </p>
                </div>
                <Switch defaultChecked />
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

        <TabsContent value="team" className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold font-display">Team Members</h3>
              <Button size="sm">Invite Member</Button>
            </div>
            <div className="space-y-3">
              {[
                { name: "John Doe", email: "john@consulting.com", role: "Admin" },
                { name: "Sarah Chen", email: "sarah@consulting.com", role: "Member" },
                { name: "Michael Brooks", email: "michael@consulting.com", role: "Member" },
              ].map((member, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    {member.role}
                  </span>
                </div>
              ))}
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
                <Button variant="outline" className="gap-2">
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
                <Switch />
              </div>
              <div className="flex items-center justify-between max-w-md">
                <div className="space-y-0.5">
                  <Label>Session Timeout</Label>
                  <p className="text-sm text-muted-foreground">
                    Auto-logout after 30 minutes of inactivity
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
