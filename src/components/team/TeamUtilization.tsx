import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, CheckCircle, TrendingUp, Users } from "lucide-react";

interface TeamMemberWithUtilization {
  id: string;
  name: string;
  email: string;
  level: string;
  role: string;
  avatar_url: string | null;
  availability_percentage: number;
  totalAllocated: number;
  projects: {
    projectId: string;
    projectName: string;
    role: string;
    allocation: number;
  }[];
}

export function TeamUtilization() {
  const [members, setMembers] = useState<TeamMemberWithUtilization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUtilizationData();
  }, []);

  const fetchUtilizationData = async () => {
    // Fetch team members
    const { data: teamData } = await supabase
      .from("team_members")
      .select("id, name, email, level, role, avatar_url, availability_percentage")
      .order("level", { ascending: true });

    // Fetch all assignments with project info
    const { data: assignmentsData } = await supabase
      .from("project_team_assignments")
      .select(`
        team_member_id,
        allocation_percentage,
        role_in_project,
        projects!inner(id, name, status)
      `);

    if (teamData) {
      const membersWithUtilization = teamData.map((member) => {
        const memberAssignments = (assignmentsData || [])
          .filter((a) => a.team_member_id === member.id)
          .filter((a) => (a.projects as any)?.status === "active")
          .map((a) => ({
            projectId: (a.projects as any).id,
            projectName: (a.projects as any).name,
            role: a.role_in_project,
            allocation: a.allocation_percentage,
          }));

        const totalAllocated = memberAssignments.reduce((sum, a) => sum + a.allocation, 0);

        return {
          ...member,
          totalAllocated,
          projects: memberAssignments,
        };
      });

      setMembers(membersWithUtilization);
    }
    setLoading(false);
  };

  const getUtilizationStatus = (allocated: number, available: number) => {
    const ratio = allocated / available;
    if (ratio > 1) return { label: "Over-allocated", color: "destructive", icon: AlertTriangle };
    if (ratio >= 0.8) return { label: "Optimal", color: "default", icon: CheckCircle };
    if (ratio >= 0.5) return { label: "Available", color: "secondary", icon: TrendingUp };
    return { label: "Under-utilized", color: "outline", icon: Users };
  };

  const overAllocated = members.filter((m) => m.totalAllocated > m.availability_percentage);
  const optimal = members.filter(
    (m) => m.totalAllocated <= m.availability_percentage && m.totalAllocated >= m.availability_percentage * 0.8
  );
  const underUtilized = members.filter((m) => m.totalAllocated < m.availability_percentage * 0.5);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading utilization data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-destructive/10 border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Over-allocated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{overAllocated.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Optimal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{optimal.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              Under-utilized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-500">{underUtilized.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{members.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Member Utilization List */}
      <div className="space-y-3">
        {members.map((member) => {
          const status = getUtilizationStatus(member.totalAllocated, member.availability_percentage);
          const StatusIcon = status.icon;
          const utilizationPercent = Math.min((member.totalAllocated / member.availability_percentage) * 100, 150);

          return (
            <Card key={member.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback>
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {member.level}
                        </Badge>
                      </div>
                      <Badge variant={status.color as any} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">{member.role}</p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Allocated: {member.totalAllocated}% / {member.availability_percentage}%
                        </span>
                        <span
                          className={
                            member.totalAllocated > member.availability_percentage
                              ? "text-destructive font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {member.totalAllocated > member.availability_percentage
                            ? `+${member.totalAllocated - member.availability_percentage}% over`
                            : `${member.availability_percentage - member.totalAllocated}% free`}
                        </span>
                      </div>
                      <Progress
                        value={utilizationPercent}
                        className={`h-2 ${
                          member.totalAllocated > member.availability_percentage ? "[&>div]:bg-destructive" : ""
                        }`}
                      />
                    </div>

                    {member.projects.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {member.projects.map((project) => (
                          <Badge key={project.projectId} variant="secondary" className="text-xs">
                            {project.projectName} ({project.allocation}%)
                          </Badge>
                        ))}
                      </div>
                    )}

                    {member.projects.length === 0 && (
                      <p className="mt-2 text-xs text-muted-foreground italic">No active project assignments</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
