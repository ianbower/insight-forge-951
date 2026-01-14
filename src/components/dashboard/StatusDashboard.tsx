import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { MetricCounter } from "./MetricCounter";
import { RiskMatrix, type Risk } from "@/components/project/RiskMatrix";
import { MilestoneTimeline, type Milestone } from "@/components/project/MilestoneTimeline";
import { TeamMemberCard, type TeamMember } from "@/components/team/TeamMemberCard";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  Target,
  Activity,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

interface StatusDashboardProps {
  project: {
    id: string;
    name: string;
    status: string;
    start_date?: string;
    end_date?: string;
    progress?: number;
  };
  tasks: { id: string; status: string }[];
  milestones: Milestone[];
  risks: Risk[];
  issues: { id: string; status: string; priority: string }[];
  teamMembers: TeamMember[];
  onMilestoneClick?: (milestone: Milestone) => void;
  onRiskClick?: (risk: Risk) => void;
}

const ragColors = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export function StatusDashboard({
  project,
  tasks,
  milestones,
  risks,
  issues,
  teamMembers,
  onMilestoneClick,
  onRiskClick,
}: StatusDashboardProps) {
  // Calculate metrics
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const overallProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  
  const openRisks = risks.filter((r) => r.status !== "Closed").length;
  const highRisks = risks.filter((r) => r.status !== "Closed" && (r.likelihood === "High" || r.impact === "High")).length;
  
  const openIssues = issues.filter((i) => i.status !== "Resolved").length;
  const criticalIssues = issues.filter((i) => i.status !== "Resolved" && i.priority === "Critical").length;
  
  const completedMilestones = milestones.filter((m) => m.status === "completed").length;
  const atRiskMilestones = milestones.filter((m) => m.status === "at_risk").length;

  // Determine RAG status
  const getRAGStatus = () => {
    if (criticalIssues > 0 || atRiskMilestones > 2 || highRisks > 3) return "red";
    if (openIssues > 3 || atRiskMilestones > 0 || highRisks > 1) return "amber";
    return "green";
  };

  const ragStatus = getRAGStatus();

  // Chart data
  const taskDistribution = [
    { name: "Completed", value: completedTasks, color: "hsl(var(--chart-2))" },
    { name: "In Progress", value: inProgressTasks, color: "hsl(var(--chart-1))" },
    { name: "Pending", value: tasks.length - completedTasks - inProgressTasks, color: "hsl(var(--muted))" },
  ];

  // Mock progress data
  const progressData = [
    { week: "W1", actual: 5, planned: 10 },
    { week: "W2", actual: 15, planned: 20 },
    { week: "W3", actual: 30, planned: 30 },
    { week: "W4", actual: 45, planned: 40 },
    { week: "W5", actual: 55, planned: 50 },
    { week: "W6", actual: overallProgress, planned: 60 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header with RAG Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">Project Status Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("h-4 w-4 rounded-full animate-pulse", ragColors[ragStatus])} />
          <Badge variant="outline" className="text-sm capitalize">
            {ragStatus === "green" ? "On Track" : ragStatus === "amber" ? "At Risk" : "Critical"}
          </Badge>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <MetricCounter value={overallProgress} suffix="%" className="text-2xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasks Done</p>
                <MetricCounter value={completedTasks} className="text-2xl" />
                <span className="text-sm text-muted-foreground">/{tasks.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Risks</p>
                <MetricCounter value={openRisks} className="text-2xl" />
                {highRisks > 0 && (
                  <span className="text-xs text-red-400 ml-1">({highRisks} high)</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Issues</p>
                <MetricCounter value={openIssues} className="text-2xl" />
                {criticalIssues > 0 && (
                  <span className="text-xs text-red-400 ml-1">({criticalIssues} critical)</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress & Tasks Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Chart */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={progressData}>
                    <defs>
                      <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="planned"
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="5 5"
                      fill="none"
                    />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#actualGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Milestones
                <Badge variant="outline" className="ml-2">
                  {completedMilestones}/{milestones.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MilestoneTimeline
                milestones={milestones}
                onEditMilestone={onMilestoneClick}
                compact
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Task Distribution */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Task Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {taskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-2xl font-bold">{overallProgress}%</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {taskDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-sm">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risk Matrix */}
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <RiskMatrix risks={risks} onRiskClick={onRiskClick} />
            </CardContent>
          </Card>

          {/* Team */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Project Team
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {teamMembers.slice(0, 4).map((member) => (
                <TeamMemberCard key={member.id} member={member} compact />
              ))}
              {teamMembers.length > 4 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  +{teamMembers.length - 4} more team members
                </p>
              )}
              {teamMembers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No team members assigned
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
