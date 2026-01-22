import { useState } from "react";
import {
  Briefcase,
  Users,
  TrendingUp,
  Settings2,
  RotateCcw,
  ClipboardCheck,
  Clock,
  AlertTriangle,
  Target,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ProjectCalendar } from "@/components/dashboard/ProjectCalendar";
import { ProjectsChart } from "@/components/dashboard/ProjectsChart";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats, activities, projectProgress, teamSummary, loading: dataLoading } = useDashboardData();
  const {
    hiddenWidgets,
    loading: prefsLoading,
    toggleWidgetVisibility,
    resetToDefault,
  } = useDashboardPreferences();
  const [isEditing, setIsEditing] = useState(false);

  const isWidgetVisible = (id: string) => !hiddenWidgets.includes(id);

  // Display activities or fallback to mock
  const displayActivities =
    activities.length > 0
      ? activities
      : [
          {
            id: "1",
            user_name: "Getting Started",
            action: "Welcome to your dashboard",
            target: "Explore features",
            created_at: new Date().toISOString(),
          },
        ];

  const loading = dataLoading || prefsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            {user ? `Welcome back, ${user.email?.split("@")[0]}` : "Your consulting practice overview"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            {isEditing ? "Done" : "Customize"}
          </Button>
        </div>
      </div>

      {/* Widget visibility toggles when editing */}
      {isEditing && (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Click widgets below to show/hide them on your dashboard:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "active-projects", label: "Active Projects" },
                { id: "team-members", label: "Team Members" },
                { id: "assessments", label: "Assessments" },
                { id: "utilization", label: "Utilization" },
                { id: "projects-chart", label: "Projects Chart" },
                { id: "activity-feed", label: "Activity Feed" },
                { id: "calendar", label: "Calendar" },
                { id: "quick-actions", label: "Quick Actions" },
                { id: "project-progress", label: "Project Progress" },
                { id: "risks-issues", label: "Risks & Issues" },
              ].map((widget) => (
                <Button
                  key={widget.id}
                  variant={isWidgetVisible(widget.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleWidgetVisibility(widget.id)}
                  className="text-xs"
                >
                  {isWidgetVisible(widget.id) ? "✓" : "+"} {widget.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isWidgetVisible("active-projects") && (
          <StatCard
            title="Active Projects"
            value={stats.activeProjects}
            subtitle={`${stats.totalProjects} total projects`}
            icon={Briefcase}
            variant="primary"
          />
        )}
        {isWidgetVisible("team-members") && (
          <StatCard
            title="Team Members"
            value={stats.teamMembers}
            subtitle="Active consultants"
            icon={Users}
          />
        )}
        {isWidgetVisible("assessments") && (
          <StatCard
            title="Active Assessments"
            value={stats.activeAssessments}
            subtitle={`${stats.pendingResponses} pending responses`}
            icon={ClipboardCheck}
          />
        )}
        {isWidgetVisible("utilization") && (
          <StatCard
            title="Avg Utilization"
            value={`${stats.avgUtilization}%`}
            subtitle="Across team"
            icon={TrendingUp}
            variant="accent"
          />
        )}
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {isWidgetVisible("projects-chart") && (
          <div className="lg:col-span-2">
            <ProjectsChart />
          </div>
        )}
        {isWidgetVisible("activity-feed") && (
          <div>
            <ActivityFeed activities={displayActivities} />
          </div>
        )}
      </div>

      {/* Project Progress & Risks/Issues */}
      <div className="grid gap-6 lg:grid-cols-2">
        {isWidgetVisible("project-progress") && projectProgress.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Project Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {projectProgress.slice(0, 5).map((project) => (
                <div key={project.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span
                      className="font-medium cursor-pointer hover:text-primary transition-colors"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      {project.name}
                    </span>
                    <span className="text-muted-foreground">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>
              ))}
              {projectProgress.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No projects yet
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {isWidgetVisible("risks-issues") && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Risks & Issues Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-sm text-muted-foreground">Open Risks</span>
                  </div>
                  <p className="text-2xl font-semibold">{stats.openRisks}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-muted-foreground">Open Issues</span>
                  </div>
                  <p className="text-2xl font-semibold">{stats.openIssues}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-info" />
                    <span className="text-sm text-muted-foreground">Upcoming Milestones</span>
                  </div>
                  <p className="text-2xl font-semibold">{stats.upcomingMilestones}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm text-muted-foreground">Completed Responses</span>
                  </div>
                  <p className="text-2xl font-semibold">{stats.completedResponses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Calendar and Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {isWidgetVisible("calendar") && (
          <div className="lg:col-span-1">
            <ProjectCalendar />
          </div>
        )}
        {isWidgetVisible("quick-actions") && (
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold font-display mb-4">Quick Actions</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => navigate("/projects")}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-left transition-all hover:bg-muted hover:shadow-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">View Projects</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.activeProjects} active engagements
                  </p>
                </div>
              </button>
              <button
                onClick={() => navigate("/assessments")}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-left transition-all hover:bg-muted hover:shadow-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <ClipboardCheck className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium">Assessments</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.pendingResponses} pending responses
                  </p>
                </div>
              </button>
              <button
                onClick={() => navigate("/team")}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-left transition-all hover:bg-muted hover:shadow-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Team</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.teamMembers} consultants
                  </p>
                </div>
              </button>
              <button
                onClick={() => navigate("/runbooks")}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-left transition-all hover:bg-muted hover:shadow-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium">Runbooks</p>
                  <p className="text-sm text-muted-foreground">
                    View engagement templates
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
