import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import type { TeamMember } from "./TeamMemberCard";

interface TeamMemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: TeamMember | null;
  onSave: (member: Omit<TeamMember, "id"> & { id?: string }) => void;
}

const levels = ["Partner", "Director", "Manager", "Consultant", "Analyst"];
const roles = ["Engagement Lead", "Project Director", "Workstream Lead", "Team Member", "Subject Matter Expert", "Analyst"];

export function TeamMemberForm({ open, onOpenChange, member, onSave }: TeamMemberFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState("Consultant");
  const [role, setRole] = useState("Team Member");
  const [skills, setSkills] = useState<{ name: string; proficiency?: number }[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [availability, setAvailability] = useState(100);

  useEffect(() => {
    if (member) {
      setName(member.name);
      setEmail(member.email);
      setLevel(member.level);
      setRole(member.role);
      setSkills(member.skills || []);
      setHourlyRate(member.hourly_rate?.toString() || "");
      setAvailability(member.availability_percentage);
    } else {
      setName("");
      setEmail("");
      setLevel("Consultant");
      setRole("Team Member");
      setSkills([]);
      setNewSkill("");
      setHourlyRate("");
      setAvailability(100);
    }
  }, [member, open]);

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.find(s => s.name.toLowerCase() === newSkill.trim().toLowerCase())) {
      setSkills([...skills, { name: newSkill.trim() }]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillName: string) => {
    setSkills(skills.filter(s => s.name !== skillName));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: member?.id,
      name,
      email,
      level,
      role,
      skills,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      availability_percentage: availability,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>{member ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@company.com"
                required
                className="bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Skills</Label>
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a skill..."
                className="bg-background"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {skill.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill.name)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate">Hourly Rate ($)</Label>
              <Input
                id="rate"
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="150"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="availability">Availability (%)</Label>
              <Input
                id="availability"
                type="number"
                min={0}
                max={100}
                value={availability}
                onChange={(e) => setAvailability(parseInt(e.target.value) || 0)}
                className="bg-background"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {member ? "Save Changes" : "Add Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
