import { useState, useMemo, useCallback } from "react";
import GridLayout, { LayoutItem } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
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
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ProjectCalendar } from "@/components/dashboard/ProjectCalendar";
import { ProjectsChart } from "@/components/dashboard/ProjectsChart";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardPreferences, WidgetLayout } from "@/hooks/useDashboardPreferences";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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

  // Fetch user profile for display name
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

  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0];

  // Convert our layout format to react-grid-layout format
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
        const updated = newLayout.find((l) => l.i === item.id);
        if (updated) {
          return {
            id: item.id,
            x: updated.x,
            y: updated.y,
            w: updated.w,
            h: updated.h,
          };
        }
        return item;
      });
      updateLayout(updatedLayout);
    },
    [isEditing, layout, updateLayout]
  );

  // Measure container width
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });
      resizeObserver.observe(node);
    }
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => navigate("/projects")}
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-left transition-all hover:bg-muted hover:shadow-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">View Projects</p>
                <p className="text-sm text-muted-foreground truncate">
                  {stats.activeProjects} active engagements
                </p>
              </div>
            </button>
            <button
              onClick={() => navigate("/assessments")}
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-left transition-all hover:bg-muted hover:shadow-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                <ClipboardCheck className="h-5 w-5 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">Assessments</p>
                <p className="text-sm text-muted-foreground truncate">
                  {stats.pendingResponses} pending responses
                </p>
              </div>
            </button>
            <button
              onClick={() => navigate("/team")}
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-left transition-all hover:bg-muted hover:shadow-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">Team</p>
                <p className="text-sm text-muted-foreground truncate">
                  {stats.teamMembers} consultants
                </p>
              </div>
            </button>
            <button
              onClick={() => navigate("/runbooks")}
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-left transition-all hover:bg-muted hover:shadow-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">Runbooks</p>
                <p className="text-sm text-muted-foreground truncate">
                  View engagement templates
                </p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    ),
    "project-progress": (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Project Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto space-y-4">
          {projectProgress.slice(0, 5).map((project) => (
            <div key={project.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span
                  className="font-medium cursor-pointer hover:text-primary transition-colors truncate mr-2"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {project.name}
                </span>
                <span className="text-muted-foreground shrink-0">{project.progress}%</span>
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
    ),
    "risks-issues": (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Risks & Issues Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
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
                <span className="text-sm text-muted-foreground">Milestones</span>
              </div>
              <p className="text-2xl font-semibold">{stats.upcomingMilestones}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            {user ? `Welcome back, ${displayName}` : "Your consulting practice overview"}
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
              <GripVertical className="inline h-4 w-4 mr-1" />
              Drag widgets to rearrange. Click toggles to show/hide:
            </p>
            <div className="flex flex-wrap gap-2">
              {allWidgets.map((widget) => (
                <Button
                  key={widget.id}
                  variant={!hiddenWidgets.includes(widget.id) ? "default" : "outline"}
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

      {/* Grid Layout */}
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
              className={`relative ${isEditing ? "ring-2 ring-primary/20 ring-offset-2 rounded-lg" : ""}`}
            >
              {isEditing && (
                <div className="drag-handle absolute top-2 right-2 z-10 p-1 rounded bg-muted/80 cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="h-full w-full overflow-hidden">
                {widgetContent[item.i]}
              </div>
            </div>
          ))}
        </GridLayout>
      </div>
    </div>
  );
}
