import { useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import GridLayout, { LayoutItem } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  GaugeCircle,
  GripVertical,
  AlertTriangle,
  RotateCcw,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ProjectCalendar } from "@/components/dashboard/ProjectCalendar";
import { ProjectsChart } from "@/components/dashboard/ProjectsChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardPreferences, WidgetLayout } from "@/hooks/useDashboardPreferences";
import { supabase } from "@/integrations/supabase/client";

const GRID_COLS = 4;
const ROW_HEIGHT = 120;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats, activities, projectProgress, loading: dataLoading } = useDashboardData();
  const {
    layout,
    hiddenWidgets,
    loading: prefsLoading,
    updateLayout,
    toggleWidgetVisibility,
    resetToDefault,
  } = useDashboardPreferences();
  const [isEditing, setIsEditing] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const displayName =
    profile?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0];

  const gridLayout: LayoutItem[] = useMemo(() => {
    return layout
      .filter((item) => !hiddenWidgets.includes(item.id))
      .map((item) => ({
        i: item.id,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: 1,
        minH: 1,
        maxW: 4,
        static: !isEditing,
      }));
  }, [layout, hiddenWidgets, isEditing]);

  const handleLayoutChange = useCallback(
    (newLayout: readonly LayoutItem[]) => {
      if (!isEditing) return;

      const updatedLayout: WidgetLayout[] = layout.map((item) => {
        const updated = newLayout.find((entry) => entry.i === item.id);
        if (!updated) return item;

        return {
          id: item.id,
          x: updated.x,
          y: updated.y,
          w: updated.w,
          h: updated.h,
        };
      });

      updateLayout(updatedLayout);
    },
    [isEditing, layout, updateLayout],
  );

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(node);
  }, []);

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
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const widgetContent: Record<string, React.ReactNode> = {
    "active-projects": (
      <StatCard
        title="Active Projects"
        value={stats.activeProjects}
        subtitle={`${stats.totalProjects} total projects`}
        icon={Briefcase}
        variant="primary"
      />
    ),
    "team-members": (
      <StatCard
        title="Team Members"
        value={stats.teamMembers}
        subtitle="Active consultants"
        icon={Users}
      />
    ),
    assessments: (
      <StatCard
        title="Active Assessments"
        value={stats.activeAssessments}
        subtitle={`${stats.pendingResponses} pending responses`}
        icon={ClipboardCheck}
      />
    ),
    utilization: (
      <StatCard
        title="Avg Utilization"
        value={`${stats.avgUtilization}%`}
        subtitle="Across team"
        icon={TrendingUp}
        variant="accent"
      />
    ),
    "projects-chart": <ProjectsChart />,
    "activity-feed": <ActivityFeed activities={displayActivities} />,
    calendar: <ProjectCalendar />,
    "quick-actions": (
      <Card className="enterprise-card h-full rounded-[1.75rem] border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-primary">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => navigate("/projects")}
              className="flex items-center gap-3 rounded-[1.25rem] border border-border bg-white/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">View Projects</p>
                <p className="truncate text-sm text-muted-foreground">
                  {stats.activeProjects} active engagements
                </p>
              </div>
            </button>
            <button
              onClick={() => navigate("/assessments")}
              className="flex items-center gap-3 rounded-[1.25rem] border border-border bg-white/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/20">
                <ClipboardCheck className="h-5 w-5 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">Assessments</p>
                <p className="truncate text-sm text-muted-foreground">
                  {stats.pendingResponses} pending responses
                </p>
              </div>
            </button>
            <button
              onClick={() => navigate("/team")}
              className="flex items-center gap-3 rounded-[1.25rem] border border-border bg-white/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">Team</p>
                <p className="truncate text-sm text-muted-foreground">
                  {stats.teamMembers} consultants
                </p>
              </div>
            </button>
            <button
              onClick={() => navigate("/runbooks")}
              className="flex items-center gap-3 rounded-[1.25rem] border border-border bg-white/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/20">
                <TrendingUp className="h-5 w-5 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">Runbooks</p>
                <p className="truncate text-sm text-muted-foreground">View engagement templates</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    ),
    "project-progress": (
      <Card className="enterprise-card h-full rounded-[1.75rem] border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-primary">
            <Target className="h-4 w-4 text-primary" />
            Project Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-4 overflow-auto">
          {projectProgress.slice(0, 5).map((project) => (
            <div key={project.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span
                  className="mr-2 cursor-pointer truncate font-medium transition-colors hover:text-primary"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {project.name}
                </span>
                <span className="shrink-0 text-muted-foreground">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-2" />
            </div>
          ))}
          {projectProgress.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No projects yet</p>
          )}
        </CardContent>
      </Card>
    ),
    "risks-issues": (
      <Card className="enterprise-card h-full rounded-[1.75rem] border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-primary">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Risks & Issues Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[1.25rem] bg-primary/5 p-4">
              <div className="mb-1 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm text-muted-foreground">Open Risks</span>
              </div>
              <p className="text-2xl font-semibold">{stats.openRisks}</p>
            </div>
            <div className="rounded-[1.25rem] bg-primary/5 p-4">
              <div className="mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4 text-destructive" />
                <span className="text-sm text-muted-foreground">Open Issues</span>
              </div>
              <p className="text-2xl font-semibold">{stats.openIssues}</p>
            </div>
            <div className="rounded-[1.25rem] bg-primary/5 p-4">
              <div className="mb-1 flex items-center gap-2">
                <Target className="h-4 w-4 text-info" />
                <span className="text-sm text-muted-foreground">Milestones</span>
              </div>
              <p className="text-2xl font-semibold">{stats.upcomingMilestones}</p>
            </div>
            <div className="rounded-[1.25rem] bg-primary/5 p-4">
              <div className="mb-1 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground">Responses</span>
              </div>
              <p className="text-2xl font-semibold">{stats.completedResponses}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    ),
  };

  const allWidgets = [
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
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="navy-panel relative overflow-hidden rounded-[2rem] px-6 py-8 text-white shadow-[0_30px_80px_-45px_rgba(7,15,38,0.85)] sm:px-8">
        <div className="hero-grid absolute inset-0 opacity-30" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
              <Sparkles className="h-3.5 w-3.5" />
              Consulting intelligence platform
            </div>
            <div>
              <h1 className="font-display text-4xl text-white sm:text-5xl">
                Delivery clarity for transformation teams
              </h1>
              <p className="mt-3 max-w-2xl text-base text-white/72 sm:text-lg">
                {user
                  ? `Welcome back, ${displayName}. We bring projects, assessments, and client-ready insight assets into one operating view.`
                  : "We bring projects, assessments, and client-ready insight assets into one operating view."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-3xl text-primary">Practice dashboard</h2>
          <p className="mt-1 text-muted-foreground">
            Monitor delivery health, team capacity, and active intelligence workstreams.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
          <Button
            variant={isEditing ? "secondary" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            {isEditing ? "Done" : "Customize"}
          </Button>
        </div>
      </div>

      {isEditing && (
        <Card className="enterprise-card border-dashed">
          <CardContent className="py-4">
            <p className="mb-3 text-sm text-muted-foreground">
              <GripVertical className="mr-1 inline h-4 w-4" />
              Drag widgets to rearrange. Click toggles to show or hide:
            </p>
            <div className="flex flex-wrap gap-2">
              {allWidgets.map((widget) => (
                <Button
                  key={widget.id}
                  variant={!hiddenWidgets.includes(widget.id) ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggleWidgetVisibility(widget.id)}
                  className="text-xs"
                >
                  {!hiddenWidgets.includes(widget.id) ? "✓" : "+"} {widget.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div ref={containerRef} className="relative">
        <GridLayout
          className="layout"
          layout={gridLayout}
          width={containerWidth}
          gridConfig={{
            cols: GRID_COLS,
            rowHeight: ROW_HEIGHT,
            margin: [16, 16] as const,
            containerPadding: [0, 0] as const,
            maxRows: Infinity,
          }}
          dragConfig={{
            enabled: isEditing,
            handle: ".drag-handle",
          }}
          resizeConfig={{
            enabled: isEditing,
            handles: ["se"],
          }}
          onLayoutChange={handleLayoutChange}
        >
          {gridLayout.map((item) => (
            <div
              key={item.i}
              className={`relative ${isEditing ? "rounded-lg ring-2 ring-primary/20 ring-offset-2" : ""}`}
            >
              {isEditing && (
                <div className="drag-handle absolute right-2 top-2 z-10 cursor-grab rounded bg-muted/80 p-1 active:cursor-grabbing">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="h-full w-full overflow-hidden">{widgetContent[item.i]}</div>
            </div>
          ))}
        </GridLayout>
      </div>
    </div>
  );
}
