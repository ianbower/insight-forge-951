import { useState, useEffect } from "react";
import { TeamMemberCard, type TeamMember } from "@/components/team/TeamMemberCard";
import { TeamMemberForm } from "@/components/team/TeamMemberForm";
import { TeamUtilization } from "@/components/team/TeamUtilization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Users, Filter, BarChart3 } from "lucide-react";

const levels = ["All Levels", "Partner", "Director", "Manager", "Consultant", "Analyst"];

export default function Team() {
  const [activeTab, setActiveTab] = useState("roster");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("All Levels");
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .order("level", { ascending: true });

    if (error) {
      toast({
        title: "Error fetching team",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Transform skills from JSON to proper type
      const transformed = (data || []).map((m) => ({
        ...m,
        skills: Array.isArray(m.skills) ? m.skills as { name: string; proficiency?: number }[] : [],
      })) as TeamMember[];
      setMembers(transformed);
    }
    setLoading(false);
  };

  const handleSave = async (member: Omit<TeamMember, "id"> & { id?: string }) => {
    if (member.id) {
      // Update
      const { error } = await supabase
        .from("team_members")
        .update({
          name: member.name,
          email: member.email,
          level: member.level,
          role: member.role,
          skills: member.skills,
          hourly_rate: member.hourly_rate,
          availability_percentage: member.availability_percentage,
        })
        .eq("id", member.id);

      if (error) {
        toast({ title: "Error updating member", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Team member updated" });
        fetchMembers();
      }
    } else {
      // Insert
      const { error } = await supabase.from("team_members").insert({
        name: member.name,
        email: member.email,
        level: member.level,
        role: member.role,
        skills: member.skills,
        hourly_rate: member.hourly_rate,
        availability_percentage: member.availability_percentage,
      });

      if (error) {
        toast({ title: "Error adding member", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Team member added" });
        fetchMembers();
      }
    }
    setEditingMember(null);
  };

  const handleDelete = async (member: TeamMember) => {
    const { error } = await supabase.from("team_members").delete().eq("id", member.id);

    if (error) {
      toast({ title: "Error deleting member", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Team member removed" });
      fetchMembers();
    }
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFormOpen(true);
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === "All Levels" || m.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  // Group by level for pyramid display
  const levelOrder = ["Partner", "Director", "Manager", "Consultant", "Analyst"];
  const groupedMembers = levelOrder.reduce((acc, level) => {
    acc[level] = filteredMembers.filter((m) => m.level === level);
    return acc;
  }, {} as Record<string, TeamMember[]>);

  // Calculate stats
  const totalCapacity = members.reduce((sum, m) => sum + m.availability_percentage, 0) / 100;
  const skillsSet = new Set(members.flatMap((m) => m.skills.map((s) => s.name)));

  return (
    <>
      <div className="p-6 space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Team Library</h1>
            <p className="text-muted-foreground">Manage your consulting team roster</p>
          </div>
          {activeTab === "roster" && (
            <Button onClick={() => { setEditingMember(null); setFormOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Team Member
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="roster" className="gap-2">
              <Users className="h-4 w-4" />
              Team Roster
            </TabsTrigger>
            <TabsTrigger value="utilization" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Utilization
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roster" className="mt-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-card border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Total Members</span>
                </div>
                <p className="text-2xl font-bold">{members.length}</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <span className="text-sm">Available FTE</span>
                </div>
                <p className="text-2xl font-bold">{totalCapacity.toFixed(1)}</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <span className="text-sm">Unique Skills</span>
                </div>
                <p className="text-2xl font-bold">{skillsSet.size}</p>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <span className="text-sm">Senior Team</span>
                </div>
                <p className="text-2xl font-bold">
                  {members.filter((m) => ["Partner", "Director", "Manager"].includes(m.level)).length}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Grid by Level */}
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading team...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No team members found</p>
                <Button variant="link" onClick={() => { setEditingMember(null); setFormOpen(true); }}>
                  Add your first team member
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {levelOrder.map((level) => {
                  const levelMembers = groupedMembers[level];
                  if (levelMembers.length === 0) return null;

                  return (
                    <div key={level} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold">{level}s</h2>
                        <Badge variant="secondary">{levelMembers.length}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {levelMembers.map((member) => (
                          <TeamMemberCard
                            key={member.id}
                            member={member}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="utilization" className="mt-6">
            <TeamUtilization />
          </TabsContent>
        </Tabs>

        {/* Form Modal */}
        <TeamMemberForm
          open={formOpen}
          onOpenChange={setFormOpen}
          member={editingMember}
          onSave={handleSave}
        />
      </div>
    </>
  );
}
