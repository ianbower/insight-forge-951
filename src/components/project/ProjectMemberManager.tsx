import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserPlus, MoreHorizontal, Shield, Trash2, Edit, Crown, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ProjectMember {
  id: string;
  user_id: string;
  role_in_project: string;
  can_manage: boolean;
  joined_at: string;
  profile?: {
    email: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface ProjectMemberManagerProps {
  projectId: string;
  ownerId?: string | null;
}

const projectRoles = [
  { value: "lead", label: "Project Lead", description: "Can manage project and team" },
  { value: "member", label: "Team Member", description: "Can view and contribute" },
  { value: "viewer", label: "Viewer", description: "View-only access" },
];

export function ProjectMemberManager({ projectId, ownerId }: ProjectMemberManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<ProjectMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteCanManage, setInviteCanManage] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwner = user?.id === ownerId;
  const currentMember = members.find(m => m.user_id === user?.id);
  const canManageMembers = isOwner || currentMember?.can_manage;

  const fetchMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("project_members")
        .select(`
          id,
          user_id,
          role_in_project,
          can_manage,
          joined_at,
          profiles!project_members_user_id_fkey (
            email,
            display_name,
            avatar_url
          )
        `)
        .eq("project_id", projectId);

      if (error) throw error;

      // Also fetch owner profile
      let ownerProfile = null;
      if (ownerId) {
        const { data: ownerData } = await supabase
          .from("profiles")
          .select("email, display_name, avatar_url")
          .eq("user_id", ownerId)
          .maybeSingle();
        ownerProfile = ownerData;
      }

      const formattedMembers: ProjectMember[] = (data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role_in_project: m.role_in_project,
        can_manage: m.can_manage,
        joined_at: m.joined_at,
        profile: m.profiles,
      }));

      // Add owner as a special member if not already in the list
      if (ownerId && ownerProfile && !formattedMembers.some(m => m.user_id === ownerId)) {
        formattedMembers.unshift({
          id: "owner",
          user_id: ownerId,
          role_in_project: "owner",
          can_manage: true,
          joined_at: "",
          profile: ownerProfile,
        });
      }

      setMembers(formattedMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId, ownerId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const getInitials = (name: string | null, email: string) => {
    const source = name || email;
    return source
      .split(/[\s@]/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "lead":
        return "secondary";
      case "member":
        return "outline";
      default:
        return "outline";
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSaving(true);

    try {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", inviteEmail.toLowerCase().trim())
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profile) {
        toast({
          title: "User not found",
          description: "No user account exists with this email address. They need to sign up first.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Check if already a member
      const existingMember = members.find(m => m.user_id === profile.user_id);
      if (existingMember) {
        toast({
          title: "Already a member",
          description: "This user is already a project member.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Add member
      const { error: insertError } = await supabase
        .from("project_members")
        .insert({
          project_id: projectId,
          user_id: profile.user_id,
          role_in_project: inviteRole,
          can_manage: inviteCanManage,
        });

      if (insertError) throw insertError;

      toast({ title: "Member added successfully" });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      setInviteCanManage(false);
      fetchMembers();
    } catch (error: any) {
      console.error("Error inviting member:", error);
      toast({
        title: "Error adding member",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMember = async () => {
    if (!editMember) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("project_members")
        .update({
          role_in_project: editMember.role_in_project,
          can_manage: editMember.can_manage,
        })
        .eq("id", editMember.id);

      if (error) throw error;

      toast({ title: "Member updated" });
      setEditMember(null);
      fetchMembers();
    } catch (error: any) {
      toast({
        title: "Error updating member",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({ title: "Member removed" });
      fetchMembers();
    } catch (error: any) {
      toast({
        title: "Error removing member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium">Project Access</CardTitle>
              <CardDescription>
                Manage who has access to this project
              </CardDescription>
            </div>
            {canManageMembers && (
              <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  {canManageMembers && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(member.profile?.display_name || null, member.profile?.email || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {member.profile?.display_name || member.profile?.email}
                            {member.user_id === user?.id && (
                              <span className="text-muted-foreground ml-1">(you)</span>
                            )}
                          </p>
                          {member.profile?.display_name && (
                            <p className="text-xs text-muted-foreground">{member.profile.email}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(member.role_in_project)} className="capitalize gap-1">
                        {member.role_in_project === "owner" && <Crown className="h-3 w-3" />}
                        {member.role_in_project}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.can_manage || member.role_in_project === "owner" ? (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Shield className="h-3 w-3" />
                          Can manage
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">View & edit</span>
                      )}
                    </TableCell>
                    {canManageMembers && (
                      <TableCell>
                        {member.role_in_project !== "owner" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditMember(member)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No additional members</p>
              <p className="text-sm mt-1">Add team members to collaborate on this project</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader>
            <DialogTitle>Add Project Member</DialogTitle>
            <DialogDescription>
              Add a user to this project. They must have an existing account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <p>{role.label}</p>
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Management Permissions</Label>
                <p className="text-xs text-muted-foreground">
                  Can edit project settings and manage members
                </p>
              </div>
              <Switch 
                checked={inviteCanManage} 
                onCheckedChange={setInviteCanManage}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setInviteOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleInvite} 
                disabled={!inviteEmail.trim() || saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Member"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader>
            <DialogTitle>Edit Member Role</DialogTitle>
          </DialogHeader>
          
          {editMember && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={editMember.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(editMember.profile?.display_name || null, editMember.profile?.email || "")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{editMember.profile?.display_name || editMember.profile?.email}</p>
                  <p className="text-sm text-muted-foreground">{editMember.profile?.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select 
                  value={editMember.role_in_project} 
                  onValueChange={(v) => setEditMember({ ...editMember, role_in_project: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projectRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <p>{role.label}</p>
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Management Permissions</Label>
                  <p className="text-xs text-muted-foreground">
                    Can edit project settings and manage members
                  </p>
                </div>
                <Switch 
                  checked={editMember.can_manage} 
                  onCheckedChange={(v) => setEditMember({ ...editMember, can_manage: v })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setEditMember(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateMember} 
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
