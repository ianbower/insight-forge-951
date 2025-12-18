import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  MoreHorizontal,
  PlayCircle,
  Target,
  TrendingUp,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface Project {
  id: string;
  name: string;
  status: string;
  progress_percentage: number | null;
  start_date: string | null;
  end_date: string | null;
  client_id: string | null;
  runbook_id: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  order_index: number | null;
  tool_link: string | null;
}

interface Client {
  id: string;
  name: string;
  industry: string | null;
}

interface Runbook {
  id: string;
  name: string;
  workflow_json: any;
}

const COLORS = ["hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--muted))"];

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [runbook, setRunbook] = useState<Runbook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;

      try {
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .maybeSingle();

        if (projectError) throw projectError;
        if (!projectData) {
          toast({ title: "Project not found", variant: "destructive" });
          navigate("/projects");
          return;
        }

        setProject(projectData);

        // Fetch tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from("project_tasks")
          .select("*")
          .eq("project_id", projectId)
          .order("order_index");

        if (tasksError) throw tasksError;
        setTasks(tasksData || []);

        // Fetch client if exists
        if (projectData.client_id) {
          const { data: clientData } = await supabase
            .from("clients")
            .select("*")
            .eq("id", projectData.client_id)
            .maybeSingle();
          setClient(clientData);
        }

        // Fetch runbook if exists
        if (projectData.runbook_id) {
          const { data: runbookData } = await supabase
            .from("runbook_templates")
            .select("*")
            .eq("id", projectData.runbook_id)
            .maybeSingle();
          setRunbook(runbookData);
        }
      } catch (error) {
        console.error("Error fetching project:", error);
        toast({ title: "Error loading project", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId, navigate, toast]);

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );

      // Update project progress
      const updatedTasks = tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      );
      const completedCount = updatedTasks.filter((t) => t.status === "completed").length;
      const progress = Math.round((completedCount / updatedTasks.length) * 100);

      await supabase
        .from("projects")
        .update({ progress_percentage: progress })
        .eq("id", projectId);

      setProject((prev) => prev ? { ...prev, progress_percentage: progress } : null);

      toast({ title: "Task updated" });
    } catch (error) {
      toast({ title: "Error updating task", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  if (!project) return null;

  // Calculate stats
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const pendingTasks = tasks.filter((t) => t.status === "pending").length;
  const totalTasks = tasks.length;

  const taskStatusData = [
    { name: "Completed", value: completedTasks },
    { name: "In Progress", value: inProgressTasks },
    { name: "Pending", value: pendingTasks },
  ].filter((d) => d.value > 0);

  // Mock weekly progress data
  const weeklyProgress = [
    { week: "W1", tasks: 0 },
    { week: "W2", tasks: Math.floor(completedTasks * 0.2) },
    { week: "W3", tasks: Math.floor(completedTasks * 0.5) },
    { week: "W4", tasks: Math.floor(completedTasks * 0.8) },
    { week: "W5", tasks: completedTasks },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "in_progress":
        return <PlayCircle className="h-5 w-5 text-warning" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-success/10 text-success border-success/20";
      case "Proposed":
        return "bg-warning/10 text-warning border-warning/20";
      case "Complete":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-semibold">{project.name}</h1>
            <Badge variant="outline" className={cn(getStatusColor(project.status))}>
              {project.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            {client && (
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {client.name}
              </span>
            )}
            {project.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(project.start_date).toLocaleDateString()}
                {project.end_date && ` - ${new Date(project.end_date).toLocaleDateString()}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{project.progress_percentage || 0}%</p>
                <p className="text-xs text-muted-foreground">Overall Progress</p>
              </div>
            </div>
            <Progress value={project.progress_percentage || 0} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedTasks}/{totalTasks}</p>
                <p className="text-xs text-muted-foreground">Tasks Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressTasks}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                <TrendingUp className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingTasks}</p>
                <p className="text-xs text-muted-foreground">Pending Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Task Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Task Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {taskStatusData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {taskStatusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No tasks yet
              </div>
            )}
            <div className="flex justify-center gap-6 mt-4">
              {taskStatusData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Progress Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Progress Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyProgress}>
                  <defs>
                    <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
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
                    dataKey="tasks"
                    stroke="hsl(var(--primary))"
                    fill="url(#progressGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow & Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              {runbook ? `Runbook: ${runbook.name}` : "Project Tasks"}
            </CardTitle>
            <Badge variant="secondary">
              {completedTasks} of {totalTasks} complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-4 rounded-lg border border-border p-4 transition-all",
                    task.status === "completed" && "bg-success/5 border-success/20",
                    task.status === "in_progress" && "bg-warning/5 border-warning/20"
                  )}
                >
                  {/* Step Number */}
                  <div
                    className={cn(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      task.status === "completed"
                        ? "bg-success text-success-foreground"
                        : task.status === "in_progress"
                        ? "bg-warning text-warning-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {task.order_index || index + 1}
                  </div>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{task.title}</p>
                    {task.tool_link && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {task.tool_link.split(", ").map((tool) => (
                          <Badge key={tool} variant="outline" className="text-xs">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status Icon */}
                  {getStatusIcon(task.status)}

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => updateTaskStatus(task.id, "pending")}>
                        Mark as Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateTaskStatus(task.id, "in_progress")}>
                        Mark as In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateTaskStatus(task.id, "completed")}>
                        Mark as Completed
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No tasks defined for this project</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start an engagement from a runbook to populate tasks
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
