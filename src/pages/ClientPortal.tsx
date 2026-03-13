import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Briefcase, Target, CheckCircle2, Clock, FileText, Building2, AlertTriangle,
  Star, Send, BarChart3, Calendar, Shield, Activity, DollarSign, Users, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isPast } from "date-fns";
import { toast } from "sonner";

interface PortalSettings {
  showNttLogo: boolean;
  showAxetLogo: boolean;
  showClientLogo: boolean;
  nttLogoUrl?: string;
  clientLogoUrl?: string;
  sections: {
    milestones: boolean;
    deliverables: boolean;
    assessments: boolean;
    assessmentDetails: boolean;
    budget: boolean;
    ragStatus: boolean;
    progress: boolean;
    feedback: boolean;
    projectDetails: boolean;
    teams: boolean;
    risks: boolean;
  };
}

const DEFAULT_SETTINGS: PortalSettings = {
  showNttLogo: true,
  showAxetLogo: true,
  showClientLogo: true,
  sections: {
    milestones: true, deliverables: true, assessments: true, assessmentDetails: false,
    budget: false, ragStatus: true, progress: true, feedback: true,
    projectDetails: true, teams: false, risks: false,
  },
};

interface PortalMilestone { id: string; title: string; status: string; target_date: string; description: string | null }
interface PortalDeliverable { id: string; title: string; status: string; due_date: string | null; description: string | null }
interface PortalAssessment { id: string; name: string; status: string; description: string | null; response_count?: number; question_count?: number }
interface PortalTeamMember { id: string; name: string; role: string; role_in_project: string; avatar_url: string | null }
interface PortalRisk { id: string; title: string; status: string; likelihood: string; impact: string; category: string }
interface PortalIssue { id: string; title: string; status: string; priority: string; raised_date: string }

interface PortalProject {
  id: string; name: string; status: string; description: string | null; progress_percentage: number | null;
  start_date: string | null; end_date: string | null; budget_amount: number | null; currency: string | null;
  milestones: PortalMilestone[];
  deliverables: PortalDeliverable[];
  documents: Array<{ name: string; id: string; created_at: string; metadata: any }>;
  assessments: PortalAssessment[];
  team: PortalTeamMember[];
  risks: PortalRisk[];
  issues: PortalIssue[];
}

interface PortalData {
  client: { name: string; industry: string | null; logo_url: string | null };
  projects: PortalProject[];
  tokenId?: string; clientId?: string;
  settings: PortalSettings;
}

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;
    const fetchPortalData = async () => {
      try {
        const { data: tokenData, error: tokenError } = await supabase.from("client_portal_tokens").select("id, client_id, is_active, expires_at, created_by, settings").eq("token", token).eq("is_active", true).single();
        if (tokenError || !tokenData) { setError("Invalid or expired portal link."); setLoading(false); return; }
        if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) { setError("This portal link has expired."); setLoading(false); return; }

        const portalSettings: PortalSettings = tokenData.settings && typeof tokenData.settings === 'object'
          ? { ...DEFAULT_SETTINGS, ...(tokenData.settings as any), sections: { ...DEFAULT_SETTINGS.sections, ...((tokenData.settings as any)?.sections || {}) } }
          : DEFAULT_SETTINGS;

        const { data: client } = await supabase.from("clients").select("name, industry, logo_url").eq("id", tokenData.client_id).single();
        if (!client) { setError("Client not found."); setLoading(false); return; }

        const { data: projects } = await supabase.from("projects").select("id, name, status, description, progress_percentage, start_date, end_date, budget_amount, currency").eq("client_id", tokenData.client_id).neq("status", "Cancelled").order("created_at", { ascending: false });
        const projectIds = (projects || []).map(p => p.id);

        let milestones: any[] = [], deliverables: any[] = [], assessmentInstances: any[] = [];
        let teamAssignments: any[] = [], risks: any[] = [], issues: any[] = [];
        let assessmentQuestionCounts: Record<string, number> = {};
        let assessmentResponseCounts: Record<string, number> = {};

        if (projectIds.length > 0) {
          const promises: Promise<any>[] = [
            supabase.from("project_milestones").select("id, title, status, target_date, description, project_id").in("project_id", projectIds).order("target_date"),
            supabase.from("project_deliverables").select("id, title, status, due_date, description, project_id").in("project_id", projectIds).order("order_index"),
            supabase.from("assessment_instances").select("id, name, status, description, project_id, assessment_template_id").in("project_id", projectIds).neq("status", "draft"),
          ];

          if (portalSettings.sections.teams) {
            promises.push(
              supabase.from("project_team_assignments").select("id, project_id, role_in_project, team_member_id, team_members(id, name, role, avatar_url)").in("project_id", projectIds).eq("assignment_status", "active")
            );
          } else {
            promises.push(Promise.resolve({ data: [] }));
          }

          if (portalSettings.sections.risks) {
            promises.push(
              supabase.from("project_risks").select("id, title, status, likelihood, impact, category, project_id").in("project_id", projectIds),
              supabase.from("project_issues").select("id, title, status, priority, raised_date, project_id").in("project_id", projectIds)
            );
          } else {
            promises.push(Promise.resolve({ data: [] }), Promise.resolve({ data: [] }));
          }

          const [milestonesRes, deliverablesRes, assessmentsRes, teamRes, risksRes, issuesRes] = await Promise.all(promises);
          milestones = milestonesRes.data || [];
          deliverables = deliverablesRes.data || [];
          assessmentInstances = assessmentsRes.data || [];
          teamAssignments = teamRes.data || [];
          risks = risksRes.data || [];
          issues = issuesRes.data || [];

          // Fetch assessment details if enabled
          if (portalSettings.sections.assessmentDetails && assessmentInstances.length > 0) {
            const instanceIds = assessmentInstances.map((a: any) => a.id);
            const templateIds = [...new Set(assessmentInstances.map((a: any) => a.assessment_template_id))];

            const [questionsRes, responsesRes] = await Promise.all([
              supabase.from("assessment_questions").select("id, assessment_template_id").in("assessment_template_id", templateIds),
              supabase.from("assessment_responses").select("id, assessment_instance_id").in("assessment_instance_id", instanceIds),
            ]);

            const questions = questionsRes.data || [];
            const responses = responsesRes.data || [];

            // Map template question counts to instances
            const templateQCounts: Record<string, number> = {};
            questions.forEach((q: any) => {
              templateQCounts[q.assessment_template_id] = (templateQCounts[q.assessment_template_id] || 0) + 1;
            });
            assessmentInstances.forEach((a: any) => {
              assessmentQuestionCounts[a.id] = templateQCounts[a.assessment_template_id] || 0;
            });

            responses.forEach((r: any) => {
              assessmentResponseCounts[r.assessment_instance_id] = (assessmentResponseCounts[r.assessment_instance_id] || 0) + 1;
            });
          }
        }

        setData({
          client,
          projects: (projects || []).map(p => ({
            ...p,
            milestones: milestones.filter((m: any) => m.project_id === p.id),
            deliverables: deliverables.filter((d: any) => d.project_id === p.id),
            documents: [],
            assessments: assessmentInstances
              .filter((a: any) => a.project_id === p.id)
              .map((a: any) => ({
                id: a.id, name: a.name, status: a.status, description: a.description,
                question_count: assessmentQuestionCounts[a.id] || 0,
                response_count: assessmentResponseCounts[a.id] || 0,
              })),
            team: teamAssignments
              .filter((t: any) => t.project_id === p.id)
              .map((t: any) => ({
                id: t.team_member_id,
                name: t.team_members?.name || "Unknown",
                role: t.team_members?.role || "",
                role_in_project: t.role_in_project,
                avatar_url: t.team_members?.avatar_url || null,
              })),
            risks: risks.filter((r: any) => r.project_id === p.id),
            issues: issues.filter((i: any) => i.project_id === p.id),
          })),
          tokenId: tokenData.id, clientId: tokenData.client_id,
          settings: portalSettings,
        });
        if (projects && projects.length > 0) setActiveProject(projects[0].id);
      } catch { setError("Something went wrong loading the portal."); } finally { setLoading(false); }
    };
    fetchPortalData();
  }, [token]);

  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /><p className="text-sm text-muted-foreground animate-pulse">Loading your portal…</p></div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center bg-background p-4"><Card className="max-w-md w-full"><CardContent className="p-8 text-center"><Shield className="h-12 w-12 mx-auto text-destructive/60 mb-4" /><h2 className="text-xl font-semibold mb-2">Portal Unavailable</h2><p className="text-muted-foreground">{error || "Unable to load portal data."}</p></CardContent></Card></div>;

  const s = data.settings.sections;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active": case "in_progress": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "complete": case "completed": case "delivered": case "approved": return "bg-primary/10 text-primary border-primary/20";
      case "upcoming": case "planning": case "proposed": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "pending": case "on hold": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "overdue": case "at risk": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getRAGStatus = (project: PortalProject) => {
    const overdueMilestones = project.milestones.filter(m => m.status !== "completed" && isPast(new Date(m.target_date)));
    const overdueDeliverables = project.deliverables.filter(d => d.due_date && d.status !== "delivered" && d.status !== "approved" && isPast(new Date(d.due_date)));
    if (overdueMilestones.length >= 2 || overdueDeliverables.length >= 3) return { status: "Red", color: "bg-destructive text-destructive-foreground" };
    if (overdueMilestones.length >= 1 || overdueDeliverables.length >= 1) return { status: "Amber", color: "bg-amber-500 text-white" };
    return { status: "Green", color: "bg-emerald-500 text-white" };
  };

  const getLikelihoodImpactColor = (value: string) => {
    switch (value?.toLowerCase()) {
      case "high": return "text-destructive";
      case "medium": return "text-amber-500";
      case "low": return "text-emerald-500";
      default: return "text-muted-foreground";
    }
  };

  const activeCount = data.projects.filter(p => p.status === "Active").length;
  const totalMilestones = data.projects.reduce((acc, p) => acc + p.milestones.length, 0);
  const completedMilestones = data.projects.reduce((acc, p) => acc + p.milestones.filter(m => m.status === "completed").length, 0);
  const totalDeliverables = data.projects.reduce((acc, p) => acc + p.deliverables.length, 0);
  const completedDeliverables = data.projects.reduce((acc, p) => acc + p.deliverables.filter(d => d.status === "delivered" || d.status === "approved").length, 0);
  const selectedProject = data.projects.find(p => p.id === activeProject);
  const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const deliverableProgress = totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0;

  const nttLogoSrc = data.settings.nttLogoUrl || "/ntt-data-logo.png";
  const clientLogoSrc = data.settings.clientLogoUrl || data.client.logo_url;

  const submitFeedback = async () => {
    if (feedbackRating === 0) { toast.error("Please select a rating"); return; }
    setFeedbackSubmitting(true);
    try {
      const { error } = await supabase.from("client_feedback").insert({ client_id: data.clientId!, portal_token_id: data.tokenId!, rating: feedbackRating, comment: feedbackComment || null, category: "general" });
      if (error) throw error;
      setFeedbackSubmitted(true); toast.success("Thank you for your feedback!");
    } catch { toast.error("Failed to submit feedback"); } finally { setFeedbackSubmitting(false); }
  };

  // Build visible tabs dynamically
  const visibleTabs: { value: string; label: string }[] = [{ value: "overview", label: "Overview" }];
  if (s.projectDetails) visibleTabs.push({ value: "details", label: "Project Details" });
  if (s.milestones) visibleTabs.push({ value: "milestones", label: "Milestones" });
  if (s.deliverables) visibleTabs.push({ value: "deliverables", label: "Deliverables" });
  if (s.assessments) visibleTabs.push({ value: "assessments", label: "Assessments" });
  if (s.teams) visibleTabs.push({ value: "team", label: "Team" });
  if (s.risks) visibleTabs.push({ value: "risks", label: "Risks & Issues" });
  if (s.budget) visibleTabs.push({ value: "budget", label: "Budget" });
  if (s.feedback) visibleTabs.push({ value: "feedback", label: "Feedback" });

  return (
    <div className="min-h-screen bg-background">
      {/* Header with configurable logos */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {data.settings.showNttLogo && (
              <img alt="NTT DATA" className="h-7 object-contain" src={nttLogoSrc} />
            )}
            {data.settings.showAxetLogo && (
              <img alt="aXet consult" className="h-7 object-contain" src="/lovable-uploads/3719f63a-7253-4d1d-9213-327c9940cd39.png" />
            )}
            {(data.settings.showNttLogo || data.settings.showAxetLogo) && (
              <div className="h-6 w-px bg-border" />
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            {data.settings.showClientLogo && clientLogoSrc && (
              <img alt={data.client.name} className="h-7 rounded object-contain" src={clientLogoSrc} />
            )}
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-medium">{data.client.name}</span>
              {data.client.industry && <Badge variant="outline" className="text-xs hidden sm:inline-flex">{data.client.industry}</Badge>}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Welcome, {data.client.name}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">Your real-time view into project progress, deliverables, and key milestones.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground mb-2"><Briefcase className="h-4 w-4" /><span className="text-xs font-medium">Active Projects</span></div><p className="text-3xl font-semibold">{activeCount}</p><p className="text-xs text-muted-foreground mt-1">{data.projects.length} total</p></CardContent></Card>
          {s.milestones && (
            <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground mb-2"><Target className="h-4 w-4" /><span className="text-xs font-medium">Milestones</span></div><p className="text-3xl font-semibold">{completedMilestones}<span className="text-lg text-muted-foreground">/{totalMilestones}</span></p><Progress value={milestoneProgress} className="h-1.5 mt-2" /></CardContent></Card>
          )}
          {s.deliverables && (
            <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground mb-2"><FileText className="h-4 w-4" /><span className="text-xs font-medium">Deliverables</span></div><p className="text-3xl font-semibold">{completedDeliverables}<span className="text-lg text-muted-foreground">/{totalDeliverables}</span></p><Progress value={deliverableProgress} className="h-1.5 mt-2" /></CardContent></Card>
          )}
          {s.ragStatus && (
            <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground mb-2"><Activity className="h-4 w-4" /><span className="text-xs font-medium">Overall Health</span></div>{data.projects.length > 0 ? (() => { const rag = getRAGStatus(data.projects[0]); return <><Badge className={cn("text-sm px-3 py-1", rag.color)}>{rag.status}</Badge><p className="text-xs text-muted-foreground mt-2">Primary project</p></>; })() : <p className="text-sm text-muted-foreground">No projects</p>}</CardContent></Card>
          )}
        </div>

        {/* Project Selector */}
        {data.projects.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {data.projects.map(p => (
              <Button key={p.id} variant={activeProject === p.id ? "default" : "outline"} size="sm" className="shrink-0 rounded-full" onClick={() => setActiveProject(p.id)}>
                {p.name}<Badge variant="outline" className={cn("ml-2 text-[10px]", getStatusColor(p.status))}>{p.status}</Badge>
              </Button>
            ))}
          </div>
        )}

        {selectedProject && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-xl">{selectedProject.name}</CardTitle>
                  {selectedProject.description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{selectedProject.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                    {selectedProject.start_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(selectedProject.start_date), "MMM dd, yyyy")}</span>}
                    {selectedProject.end_date && <span>→ {format(new Date(selectedProject.end_date), "MMM dd, yyyy")}</span>}
                    {selectedProject.start_date && selectedProject.end_date && <span className="text-xs">({differenceInDays(new Date(selectedProject.end_date), new Date())} days remaining)</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.ragStatus && <Badge className={cn(getRAGStatus(selectedProject).color, "text-xs")}>{getRAGStatus(selectedProject).status}</Badge>}
                  <Badge variant="outline" className={cn("text-xs", getStatusColor(selectedProject.status))}>{selectedProject.status}</Badge>
                </div>
              </div>
              {s.progress && selectedProject.progress_percentage !== null && (
                <div className="flex items-center gap-3 mt-4"><Progress value={selectedProject.progress_percentage} className="h-2.5 flex-1" /><span className="text-sm font-medium">{selectedProject.progress_percentage}%</span></div>
              )}
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex-wrap">
                  {visibleTabs.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
                  ))}
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {s.milestones && (
                      <Card><CardContent className="p-4 text-center"><Target className="h-6 w-6 mx-auto text-primary mb-2" /><p className="text-2xl font-bold">{selectedProject.milestones.filter(m => m.status === "completed").length}/{selectedProject.milestones.length}</p><p className="text-xs text-muted-foreground">Milestones Complete</p></CardContent></Card>
                    )}
                    {s.deliverables && (
                      <Card><CardContent className="p-4 text-center"><FileText className="h-6 w-6 mx-auto text-primary mb-2" /><p className="text-2xl font-bold">{selectedProject.deliverables.filter(d => d.status === "delivered" || d.status === "approved").length}/{selectedProject.deliverables.length}</p><p className="text-xs text-muted-foreground">Deliverables Complete</p></CardContent></Card>
                    )}
                    {s.assessments && (
                      <Card><CardContent className="p-4 text-center"><BarChart3 className="h-6 w-6 mx-auto text-primary mb-2" /><p className="text-2xl font-bold">{selectedProject.assessments.length}</p><p className="text-xs text-muted-foreground">Assessments</p></CardContent></Card>
                    )}
                    {s.teams && (
                      <Card><CardContent className="p-4 text-center"><Users className="h-6 w-6 mx-auto text-primary mb-2" /><p className="text-2xl font-bold">{selectedProject.team.length}</p><p className="text-xs text-muted-foreground">Team Members</p></CardContent></Card>
                    )}
                    {s.risks && (
                      <Card><CardContent className="p-4 text-center"><AlertCircle className="h-6 w-6 mx-auto text-primary mb-2" /><p className="text-2xl font-bold">{selectedProject.risks.filter(r => r.status === "Open").length}</p><p className="text-xs text-muted-foreground">Open Risks</p></CardContent></Card>
                    )}
                    {s.budget && selectedProject.budget_amount && (
                      <Card><CardContent className="p-4 text-center"><DollarSign className="h-6 w-6 mx-auto text-primary mb-2" /><p className="text-2xl font-bold">{selectedProject.currency || '$'}{selectedProject.budget_amount.toLocaleString()}</p><p className="text-xs text-muted-foreground">Budget</p></CardContent></Card>
                    )}
                  </div>
                </TabsContent>

                {/* Project Details Tab */}
                {s.projectDetails && (
                  <TabsContent value="details" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Project Information</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          <div><span className="text-xs text-muted-foreground">Status</span><p className="text-sm font-medium">{selectedProject.status}</p></div>
                          {selectedProject.description && <div><span className="text-xs text-muted-foreground">Description</span><p className="text-sm">{selectedProject.description}</p></div>}
                          {selectedProject.start_date && <div><span className="text-xs text-muted-foreground">Start Date</span><p className="text-sm">{format(new Date(selectedProject.start_date), "MMMM dd, yyyy")}</p></div>}
                          {selectedProject.end_date && <div><span className="text-xs text-muted-foreground">End Date</span><p className="text-sm">{format(new Date(selectedProject.end_date), "MMMM dd, yyyy")}</p></div>}
                          {selectedProject.start_date && selectedProject.end_date && (
                            <div><span className="text-xs text-muted-foreground">Duration</span><p className="text-sm">{differenceInDays(new Date(selectedProject.end_date), new Date(selectedProject.start_date))} days</p></div>
                          )}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Progress Summary</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          {s.progress && selectedProject.progress_percentage !== null && (
                            <div>
                              <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Overall Progress</span><span className="font-medium">{selectedProject.progress_percentage}%</span></div>
                              <Progress value={selectedProject.progress_percentage} className="h-2" />
                            </div>
                          )}
                          {s.milestones && (
                            <div>
                              <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Milestones</span><span className="font-medium">{selectedProject.milestones.filter(m => m.status === "completed").length}/{selectedProject.milestones.length}</span></div>
                              <Progress value={selectedProject.milestones.length > 0 ? (selectedProject.milestones.filter(m => m.status === "completed").length / selectedProject.milestones.length) * 100 : 0} className="h-2" />
                            </div>
                          )}
                          {s.deliverables && (
                            <div>
                              <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Deliverables</span><span className="font-medium">{selectedProject.deliverables.filter(d => d.status === "delivered" || d.status === "approved").length}/{selectedProject.deliverables.length}</span></div>
                              <Progress value={selectedProject.deliverables.length > 0 ? (selectedProject.deliverables.filter(d => d.status === "delivered" || d.status === "approved").length / selectedProject.deliverables.length) * 100 : 0} className="h-2" />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                )}

                {/* Milestones Tab */}
                {s.milestones && (
                  <TabsContent value="milestones" className="space-y-3 mt-4">
                    {selectedProject.milestones.map(m => (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        {m.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : isPast(new Date(m.target_date)) ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                        <div className="flex-1"><p className="text-sm font-medium">{m.title}</p>{m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}</div>
                        <div className="text-right"><p className="text-xs text-muted-foreground">{format(new Date(m.target_date), "MMM dd, yyyy")}</p><Badge variant="outline" className={cn("text-[10px]", getStatusColor(m.status))}>{m.status}</Badge></div>
                      </div>
                    ))}
                    {selectedProject.milestones.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No milestones set yet</p>}
                  </TabsContent>
                )}

                {/* Deliverables Tab */}
                {s.deliverables && (
                  <TabsContent value="deliverables" className="space-y-3 mt-4">
                    {selectedProject.deliverables.map(d => (
                      <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <FileText className="h-5 w-5 text-primary" />
                        <div className="flex-1"><p className="text-sm font-medium">{d.title}</p>{d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}</div>
                        <Badge variant="outline" className={cn("text-[10px]", getStatusColor(d.status))}>{d.status}</Badge>
                      </div>
                    ))}
                    {selectedProject.deliverables.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No deliverables set yet</p>}
                  </TabsContent>
                )}

                {/* Assessments Tab */}
                {s.assessments && (
                  <TabsContent value="assessments" className="space-y-3 mt-4">
                    {selectedProject.assessments.map(a => (
                      <div key={a.id} className="p-4 rounded-lg border space-y-2">
                        <div className="flex items-center gap-3">
                          <BarChart3 className="h-5 w-5 text-primary" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{a.name}</p>
                            {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                          </div>
                          <Badge variant="outline" className={cn("text-[10px]", getStatusColor(a.status))}>{a.status}</Badge>
                        </div>
                        {s.assessmentDetails && (a.question_count! > 0 || a.response_count! > 0) && (
                          <div className="flex items-center gap-4 ml-8 text-xs text-muted-foreground">
                            <span>{a.question_count} questions</span>
                            <span>{a.response_count} responses</span>
                            {a.question_count! > 0 && (
                              <div className="flex items-center gap-2 flex-1">
                                <Progress value={Math.min((a.response_count! / a.question_count!) * 100, 100)} className="h-1.5 max-w-[120px]" />
                                <span>{Math.round(Math.min((a.response_count! / a.question_count!) * 100, 100))}%</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedProject.assessments.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No assessments available</p>}
                  </TabsContent>
                )}

                {/* Team Tab */}
                {s.teams && (
                  <TabsContent value="team" className="mt-4">
                    {selectedProject.team.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedProject.team.map(member => (
                          <Card key={member.id}>
                            <CardContent className="p-4 flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm shrink-0">
                                {member.avatar_url ? (
                                  <img src={member.avatar_url} alt={member.name} className="h-10 w-10 rounded-full object-cover" />
                                ) : (
                                  member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{member.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{member.role_in_project}</p>
                                <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No team members assigned</p>
                    )}
                  </TabsContent>
                )}

                {/* Risks & Issues Tab */}
                {s.risks && (
                  <TabsContent value="risks" className="space-y-6 mt-4">
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Risks ({selectedProject.risks.length})</h3>
                      {selectedProject.risks.length > 0 ? (
                        <div className="space-y-2">
                          {selectedProject.risks.map(r => (
                            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{r.title}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs">
                                  <span className={getLikelihoodImpactColor(r.likelihood)}>Likelihood: {r.likelihood}</span>
                                  <span className={getLikelihoodImpactColor(r.impact)}>Impact: {r.impact}</span>
                                  <span className="text-muted-foreground">{r.category}</span>
                                </div>
                              </div>
                              <Badge variant="outline" className={cn("text-[10px]", getStatusColor(r.status))}>{r.status}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-muted-foreground">No risks recorded</p>}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" /> Issues ({selectedProject.issues.length})</h3>
                      {selectedProject.issues.length > 0 ? (
                        <div className="space-y-2">
                          {selectedProject.issues.map(i => (
                            <div key={i.id} className="flex items-center gap-3 p-3 rounded-lg border">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{i.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">Raised: {format(new Date(i.raised_date), "MMM dd, yyyy")}</p>
                              </div>
                              <Badge variant="outline" className={cn("text-[10px]", getLikelihoodImpactColor(i.priority))}>{i.priority}</Badge>
                              <Badge variant="outline" className={cn("text-[10px]", getStatusColor(i.status))}>{i.status}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-muted-foreground">No issues recorded</p>}
                    </div>
                  </TabsContent>
                )}

                {/* Budget Tab */}
                {s.budget && (
                  <TabsContent value="budget" className="mt-4">
                    {selectedProject.budget_amount ? (
                      <Card><CardContent className="p-6 text-center">
                        <DollarSign className="h-10 w-10 mx-auto text-primary mb-3" />
                        <p className="text-3xl font-bold">{selectedProject.currency || '$'}{selectedProject.budget_amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground mt-1">Total Project Budget</p>
                      </CardContent></Card>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">Budget information not available</p>
                    )}
                  </TabsContent>
                )}

                {/* Feedback Tab */}
                {s.feedback && (
                  <TabsContent value="feedback" className="mt-4">
                    {feedbackSubmitted ? (
                      <div className="text-center py-8"><CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-3" /><h3 className="text-lg font-medium">Thank you!</h3><p className="text-muted-foreground">Your feedback has been recorded.</p></div>
                    ) : (
                      <div className="space-y-4 max-w-lg">
                        <div><p className="text-sm font-medium mb-2">How would you rate this engagement?</p><div className="flex gap-2">{[1,2,3,4,5].map(r => (<button key={r} onClick={() => setFeedbackRating(r)} className={cn("h-10 w-10 rounded-full border-2 transition-all flex items-center justify-center", feedbackRating >= r ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 hover:border-primary/50")}><Star className={cn("h-5 w-5", feedbackRating >= r && "fill-current")} /></button>))}</div></div>
                        <div><p className="text-sm font-medium mb-2">Comments (optional)</p><Textarea value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} placeholder="Share your thoughts..." rows={3} /></div>
                        <Button onClick={submitFeedback} disabled={feedbackSubmitting || feedbackRating === 0}><Send className="h-4 w-4 mr-2" />{feedbackSubmitting ? "Submitting..." : "Submit Feedback"}</Button>
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
