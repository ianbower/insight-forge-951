import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList, Plus, BarChart3, Users, Send, Eye, Settings2, Link2, Maximize2, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AssessmentResults } from "@/components/assessments/AssessmentResults";
import { AssessmentLaunch } from "@/components/assessments/AssessmentLaunch";
import { AssessmentBuilder } from "@/components/assessments/AssessmentBuilder";

interface EmbeddedAssessmentProps {
  projectId: string;
  stepId?: string;
  compact?: boolean; // For embedding in step detail view
  displayMode?: 'setup' | 'results'; // 'results' shows results inline, 'setup' shows management UI
}

interface WorkflowStep {
  id: string;
  title: string;
  order_index: number | null;
}

interface ProjectAssessment {
  id: string;
  step_id: string | null;
  assessment_instance: {
    id: string;
    name: string;
    status: string;
    created_at: string;
    assessment_template_id: string;
    assessment_template: {
      id: string;
      name: string;
      category: string;
      assessment_type?: string;
    };
  };
  recipientCount?: number;
  responseCount?: number;
}

export function EmbeddedAssessment({ projectId, stepId, compact = false, displayMode = 'setup' }: EmbeddedAssessmentProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<ProjectAssessment[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [existingInstances, setExistingInstances] = useState<any[]>([]);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addMode, setAddMode] = useState<'new' | 'existing'>('new');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedExistingInstanceId, setSelectedExistingInstanceId] = useState<string>("");
  const [selectedStepId, setSelectedStepId] = useState<string>(stepId || "");
  const [launchDialogOpen, setLaunchDialogOpen] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [builderDialogOpen, setBuilderDialogOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<{ id: string; name: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<{ id: string; name: string; assessment_type?: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [projectId, stepId]);

  const fetchData = async () => {
    setLoading(true);

    // Build query for project assessments
    let query = supabase
      .from("project_assessments")
      .select(`
        id,
        step_id,
        assessment_instance:assessment_instances(
          id,
          name,
          status,
          created_at,
          assessment_template_id,
          assessment_template:assessment_templates(id, name, category, assessment_type)
        )
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    // If stepId is provided, filter to that step only
    if (stepId) {
      query = query.eq("step_id", stepId);
    }

    const { data: projectAssessments } = await query;

    // Fetch recipient/response counts
    const enrichedAssessments: ProjectAssessment[] = [];
    for (const pa of projectAssessments || []) {
      if (!pa.assessment_instance) continue;
      
      const { count: recipientCount } = await supabase
        .from("assessment_recipients")
        .select("*", { count: "exact", head: true })
        .eq("assessment_instance_id", pa.assessment_instance.id);

      const { count: responseCount } = await supabase
        .from("assessment_recipients")
        .select("*", { count: "exact", head: true })
        .eq("assessment_instance_id", pa.assessment_instance.id)
        .eq("status", "completed");

      enrichedAssessments.push({
        ...pa,
        assessment_instance: pa.assessment_instance as any,
        recipientCount: recipientCount || 0,
        responseCount: responseCount || 0,
      });
    }

    setAssessments(enrichedAssessments);

    // Fetch templates for adding new
    const { data: templatesData } = await supabase
      .from("assessment_templates")
      .select("id, name, category, assessment_type")
      .order("name");

    setTemplates(templatesData || []);

    // Get already-linked instance IDs for this project
    const linkedInstanceIds = enrichedAssessments.map(a => a.assessment_instance.id);

    // Fetch existing assessment instances that are NOT yet linked to this project
    const { data: instancesData } = await supabase
      .from("assessment_instances")
      .select("id, name, status, assessment_template:assessment_templates(id, name, category, assessment_type)")
      .not("id", "in", linkedInstanceIds.length > 0 ? `(${linkedInstanceIds.join(",")})` : "(00000000-0000-0000-0000-000000000000)")
      .order("created_at", { ascending: false });

    setExistingInstances(instancesData || []);

    // Fetch workflow steps for linking (only if not in compact/step mode)
    if (!stepId) {
      const { data: stepsData } = await supabase
        .from("project_tasks")
        .select("id, title, order_index")
        .eq("project_id", projectId)
        .order("order_index");

      setWorkflowSteps(stepsData || []);
    }

    setLoading(false);
  };

  const handleAddAssessment = async () => {
    const linkStepId = stepId || (selectedStepId && selectedStepId !== "none" ? selectedStepId : null);

    if (addMode === 'existing') {
      // Link an existing assessment instance
      if (!selectedExistingInstanceId) return;

      const { error: linkError } = await supabase.from("project_assessments").insert({
        project_id: projectId,
        assessment_instance_id: selectedExistingInstanceId,
        step_id: linkStepId,
      });

      if (linkError) {
        toast({ title: "Error", description: linkError.message, variant: "destructive" });
        return;
      }

      toast({ title: "Assessment linked to project" });
    } else {
      // Create new assessment from template
      if (!selectedTemplateId) return;

      const template = templates.find((t) => t.id === selectedTemplateId);
      if (!template) return;

      // Create instance
      const { data: instance, error: instanceError } = await supabase
        .from("assessment_instances")
        .insert({
          assessment_template_id: selectedTemplateId,
          name: `${template.name} - ${new Date().toLocaleDateString()}`,
          project_id: projectId,
          status: "draft",
        })
        .select()
        .single();

      if (instanceError) {
        toast({ title: "Error", description: instanceError.message, variant: "destructive" });
        return;
      }

      // Create project assessment link with optional step
      const { error: linkError } = await supabase.from("project_assessments").insert({
        project_id: projectId,
        assessment_instance_id: instance.id,
        step_id: linkStepId,
      });

      if (linkError) {
        toast({ title: "Error", description: linkError.message, variant: "destructive" });
        return;
      }

      toast({ title: "Assessment added to project" });
    }

    setAddDialogOpen(false);
    setSelectedTemplateId("");
    setSelectedExistingInstanceId("");
    setAddMode('new');
    setSelectedStepId(stepId || "");
    fetchData();
  };

  const handleRemoveAssessment = async (projectAssessmentId: string, assessmentName: string) => {
    if (!confirm(`Remove "${assessmentName}" from this project? This will unlink the assessment but won't delete the assessment itself.`)) return;

    const { error } = await supabase
      .from("project_assessments")
      .delete()
      .eq("id", projectAssessmentId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Assessment removed from project" });
      fetchData();
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-slate-500/10 text-slate-500",
    active: "bg-emerald-500/10 text-emerald-500",
    closed: "bg-blue-500/10 text-blue-500",
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading assessments...</p>
        </CardContent>
      </Card>
    );
  }

  // Results display mode - show results inline for the first assessment
  if (displayMode === 'results' && assessments.length > 0) {
    const primaryAssessment = assessments[0];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={cn("font-semibold flex items-center gap-2", compact ? "text-base" : "text-lg")}>
              <ClipboardList className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
              {primaryAssessment.assessment_instance.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {primaryAssessment.assessment_instance.assessment_template?.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("capitalize text-xs", statusColors[primaryAssessment.assessment_instance.status])}
            >
              {primaryAssessment.assessment_instance.status}
            </Badge>
            {assessments.length > 1 && (
              <Badge variant="secondary" className="text-xs">
                +{assessments.length - 1} more
              </Badge>
            )}
            {(primaryAssessment.responseCount || 0) > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setSelectedInstance({
                    id: primaryAssessment.assessment_instance.id,
                    name: primaryAssessment.assessment_instance.name,
                  });
                  setResultsDialogOpen(true);
                }}
                title="View full results"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Inline Results */}
        <AssessmentResults
          instanceId={primaryAssessment.assessment_instance.id}
          instanceName={primaryAssessment.assessment_instance.name}
          embedded
        />

        {/* Dialogs for results mode */}
        <Dialog open={launchDialogOpen} onOpenChange={setLaunchDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedInstance && (
              <AssessmentLaunch
                templateId=""
                templateName={selectedInstance.name}
                instanceId={selectedInstance.id}
                onClose={() => {
                  setLaunchDialogOpen(false);
                  fetchData();
                }}
                onViewResults={(id, name) => {
                  setLaunchDialogOpen(false);
                  setSelectedInstance({ id, name });
                  setResultsDialogOpen(true);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Full Results Dialog */}
        <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            {selectedInstance && (
              <AssessmentResults
                instanceId={selectedInstance.id}
                instanceName={selectedInstance.name}
                onClose={() => setResultsDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={cn("font-semibold flex items-center gap-2", compact ? "text-base" : "text-lg")}>
          <ClipboardList className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
          {stepId ? "Step Assessments" : "Project Assessments"}
        </h3>
        <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Assessment
        </Button>
      </div>

      {assessments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className={cn("text-center", compact ? "py-6" : "py-8")}>
            <ClipboardList className={cn("mx-auto mb-3 text-muted-foreground/50", compact ? "h-8 w-8" : "h-10 w-10")} />
            <p className="text-muted-foreground">
              {stepId ? "No assessments linked to this step" : "No assessments linked to this project"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
              className="mt-3 gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {assessments.map((pa) => (
            <Card key={pa.id} className="border-border">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{pa.assessment_instance.name}</span>
                      <Badge
                        variant="outline"
                        className={cn("capitalize text-xs", statusColors[pa.assessment_instance.status])}
                      >
                        {pa.assessment_instance.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pa.assessment_instance.assessment_template?.name} • {pa.assessment_instance.assessment_template?.category}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{pa.recipientCount} recipients</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BarChart3 className="h-3.5 w-3.5" />
                        <span>{pa.responseCount} completed</span>
                      </div>
                    </div>
                    {(pa.recipientCount || 0) > 0 && (
                      <Progress
                        value={((pa.responseCount || 0) / (pa.recipientCount || 1)) * 100}
                        className="h-1.5 mt-2 max-w-[200px]"
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate({
                          id: pa.assessment_instance.assessment_template?.id || pa.assessment_instance.assessment_template_id,
                          name: pa.assessment_instance.assessment_template?.name || "Assessment",
                          assessment_type: (pa.assessment_instance.assessment_template as any)?.assessment_type || "standard",
                        });
                        setBuilderDialogOpen(true);
                      }}
                      className="gap-2"
                    >
                      <Settings2 className="h-4 w-4" />
                      Edit Questions
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedInstance({
                          id: pa.assessment_instance.id,
                          name: pa.assessment_instance.name,
                        });
                        setLaunchDialogOpen(true);
                      }}
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Manage
                    </Button>
                    {
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedInstance({
                            id: pa.assessment_instance.id,
                            name: pa.assessment_instance.name,
                          });
                          setResultsDialogOpen(true);
                        }}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Results
                      </Button>
                    }
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAssessment(pa.id, pa.assessment_instance.name)}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Assessment Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => {
        setAddDialogOpen(open);
        if (!open) {
          setAddMode('new');
          setSelectedTemplateId("");
          setSelectedExistingInstanceId("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Assessment {stepId ? "to Step" : "to Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={addMode === 'new' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAddMode('new')}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
              <Button
                variant={addMode === 'existing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAddMode('existing')}
                className="flex-1"
                disabled={existingInstances.length === 0}
              >
                <Link2 className="h-4 w-4 mr-2" />
                Link Existing
              </Button>
            </div>

            {addMode === 'new' ? (
              <div className="space-y-2">
                <Label>Assessment Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an assessment template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.length === 0 ? (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        No templates available. Create one in the Assessments library.
                      </div>
                    ) : (
                      templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.category})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Existing Assessment</Label>
                <Select value={selectedExistingInstanceId} onValueChange={setSelectedExistingInstanceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an existing assessment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingInstances.length === 0 ? (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        No available assessments to link
                      </div>
                    ) : (
                      existingInstances.map((inst) => (
                        <SelectItem key={inst.id} value={inst.id}>
                          <div className="flex items-center gap-2">
                            <span>{inst.name}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {inst.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Link an existing assessment that was created elsewhere
                </p>
              </div>
            )}

            {/* Step selector - only show when not already in step context */}
            {!stepId && workflowSteps.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Link to Workflow Step (Optional)
                </Label>
                <Select value={selectedStepId} onValueChange={setSelectedStepId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No step - project level only" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No step - project level only</SelectItem>
                    {workflowSteps.map((step) => (
                      <SelectItem key={step.id} value={step.id}>
                        {step.order_index !== null ? `${step.order_index + 1}. ` : ""}{step.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Linking to a step will show this assessment in the step's detail view
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddAssessment} 
                disabled={addMode === 'new' ? !selectedTemplateId : !selectedExistingInstanceId}
              >
                {addMode === 'new' ? 'Add Assessment' : 'Link Assessment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Launch/Manage Dialog */}
      <Dialog open={launchDialogOpen} onOpenChange={setLaunchDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {selectedInstance && (
            <AssessmentLaunch
              templateId=""
              templateName={selectedInstance.name}
              instanceId={selectedInstance.id}
              onClose={() => {
                setLaunchDialogOpen(false);
                fetchData();
              }}
              onViewResults={(id, name) => {
                setLaunchDialogOpen(false);
                setSelectedInstance({ id, name });
                setResultsDialogOpen(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {selectedInstance && (
            <AssessmentResults
              instanceId={selectedInstance.id}
              instanceName={selectedInstance.name}
              onClose={() => setResultsDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Assessment Builder Dialog */}
      <Dialog open={builderDialogOpen} onOpenChange={setBuilderDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTemplate && (
            <AssessmentBuilder
              templateId={selectedTemplate.id}
              templateName={selectedTemplate.name}
              assessmentType={selectedTemplate.assessment_type || "standard"}
              onClose={() => {
                setBuilderDialogOpen(false);
                setSelectedTemplate(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
