import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Building2 } from "lucide-react";

interface ClientAccess {
  id: string;
  user_id: string;
  client_id: string;
  access_level: string;
  created_at: string;
  user?: {
    email: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  client?: {
    name: string;
    industry: string | null;
  };
}

interface Client {
  id: string;
  name: string;
  industry: string | null;
}

interface UserProfile {
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function AccountAccessManager() {
  const { canManageAccounts, hasGlobalAccess } = useUserRole();
  const { user } = useAuth();
  const [accessList, setAccessList] = useState<ClientAccess[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("view");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch client access records
      const { data: accessData, error: accessError } = await supabase
        .from("client_access")
        .select("*")
        .order("created_at", { ascending: false });

      if (accessError) throw accessError;

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, industry")
        .order("name");

      if (clientsError) throw clientsError;

      // Fetch user profiles
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("user_id, email, display_name, avatar_url")
        .order("email");

      if (usersError) throw usersError;

      // Combine access records with user and client info
      const enrichedAccess = (accessData || []).map((access) => {
        const userProfile = (usersData || []).find((u) => u.user_id === access.user_id);
        const client = (clientsData || []).find((c) => c.id === access.client_id);
        return {
          ...access,
          user: userProfile
            ? {
                email: userProfile.email,
                display_name: userProfile.display_name,
                avatar_url: userProfile.avatar_url,
              }
            : undefined,
          client: client
            ? {
                name: client.name,
                industry: client.industry,
              }
            : undefined,
        };
      });

      setAccessList(enrichedAccess);
      setClients(clientsData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load account access data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasGlobalAccess) {
      fetchData();
    }
  }, [hasGlobalAccess]);

  const handleAddAccess = async () => {
    if (!selectedUser || !selectedClient) {
      toast.error("Please select both a user and a client");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("client_access").insert({
        user_id: selectedUser,
        client_id: selectedClient,
        access_level: selectedLevel,
        granted_by: user?.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("This user already has access to this client");
        } else {
          throw error;
        }
      } else {
        toast.success("Access granted successfully");
        setShowAddDialog(false);
        setSelectedUser("");
        setSelectedClient("");
        setSelectedLevel("view");
        fetchData();
      }
    } catch (error) {
      console.error("Error granting access:", error);
      toast.error("Failed to grant access");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAccess = async (accessId: string) => {
    try {
      const { error } = await supabase.from("client_access").delete().eq("id", accessId);

      if (error) throw error;

      toast.success("Access revoked successfully");
      fetchData();
    } catch (error) {
      console.error("Error revoking access:", error);
      toast.error("Failed to revoke access");
    }
  };

  if (!canManageAccounts) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        You don't have permission to manage account access.
      </div>
    );
  }

  const accessLevelColors: Record<string, string> = {
    view: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    edit: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    manage: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Account Access</h3>
          <p className="text-sm text-muted-foreground">
            Assign users to specific client accounts
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Grant Access
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant Client Access</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback>
                              {(u.display_name || u.email).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{u.display_name || u.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{c.name}</span>
                          {c.industry && (
                            <span className="text-xs text-muted-foreground">({c.industry})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View - Read-only access</SelectItem>
                    <SelectItem value="edit">Edit - Can modify project data</SelectItem>
                    <SelectItem value="manage">Manage - Full control</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAccess} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Grant Access
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : accessList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No account access assignments yet.</p>
          <p className="text-sm">Grant users access to specific client accounts.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Access Level</TableHead>
                <TableHead>Granted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessList.map((access) => (
                <TableRow key={access.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={access.user?.avatar_url || undefined} />
                        <AvatarFallback>
                          {(access.user?.display_name || access.user?.email || "U")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {access.user?.display_name || "Unknown User"}
                        </p>
                        <p className="text-sm text-muted-foreground">{access.user?.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{access.client?.name || "Unknown Client"}</p>
                        {access.client?.industry && (
                          <p className="text-sm text-muted-foreground">{access.client.industry}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={accessLevelColors[access.access_level] || ""} variant="secondary">
                      {access.access_level.charAt(0).toUpperCase() + access.access_level.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(access.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAccess(access.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
