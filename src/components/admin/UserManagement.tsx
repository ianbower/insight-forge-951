import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleSelector, RoleBadge } from "./RoleSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Search, UserPlus, Loader2, MoreHorizontal, KeyRound, UserX, Ban, UserCheck, Trash2 } from "lucide-react";
import { BulkUserImport } from "./BulkUserImport";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";

interface UserWithRole {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  roles: AppRole[];
  created_at: string;
  is_suspended?: boolean;
}

type UserAction = "delete" | "suspend" | "unsuspend" | "reset_password";

export function UserManagement() {
  const { isSuperAdmin, canManageUsers } = useUserRole();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("consultant");
  const [saving, setSaving] = useState(false);
  
  // Add user state
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("consultant");
  const [addingUser, setAddingUser] = useState(false);
  
  // User action state
  const [actionUser, setActionUser] = useState<UserWithRole | null>(null);
  const [pendingAction, setPendingAction] = useState<UserAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, display_name, avatar_url, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRoles = (rolesData || [])
          .filter((r) => r.user_id === profile.user_id)
          .map((r) => r.role as AppRole);

        return {
          id: profile.user_id,
          email: profile.email,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          roles: userRoles.length > 0 ? userRoles : ["consultant"],
          created_at: profile.created_at,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
    }
  }, [canManageUsers]);

  const handleUpdateRole = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      // Delete existing roles for this user
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", editingUser.id);

      // Insert new role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: editingUser.id, role: selectedRole });

      if (error) throw error;

      toast.success(`Updated role for ${editingUser.display_name || editingUser.email}`);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setAddingUser(true);
    try {
      // Generate a temporary password
      const tempPassword = crypto.randomUUID().slice(0, 16);
      
      // Create the user via Supabase Auth admin API (this requires admin privileges)
      // For now, we'll use the signUp method which will send a confirmation email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserEmail.trim(),
        password: tempPassword,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: newUserName.trim() || undefined,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Assign the selected role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: authData.user.id, role: newUserRole });

        if (roleError) {
          console.error("Error assigning role:", roleError);
          // Don't throw - user is created, just role assignment failed
        }
      }

      toast.success(`Invitation sent to ${newUserEmail}. They will receive an email to set their password.`);
      setAddUserOpen(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserRole("consultant");
      
      // Refresh the user list after a short delay to allow the profile trigger to create the profile
      setTimeout(() => fetchUsers(), 1000);
    } catch (error: any) {
      console.error("Error adding user:", error);
      if (error.message?.includes("already registered")) {
        toast.error("This email is already registered");
      } else {
        toast.error("Failed to add user: " + (error.message || "Unknown error"));
      }
    } finally {
      setAddingUser(false);
    }
  };

  const executeUserAction = async () => {
    if (!actionUser || !pendingAction) return;
    
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-actions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: pendingAction,
            userId: actionUser.id,
          }),
        }
      );

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success(result.message);
      
      // Refresh users list (for delete) or update local state (for suspend/unsuspend)
      if (pendingAction === "delete") {
        setUsers(prev => prev.filter(u => u.id !== actionUser.id));
      } else if (pendingAction === "suspend") {
        setUsers(prev => prev.map(u => u.id === actionUser.id ? { ...u, is_suspended: true } : u));
      } else if (pendingAction === "unsuspend") {
        setUsers(prev => prev.map(u => u.id === actionUser.id ? { ...u, is_suspended: false } : u));
      }
    } catch (error: any) {
      console.error("User action error:", error);
      toast.error(error.message || "Failed to perform action");
    } finally {
      setActionLoading(false);
      setActionUser(null);
      setPendingAction(null);
    }
  };

  const getActionDialogContent = () => {
    if (!actionUser || !pendingAction) return { title: "", description: "" };
    
    const userName = actionUser.display_name || actionUser.email;
    
    switch (pendingAction) {
      case "delete":
        return {
          title: "Delete User",
          description: `Are you sure you want to permanently delete ${userName}? This action cannot be undone and will remove all their data.`,
        };
      case "suspend":
        return {
          title: "Suspend User",
          description: `Are you sure you want to suspend ${userName}? They will not be able to log in until reactivated.`,
        };
      case "unsuspend":
        return {
          title: "Reactivate User",
          description: `Are you sure you want to reactivate ${userName}? They will be able to log in again.`,
        };
      case "reset_password":
        return {
          title: "Force Password Reset",
          description: `Send a password reset email to ${userName}? They will need to set a new password to continue using their account.`,
        };
      default:
        return { title: "", description: "" };
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.display_name?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  if (!canManageUsers) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        You don't have permission to manage users.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <BulkUserImport onComplete={fetchUsers} isSuperAdmin={isSuperAdmin} />
          
          <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Invite a new user to the platform. They will receive an email to set their password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@company.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <RoleSelector
                  value={newUserRole}
                  onChange={setNewUserRole}
                  canAssignSuperAdmin={isSuperAdmin}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddUserOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUser} disabled={addingUser || !newUserEmail.trim()}>
                {addingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Invitation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const isCurrentUser = user.id === currentUser?.id;
                return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {(user.display_name || user.email).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.display_name || "No name"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.is_suspended ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                        <Ban className="h-3 w-3" />
                        Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                        <UserCheck className="h-3 w-3" />
                        Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <RoleBadge key={role} role={role} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Dialog
                          open={editingUser?.id === user.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setEditingUser(user);
                              setSelectedRole(user.roles[0] || "consultant");
                            } else {
                              setEditingUser(null);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Edit Role
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User Role</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={user.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {(user.display_name || user.email).slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.display_name || "No name"}</p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Role</Label>
                                <RoleSelector
                                  value={selectedRole}
                                  onChange={setSelectedRole}
                                  canAssignSuperAdmin={isSuperAdmin}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setEditingUser(null)}>
                                Cancel
                              </Button>
                              <Button onClick={handleUpdateRole} disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Save Changes
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {!isCurrentUser && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setActionUser(user);
                                  setPendingAction("reset_password");
                                }}
                              >
                                <KeyRound className="h-4 w-4 mr-2" />
                                Force Password Reset
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.is_suspended ? (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setActionUser(user);
                                    setPendingAction("unsuspend");
                                  }}
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Reactivate User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setActionUser(user);
                                    setPendingAction("suspend");
                                  }}
                                  className="text-amber-600 focus:text-amber-600"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Suspend User
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setActionUser(user);
                                  setPendingAction("delete");
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Action Confirmation Dialog */}
      <AlertDialog open={!!actionUser && !!pendingAction} onOpenChange={(open) => {
        if (!open) {
          setActionUser(null);
          setPendingAction(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionDialogContent().title}</AlertDialogTitle>
            <AlertDialogDescription>
              {getActionDialogContent().description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeUserAction}
              disabled={actionLoading}
              className={pendingAction === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {pendingAction === "delete" ? "Delete" : 
               pendingAction === "suspend" ? "Suspend" :
               pendingAction === "unsuspend" ? "Reactivate" : "Send Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
