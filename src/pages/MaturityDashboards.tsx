import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, BarChart3, Sparkles, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const industries = [
  "Automotive", "Financial Services", "Healthcare", "Manufacturing",
  "Retail", "Technology", "Telecommunications", "Energy", "Government", "General",
];

export default function MaturityDashboards() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState("");
  const [industry, setIndustry] = useState("General");
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editIndustry, setEditIndustry] = useState("General");
  const [editTopic, setEditTopic] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: dashboards, isLoading } = useQuery({
    queryKey: ["maturity-dashboards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maturity_dashboards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: assessmentInstances } = useQuery({
    queryKey: ["assessment-instances-for-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_instances")
        .select("id, name, status")
        .in("status", ["active", "closed"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }
    setGenerating(true);
    try {
      const resp = await supabase.functions.invoke("generate-maturity-dashboard", {
        body: { topic, industry, assessment_instance_id: assessmentId },
      });

      if (resp.error) throw new Error(resp.error.message);
      const result = resp.data;

      const { data: dashboard, error: dbErr } = await supabase
        .from("maturity_dashboards")
        .insert({
          title: result.title,
          subtitle: result.subtitle,
          topic: result.topic,
          industry: result.industry,
          assessment_instance_id: result.assessment_instance_id,
          assessment_template_id: result.assessment_template_id,
          owner_id: user!.id,
          hero_style: result.hero_style,
          recommended_moves: result.recommended_moves,
          snapshot_metrics: result.snapshot_metrics,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;

      const caps = result.capabilities.map((c: any) => ({
        dashboard_id: dashboard.id,
        name: c.name,
        score: c.score,
        target_score: c.target_score,
        source_type: c.source_type,
        source_detail: c.source_detail,
        owner: c.owner,
        summary: c.summary,
        dimension_id: c.dimension_id,
        order_index: c.order_index,
      }));

      const { error: capsErr } = await supabase
        .from("maturity_dashboard_capabilities")
        .insert(caps);

      if (capsErr) throw capsErr;

      toast.success("Dashboard generated successfully!");
      setWizardOpen(false);
      resetWizard();
      navigate(`/maturity-dashboards/${dashboard.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate dashboard");
    } finally {
      setGenerating(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setTopic("");
    setIndustry("General");
    setAssessmentId(null);
  };

  const openEdit = (d: any) => {
    setEditId(d.id);
    setEditTitle(d.title);
    setEditSubtitle(d.subtitle || "");
    setEditIndustry(d.industry || "General");
    setEditTopic(d.topic);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editId || !editTitle.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("maturity_dashboards")
        .update({ title: editTitle, subtitle: editSubtitle || null, industry: editIndustry, topic: editTopic })
        .eq("id", editId);
      if (error) throw error;
      toast.success("Dashboard updated");
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["maturity-dashboards"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      // Delete capabilities first
      await supabase.from("maturity_dashboard_capabilities").delete().eq("dashboard_id", deleteId);
      const { error } = await supabase.from("maturity_dashboards").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Dashboard deleted");
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["maturity-dashboards"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Maturity Dashboards</h1>
          <p className="mt-1 text-muted-foreground">AI-powered maturity assessments with provenance tracking</p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Dashboard
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !dashboards?.length ? (
        <Card className="enterprise-card rounded-[1.75rem]">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold">No dashboards yet</h3>
            <p className="text-muted-foreground mt-1 max-w-md">
              Create your first AI-powered maturity dashboard. Choose a topic and industry, optionally link an assessment, and let AI generate insights.
            </p>
            <Button className="mt-6" onClick={() => setWizardOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" /> Create your first dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((d: any) => (
            <Card
              key={d.id}
              className="enterprise-card rounded-[1.75rem] cursor-pointer hover:shadow-md transition-shadow group relative"
              onClick={() => navigate(`/maturity-dashboards/${d.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">{d.industry}</Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString()}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => openEdit(d)}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(d.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">{d.title}</CardTitle>
                {d.subtitle && <CardDescription className="line-clamp-2">{d.subtitle}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{d.topic}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Wizard */}
      <Dialog open={wizardOpen} onOpenChange={(open) => { setWizardOpen(open); if (!open) resetWizard(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Maturity Dashboard</DialogTitle>
            <DialogDescription>
              {step === 1 && "Define the topic and industry for your dashboard."}
              {step === 2 && "Optionally link an existing assessment for proprietary data."}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Topic *</Label>
                <Input placeholder="e.g. AI Maturity, Digital Transformation" value={topic} onChange={(e) => setTopic(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {industries.map((ind) => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setWizardOpen(false)}>Cancel</Button>
                <Button onClick={() => setStep(2)} disabled={!topic.trim()}>Next</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Link Assessment (optional)</Label>
                <Select value={assessmentId || "none"} onValueChange={(v) => setAssessmentId(v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Start from AI research only" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">AI research only</SelectItem>
                    {assessmentInstances?.map((ai) => <SelectItem key={ai.id} value={ai.id}>{ai.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Linking an assessment will use proprietary scores and augment missing data with AI research.</p>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate Dashboard</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Dashboard</DialogTitle>
            <DialogDescription>Update the dashboard details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input value={editTopic} onChange={(e) => setEditTopic(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={editIndustry} onValueChange={setEditIndustry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {industries.map((ind) => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving || !editTitle.trim()}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dashboard</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this dashboard and all its capabilities. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
