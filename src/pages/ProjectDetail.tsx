import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Target,
  TrendingUp,
  Users,
  Presentation,
  LayoutDashboard,
  FileOutput,
  AlertTriangle,
  UserPlus,
  DollarSign,
  Package,
  ClipboardCheck,
  Globe,
  Copy,
  Link2,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { WorkflowTimeline, WorkflowStep } from "@/components/project/WorkflowTimeline";
import { StepDetailPanel, StepDetail } from "@/components/project/StepDetailPanel";
import { MilestoneTimeline, type Milestone } from "@/components/project/MilestoneTimeline";
import { MilestoneForm } from "@/components/project/MilestoneForm";
import { RAIDLog, type Issue } from "@/components/project/RAIDLog";
import { type Risk } from "@/components/project/RiskMatrix";
import { RiskForm } from "@/components/project/RiskForm";
import { IssueForm } from "@/components/project/IssueForm";
import { TeamAssignmentForm } from "@/components/project/TeamAssignmentForm";
import { TeamMemberCard, type TeamMember } from "@/components/team/TeamMemberCard";
import { ProjectBudget } from "@/components/project/ProjectBudget";
import { ProjectMemberManager } from "@/components/project/ProjectMemberManager";
import { DeliverablesList } from "@/components/project/DeliverablesList";
import { DeliverableForm, type Deliverable } from "@/components/project/DeliverableForm";
import { EmbeddedAssessment } from "@/components/project/EmbeddedAssessment";
import { FloatingAIAssistant } from "@/components/project/FloatingAIAssistant";
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
  owner_id: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  order_index: number | null;
  tool_link: string | null;
  description?: string | null;
  notes_json?: any;
  deliverables?: any;
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

interface TeamAssignment {
  id: string;
  team_member_id: string;
  role_in_project: string;
  allocation_percentage: number;
  team_member?: TeamMember;
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
  const [activeStep, setActiveStep] = useState<StepDetail | null>(null);
  const [activeTab, setActiveTab] = useState("workflow");
  
  // Milestones state
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneFormOpen, setMilestoneFormOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  
  // Risks & Issues state
  const [risks, setRisks] = useState<Risk[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [riskFormOpen, setRiskFormOpen] = useState(false);
  const [issueFormOpen, setIssueFormOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  
  // Team state
  const [teamAssignments, setTeamAssignments] = useState<TeamAssignment[]>([]);
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMember[]>([]);
  const [assignmentFormOpen, setAssignmentFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<TeamAssignment | null>(null);
  
  // Deliverables state
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [deliverableFormOpen, setDeliverableFormOpen] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null);

  // Fetch milestones
  const fetchMilestones = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("order_index");
    if (data) {
      setMilestones(data.map(m => ({
        ...m,
        status: m.status as Milestone["status"],
      })));
    }
  }, [projectId]);

  // Fetch risks
  const fetchRisks = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from("project_risks")
      .select("*")
      .eq("project_id", projectId);
    if (data) {
      setRisks(data.map(r => ({
        ...r,
        likelihood: r.likelihood as Risk["likelihood"],
        impact: r.impact as Risk["impact"],
        status: r.status as Risk["status"],
      })));
    }
  }, [projectId]);

  // Fetch issues
  const fetchIssues = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from("project_issues")
      .select("*")
      .eq("project_id", projectId);
    if (data) {
      setIssues(data.map(i => ({
        ...i,
        priority: i.priority as Issue["priority"],
        status: i.status as Issue["status"],
      })));
    }
  }, [projectId]);

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .order("level");
    if (data) {
      setAllTeamMembers(data.map(m => ({
        ...m,
        skills: Array.isArray(m.skills) ? m.skills as { name: string; proficiency?: number }[] : [],
      })));
    }
  }, []);

  // Handle save milestone
  const handleSaveMilestone = async (milestone: Omit<Milestone, "id"> & { id?: string }) => {
    if (milestone.id) {
      await supabase.from("project_milestones").update({
        title: milestone.title,
        description: milestone.description,
        target_date: milestone.target_date,
        status: milestone.status,
        completed_date: milestone.completed_date,
      }).eq("id", milestone.id);
    } else {
      await supabase.from("project_milestones").insert({
        project_id: projectId,
        title: milestone.title,
        description: milestone.description,
        target_date: milestone.target_date,
        status: milestone.status,
        order_index: milestones.length,
      });
    }
    fetchMilestones();
    toast({ title: milestone.id ? "Milestone updated" : "Milestone added" });
  };

  // Handle save risk
  const handleSaveRisk = async (risk: Omit<Risk, "id"> & { id?: string }) => {
    if (risk.id) {
      await supabase.from("project_risks").update({
        title: risk.title,
        description: risk.description,
        category: risk.category,
        likelihood: risk.likelihood,
        impact: risk.impact,
        status: risk.status,
        mitigation_plan: risk.mitigation_plan,
      }).eq("id", risk.id);
    } else {
      await supabase.from("project_risks").insert({
        project_id: projectId,
        title: risk.title,
        description: risk.description,
        category: risk.category,
        likelihood: risk.likelihood,
        impact: risk.impact,
        status: risk.status,
        mitigation_plan: risk.mitigation_plan,
      });
    }
    fetchRisks();
    toast({ title: risk.id ? "Risk updated" : "Risk added" });
  };

  // Handle save issue
  const handleSaveIssue = async (issue: Omit<Issue, "id"> & { id?: string }) => {
    if (issue.id) {
      await supabase.from("project_issues").update({
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        status: issue.status,
        resolution: issue.resolution,
        target_resolution_date: issue.target_resolution_date,
        resolved_date: issue.status === "Resolved" ? new Date().toISOString().split("T")[0] : null,
      }).eq("id", issue.id);
    } else {
      await supabase.from("project_issues").insert({
        project_id: projectId,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        status: issue.status,
        raised_date: new Date().toISOString().split("T")[0],
        target_resolution_date: issue.target_resolution_date,
      });
    }
    fetchIssues();
    toast({ title: issue.id ? "Issue updated" : "Issue added" });
  };

  // Fetch team assignments
  const fetchTeamAssignments = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from("project_team_assignments")
      .select("*, team_members(*)")
      .eq("project_id", projectId);
    if (data) {
      setTeamAssignments(data.map(a => ({
        id: a.id,
        team_member_id: a.team_member_id,
        role_in_project: a.role_in_project,
        allocation_percentage: a.allocation_percentage,
        team_member: a.team_members ? {
          ...a.team_members,
          skills: Array.isArray(a.team_members.skills) ? a.team_members.skills as { name: string; proficiency?: number }[] : [],
        } : undefined,
      })));
    }
  }, [projectId]);

  // Handle save team assignment
  const handleSaveAssignment = async (assignment: { id?: string; team_member_id: string; role_in_project: string; allocation_percentage: number }) => {
    if (assignment.id) {
      await supabase.from("project_team_assignments").update({
        role_in_project: assignment.role_in_project,
        allocation_percentage: assignment.allocation_percentage,
      }).eq("id", assignment.id);
    } else {
      await supabase.from("project_team_assignments").insert({
        project_id: projectId,
        team_member_id: assignment.team_member_id,
        role_in_project: assignment.role_in_project,
        allocation_percentage: assignment.allocation_percentage,
      });
    }
    fetchTeamAssignments();
    toast({ title: assignment.id ? "Assignment updated" : "Team member assigned" });
  };

  // Handle delete team assignment
  const handleDeleteAssignment = async (id: string) => {
    await supabase.from("project_team_assignments").delete().eq("id", id);
    fetchTeamAssignments();
    toast({ title: "Team member removed from project" });
  };

  // Fetch deliverables
  const fetchDeliverables = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from("project_deliverables")
      .select("*")
      .eq("project_id", projectId)
      .order("order_index");
    if (data) {
      setDeliverables(data.map(d => ({
        ...d,
        status: d.status as Deliverable["status"],
      })));
    }
  }, [projectId]);

  // Handle save deliverable
  const handleSaveDeliverable = async (deliverable: Omit<Deliverable, "id" | "project_id" | "order_index"> & { id?: string }) => {
    if (deliverable.id) {
      await supabase.from("project_deliverables").update({
        title: deliverable.title,
        description: deliverable.description,
        status: deliverable.status,
        due_date: deliverable.due_date,
        milestone_id: deliverable.milestone_id,
      }).eq("id", deliverable.id);
    } else {
      await supabase.from("project_deliverables").insert({
        project_id: projectId,
        title: deliverable.title,
        description: deliverable.description,
        status: deliverable.status,
        due_date: deliverable.due_date,
        milestone_id: deliverable.milestone_id,
        order_index: deliverables.length,
      });
    }
    fetchDeliverables();
    toast({ title: deliverable.id ? "Deliverable updated" : "Deliverable added" });
  };

  // Handle delete deliverable
  const handleDeleteDeliverable = async (id: string) => {
    await supabase.from("project_deliverables").delete().eq("id", id);
    fetchDeliverables();
    toast({ title: "Deliverable deleted" });
  };

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;

      try {
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

        const { data: tasksData, error: tasksError } = await supabase
          .from("project_tasks")
          .select("*")
          .eq("project_id", projectId)
          .order("order_index");

        if (tasksError) throw tasksError;
        setTasks(tasksData || []);

        if (projectData.client_id) {
          const { data: clientData } = await supabase
            .from("clients")
            .select("*")
            .eq("id", projectData.client_id)
            .maybeSingle();
          setClient(clientData);
        }

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
    fetchMilestones();
    fetchRisks();
    fetchIssues();
    fetchTeamMembers();
    fetchTeamAssignments();
    fetchDeliverables();
  }, [projectId, navigate, toast, fetchMilestones, fetchRisks, fetchIssues, fetchTeamMembers, fetchTeamAssignments, fetchDeliverables]);

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;

      const updatedTasks = tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      );
      setTasks(updatedTasks);

      // Update active step if it's the one being changed
      if (activeStep?.id === taskId) {
        setActiveStep({ ...activeStep, status: newStatus });
      }

      // Update project progress
      const completedCount = updatedTasks.filter((t) => t.status === "completed").length;
      const progress = updatedTasks.length > 0 
        ? Math.round((completedCount / updatedTasks.length) * 100) 
        : 0;

      await supabase
        .from("projects")
        .update({ progress_percentage: progress })
        .eq("id", projectId);

      setProject((prev) => prev ? { ...prev, progress_percentage: progress } : null);

      toast({ title: "Status updated" });
    } catch (error) {
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  const handleStepClick = (step: WorkflowStep) => {
    // Navigate to full-page step view
    navigate(`/projects/${projectId}/steps/${step.id}`);
  };

  const handleNavigateStep = (direction: "prev" | "next") => {
    if (!activeStep) return;
    const currentIndex = tasks.findIndex(t => t.id === activeStep.id);
    const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < tasks.length) {
      const newStep = tasks[newIndex];
      setActiveStep({
        ...newStep,
        notes_json: newStep.notes_json || [],
        deliverables: newStep.deliverables || [],
      });
    }
  };

  const handleOpenTool = (toolName: string) => {
    // Navigate to tool library with the tool name as a filter
    navigate(`/tools?tool=${encodeURIComponent(toolName)}&projectId=${projectId}${activeStep ? `&stepId=${activeStep.id}` : ''}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  if (!project) return null;

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const pendingTasks = tasks.filter((t) => t.status === "pending").length;
  const totalTasks = tasks.length;

  const taskStatusData = [
    { name: "Completed", value: completedTasks },
    { name: "In Progress", value: inProgressTasks },
    { name: "Pending", value: pendingTasks },
  ].filter((d) => d.value > 0);

  const weeklyProgress = [
    { week: "W1", tasks: 0 },
    { week: "W2", tasks: Math.floor(completedTasks * 0.2) },
    { week: "W3", tasks: Math.floor(completedTasks * 0.5) },
    { week: "W4", tasks: Math.floor(completedTasks * 0.8) },
    { week: "W5", tasks: completedTasks },
  ];

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
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
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

        {/* View Mode Toggle & Outputs */}
        <div className="flex items-center gap-2">
          {client && (
            <ClientPortalButton clientId={project.client_id!} />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/projects/${projectId}/outputs`)}
            className="gap-2"
          >
            <FileOutput className="h-4 w-4" />
            Outputs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/projects/${projectId}/status`)}
            className="gap-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            Status Dashboard
          </Button>
        </div>
      </div>

      {/* Stats Cards - Always visible */}
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

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="workflow" className="gap-2">
            <Presentation className="h-4 w-4" />
            Workflow
          </TabsTrigger>
          <TabsTrigger value="deliverables" className="gap-2">
            <Package className="h-4 w-4" />
            Deliverables
          </TabsTrigger>
          <TabsTrigger value="milestones" className="gap-2">
            <Target className="h-4 w-4" />
            Milestones
          </TabsTrigger>
          <TabsTrigger value="raid" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risks & Issues
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="budget" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Budget
          </TabsTrigger>
          <TabsTrigger value="assessments" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Assessments
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Workflow Tab */}
        <TabsContent value="workflow">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  {runbook ? `Workflow: ${runbook.name}` : "Project Workflow"}
                </CardTitle>
                <Badge variant="secondary">
                  {completedTasks} of {totalTasks} complete
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <WorkflowTimeline
                steps={tasks}
                activeStepId={activeStep?.id || null}
                onStepClick={handleStepClick}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deliverables Tab */}
        <TabsContent value="deliverables">
          <DeliverablesList
            deliverables={deliverables}
            milestones={milestones}
            onAddDeliverable={() => { setEditingDeliverable(null); setDeliverableFormOpen(true); }}
            onEditDeliverable={(d) => { setEditingDeliverable(d); setDeliverableFormOpen(true); }}
          />
        </TabsContent>

        <TabsContent value="milestones">
          <MilestoneTimeline
            milestones={milestones}
            onAddMilestone={() => { setEditingMilestone(null); setMilestoneFormOpen(true); }}
            onEditMilestone={(m) => { setEditingMilestone(m); setMilestoneFormOpen(true); }}
          />
        </TabsContent>

        <TabsContent value="raid">
          <RAIDLog
            risks={risks}
            issues={issues}
            onAddRisk={() => { setEditingRisk(null); setRiskFormOpen(true); }}
            onAddIssue={() => { setEditingIssue(null); setIssueFormOpen(true); }}
            onEditRisk={(r) => { setEditingRisk(r); setRiskFormOpen(true); }}
            onEditIssue={(i) => { setEditingIssue(i); setIssueFormOpen(true); }}
          />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          {/* Project Access / Member Management */}
          <ProjectMemberManager projectId={projectId!} ownerId={project.owner_id} />

          {/* Team Assignments (from Team Library) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-medium">Team Assignments</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Assign consultants from your Team Library to track allocation
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {allTeamMembers.length > 0 && (
                    <Button 
                      size="sm" 
                      onClick={() => { setEditingAssignment(null); setAssignmentFormOpen(true); }}
                      className="gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Assign
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => navigate('/team')} className="gap-2">
                    <Users className="h-4 w-4" />
                    Team Library
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {teamAssignments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamAssignments.map((assignment) => (
                    assignment.team_member && (
                      <div 
                        key={assignment.id} 
                        className="relative group cursor-pointer p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-all hover:shadow-md"
                        onClick={() => { setEditingAssignment(assignment); setAssignmentFormOpen(true); }}
                      >
                        <TeamMemberCard member={assignment.team_member} compact />
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline">{assignment.role_in_project}</Badge>
                          <Badge variant="secondary">{assignment.allocation_percentage}%</Badge>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No team members assigned</p>
                  {allTeamMembers.length > 0 && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => { setEditingAssignment(null); setAssignmentFormOpen(true); }}
                      className="mt-1"
                    >
                      Assign from Team Library
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget">
          <ProjectBudget 
            assignments={teamAssignments}
            projectStartDate={project.start_date}
            projectEndDate={project.end_date}
          />
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments">
          <EmbeddedAssessment projectId={projectId!} />
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
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
        </TabsContent>
      </Tabs>

      {/* Milestone Form */}
      <MilestoneForm
        open={milestoneFormOpen}
        onOpenChange={setMilestoneFormOpen}
        projectId={projectId!}
        milestone={editingMilestone}
        onSave={handleSaveMilestone}
      />

      {/* Risk Form */}
      <RiskForm
        open={riskFormOpen}
        onOpenChange={setRiskFormOpen}
        projectId={projectId!}
        risk={editingRisk}
        onSave={handleSaveRisk}
      />

      {/* Team Assignment Form */}
      <TeamAssignmentForm
        open={assignmentFormOpen}
        onOpenChange={setAssignmentFormOpen}
        assignment={editingAssignment}
        availableMembers={allTeamMembers.filter(m => 
          !teamAssignments.some(a => a.team_member_id === m.id) || 
          editingAssignment?.team_member_id === m.id
        )}
        onSave={handleSaveAssignment}
        onDelete={handleDeleteAssignment}
      />

      {/* Issue Form */}
      <IssueForm
        open={issueFormOpen}
        onOpenChange={setIssueFormOpen}
        projectId={projectId!}
        issue={editingIssue}
        onSave={handleSaveIssue}
      />

      {/* Deliverable Form */}
      <DeliverableForm
        open={deliverableFormOpen}
        onOpenChange={setDeliverableFormOpen}
        deliverable={editingDeliverable}
        milestones={milestones}
        onSave={handleSaveDeliverable}
        onDelete={handleDeleteDeliverable}
      />

      {/* Step Detail Panel (Slide-in) */}
      {activeStep && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setActiveStep(null)}
          />
          <StepDetailPanel
            step={activeStep}
            projectId={projectId!}
            projectName={project.name}
            clientName={client?.name}
            totalSteps={tasks.length}
            currentIndex={tasks.findIndex(t => t.id === activeStep.id)}
            onClose={() => setActiveStep(null)}
            onNavigate={handleNavigateStep}
            onStatusChange={updateTaskStatus}
            onOpenTool={handleOpenTool}
          />
        </>
      )}

      {/* Floating AI Assistant */}
      {project && (
        <FloatingAIAssistant
          projectId={projectId!}
          projectName={project.name}
          clientName={client?.name}
          currentStepId={activeStep?.id}
          currentStepTitle={activeStep?.title}
          allSteps={tasks.map(t => ({ 
            id: t.id, 
            title: t.title, 
            status: t.status, 
            order_index: t.order_index,
            description: t.description,
            deliverables: t.deliverables,
            notes_json: t.notes_json
          }))}
        />
      )}
    </div>
  );
}
