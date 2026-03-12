import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase, Target, CheckCircle2, Clock, FileText, Building2, AlertTriangle,
  Star, MessageSquare, Send, Download, FolderOpen, BarChart3,
  Calendar, Shield, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isPast } from "date-fns";
import { toast } from "sonner";

interface PortalProject {
  id: string; name: string; status: string; description: string | null; progress_percentage: number | null;
  start_date: string | null; end_date: string | null; budget_amount: number | null; currency: string | null;
  milestones: Array<{ id: string; title: string; status: string; target_date: string; description: string | null }>;
  deliverables: Array<{ id: string; title: string; status: string; due_date: string | null; description: string | null }>;
  documents: Array<{ name: string; id: string; created_at: string; metadata: any }>;
  assessments: Array<{ id: string; name: string; status: string; description: string | null }>;
}

interface PortalData {
  client: { name: string; industry: string | null };
  projects: PortalProject[];
  tokenId?: string; clientId?: string;
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
        const { data: tokenData, error: tokenError } = await supabase.from("client_portal_tokens").select("id, client_id, is_active, expires_at, created_by").eq("token", token).eq("is_active", true).single();
        if (tokenError || !tokenData) { setError("Invalid or expired portal link."); setLoading(false); return; }
        if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) { setError("This portal link has expired."); setLoading(false); return; }

        const { data: client } = await supabase.from("clients").select("name, industry").eq("id", (tokenData as any).client_id).single();
        if (!client) { setError("Client not found."); setLoading(false); return; }

        const { data: projects } = await supabase.from("projects").select("id, name, status, description, progress_percentage, start_date, end_date, budget_amount, currency").eq("client_id", (tokenData as any).client_id).neq("status", "Cancelled").order("created_at", { ascending: false });
        const projectIds = (projects || []).map(p => p.id);

        let milestones: any[] = [], deliverables: any[] = [], assessmentInstances: any[] = [];
        if (projectIds.length > 0) {
          const [milestonesRes, deliverablesRes, assessmentsRes] = await Promise.all([
            supabase.from("project_milestones").select("id, title, status, target_date, description, project_id").in("project_id", projectIds).order("target_date"),
            supabase.from("project_deliverables").select("id, title, status, due_date, description, project_id").in("project_id", projectIds).order("order_index"),
            supabase.from("assessment_instances").select("id, name, status, description, project_id").in("project_id", projectIds).neq("status", "draft"),
          ]);
          milestones = milestonesRes.data || []; deliverables = deliverablesRes.data || []; assessmentInstances = assessmentsRes.data || [];
        }

        setData({
          client,
          projects: (projects || []).map(p => ({ ...p, milestones: milestones.filter(m => m.project_id === p.id), deliverables: deliverables.filter(d => d.project_id === p.id), documents: [], assessments: assessmentInstances.filter(a => a.project_id === p.id) })),
          tokenId: (tokenData as any).id, clientId: (tokenData as any).client_id,
        });
        if (projects && projects.length > 0) setActiveProject(projects[0].id);
      } catch { setError("Something went wrong loading the portal."); } finally { setLoading(false); }
    };
    fetchPortalData();
  }, [token]);

  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /><p className="text-sm text-muted-foreground animate-pulse">Loading your portal…</p></div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center bg-background p-4"><Card className="max-w-md w-full"><CardContent className="p-8 text-center"><Shield className="h-12 w-12 mx-auto text-destructive/60 mb-4" /><h2 className="text-xl font-semibold mb-2">Portal Unavailable</h2><p className="text-muted-foreground">{error || "Unable to load portal data."}</p></CardContent></Card></div>;

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

  const activeCount = data.projects.filter(p => p.status === "Active").length;
  const totalMilestones = data.projects.reduce((s, p) => s + p.milestones.length, 0);
  const completedMilestones = data.projects.reduce((s, p) => s + p.milestones.filter(m => m.status === "completed").length, 0);
  const totalDeliverables = data.projects.reduce((s, p) => s + p.deliverables.length, 0);
  const completedDeliverables = data.projects.reduce((s, p) => s + p.deliverables.filter(d => d.status === "delivered" || d.status === "approved").length, 0);
  const selectedProject = data.projects.find(p => p.id === activeProject);
  const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const deliverableProgress = totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0;

  const submitFeedback = async () => {
    if (feedbackRating === 0) { toast.error("Please select a rating"); return; }
    setFeedbackSubmitting(true);
    try {
      const { error } = await supabase.from("client_feedback" as any).insert({ client_id: data.clientId!, portal_token_id: data.tokenId!, rating: feedbackRating, comment: feedbackComment || null, category: "general" });
      if (error) throw error;
      setFeedbackSubmitted(true); toast.success("Thank you for your feedback!");
    } catch { toast.error("Failed to submit feedback"); } finally { setFeedbackSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3"><img alt="aXet consult" className="h-8" src="/lovable-uploads/3719f63a-7253-4d1d-9213-327c9940cd39.png" /></div>
          <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-primary" /><span className="font-medium">{data.client.name}</span>{data.client.industry && <Badge variant="outline" className="text-xs hidden sm:inline-flex">{data.client.industry}</Badge>}</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Welcome, {data.client.name}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">Your real-time view into project progress, deliverables, and key milestones.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground mb-2"><Briefcase className="h-4 w-4" /><span className="text-xs font-medium">Active Projects</span></div><p className="text-3xl font-semibold">{activeCount}</p><p className="text-xs text-muted-foreground mt-1">{data.projects.length} total</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground mb-2"><Target className="h-4 w-4" /><span className="text-xs font-medium">Milestones</span></div><p className="text-3xl font-semibold">{completedMilestones}<span className="text-lg text-muted-foreground">/{totalMilestones}</span></p><Progress value={milestoneProgress} className="h-1.5 mt-2" /></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground mb-2"><FileText className="h-4 w-4" /><span className="text-xs font-medium">Deliverables</span></div><p className="text-3xl font-semibold">{completedDeliverables}<span className="text-lg text-muted-foreground">/{totalDeliverables}</span></p><Progress value={deliverableProgress} className="h-1.5 mt-2" /></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground mb-2"><Activity className="h-4 w-4" /><span className="text-xs font-medium">Overall Health</span></div>{data.projects.length > 0 ? (() => { const rag = getRAGStatus(data.projects[0]); return <><Badge className={cn("text-sm px-3 py-1", rag.color)}>{rag.status}</Badge><p className="text-xs text-muted-foreground mt-2">Primary project</p></>; })() : <p className="text-sm text-muted-foreground">No projects</p>}</CardContent></Card>
        </div>

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
                <div className="flex items-center gap-2"><Badge className={cn(getRAGStatus(selectedProject).color, "text-xs")}>{getRAGStatus(selectedProject).status}</Badge><Badge variant="outline" className={cn("text-xs", getStatusColor(selectedProject.status))}>{selectedProject.status}</Badge></div>
              </div>
              {selectedProject.progress_percentage !== null && (
                <div className="flex items-center gap-3 mt-4"><Progress value={selectedProject.progress_percentage} className="h-2.5 flex-1" /><span className="text-sm font-medium">{selectedProject.progress_percentage}%</span></div>
              )}
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="milestones">Milestones</TabsTrigger><TabsTrigger value="deliverables">Deliverables</TabsTrigger><TabsTrigger value="feedback">Feedback</TabsTrigger></TabsList>
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card><CardContent className="p-4 text-center"><Target className="h-6 w-6 mx-auto text-primary mb-2" /><p className="text-2xl font-bold">{selectedProject.milestones.filter(m => m.status === "completed").length}/{selectedProject.milestones.length}</p><p className="text-xs text-muted-foreground">Milestones Complete</p></CardContent></Card>
                    <Card><CardContent className="p-4 text-center"><FileText className="h-6 w-6 mx-auto text-primary mb-2" /><p className="text-2xl font-bold">{selectedProject.deliverables.filter(d => d.status === "delivered" || d.status === "approved").length}/{selectedProject.deliverables.length}</p><p className="text-xs text-muted-foreground">Deliverables Complete</p></CardContent></Card>
                    <Card><CardContent className="p-4 text-center"><BarChart3 className="h-6 w-6 mx-auto text-primary mb-2" /><p className="text-2xl font-bold">{selectedProject.assessments.length}</p><p className="text-xs text-muted-foreground">Assessments</p></CardContent></Card>
                  </div>
                </TabsContent>
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
              </Tabs>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}