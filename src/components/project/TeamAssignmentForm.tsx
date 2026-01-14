import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import type { TeamMember } from "@/components/team/TeamMemberCard";

interface TeamAssignment {
  id?: string;
  team_member_id: string;
  role_in_project: string;
  allocation_percentage: number;
  team_member?: TeamMember;
}

interface TeamAssignmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment?: TeamAssignment | null;
  availableMembers: TeamMember[];
  onSave: (assignment: Omit<TeamAssignment, "id" | "team_member"> & { id?: string }) => void;
  onDelete?: (id: string) => void;
}

const projectRoles = [
  "Engagement Lead",
  "Project Director", 
  "Workstream Lead",
  "Team Member",
  "Subject Matter Expert",
  "Analyst",
  "Technical Lead",
  "Business Analyst"
];

export function TeamAssignmentForm({ 
  open, 
  onOpenChange, 
  assignment, 
  availableMembers, 
  onSave, 
  onDelete 
}: TeamAssignmentFormProps) {
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [role, setRole] = useState("Team Member");
  const [allocation, setAllocation] = useState(100);

  useEffect(() => {
    if (assignment) {
      setSelectedMemberId(assignment.team_member_id);
      setRole(assignment.role_in_project);
      setAllocation(assignment.allocation_percentage);
    } else {
      setSelectedMemberId("");
      setRole("Team Member");
      setAllocation(100);
    }
  }, [assignment, open]);

  const selectedMember = availableMembers.find(m => m.id === selectedMemberId);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) return;
    
    onSave({
      id: assignment?.id,
      team_member_id: selectedMemberId,
      role_in_project: role,
      allocation_percentage: allocation,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>{assignment ? "Edit Assignment" : "Assign Team Member"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Team Member Selection */}
          <div className="space-y-2">
            <Label>Team Member</Label>
            <Select 
              value={selectedMemberId} 
              onValueChange={setSelectedMemberId}
              disabled={!!assignment}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select a team member" />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.name}</span>
                      <span className="text-muted-foreground text-xs">({member.level})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Member Preview */}
          {selectedMember && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedMember.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(selectedMember.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedMember.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedMember.level} • {selectedMember.role}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Project Role */}
          <div className="space-y-2">
            <Label>Role in Project</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projectRoles.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Allocation Percentage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Allocation</Label>
              <span className="text-sm font-medium">{allocation}%</span>
            </div>
            <Slider
              value={[allocation]}
              onValueChange={(v) => setAllocation(v[0])}
              min={10}
              max={100}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            {assignment && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onDelete(assignment.id!);
                  onOpenChange(false);
                }}
              >
                Remove
              </Button>
            )}
            <div className={`flex gap-3 ${!assignment ? 'ml-auto' : ''}`}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!selectedMemberId}>
                {assignment ? "Save Changes" : "Assign Member"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}