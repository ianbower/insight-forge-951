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
import { ClipboardList, Plus, BarChart3, Users, Send, Eye, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssessmentResults } from "@/components/assessments/AssessmentResults";
import { AssessmentLaunch } from "@/components/assessments/AssessmentLaunch";
import { AssessmentBuilder } from "@/components/assessments/AssessmentBuilder";

interface EmbeddedAssessmentProps {
  projectId: string;
  stepId?: string;
}

interface ProjectAssessment {
  id: string;
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
    };
  };
  recipientCount?: number;
  responseCount?: number;
}

export function EmbeddedAssessment({ projectId, stepId }: EmbeddedAssessmentProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<ProjectAssessment[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [launchDialogOpen, setLaunchDialogOpen] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [builderDialogOpen, setBuilderDialogOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<{ id: string; name: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [projectId, stepId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch project assessments
    const { data: projectAssessments } = await supabase
      .from("project_assessments")
      .select(`
        id,
        assessment_instance:assessment_instances(
          id,
          name,
          status,
          created_at,
          assessment_template_id,
          assessment_template:assessment_templates(id, name, category)
        )
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

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
      .select("id, name, category")
      .order("name");

    setTemplates(templatesData || []);
    setLoading(false);
  };

  const handleAddAssessment = async () => {
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

    // Create project assessment link
    const { error: linkError } = await supabase.from("project_assessments").insert({
      project_id: projectId,
      assessment_instance_id: instance.id,
      step_id: stepId || null,
    });

    if (linkError) {
      toast({ title: "Error", description: linkError.message, variant: "destructive" });
      return;
    }

    toast({ title: "Assessment added to project" });
    setAddDialogOpen(false);
    setSelectedTemplateId("");
    fetchData();
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Project Assessments
        </h3>
        <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Assessment
        </Button>
      </div>

      {assessments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">No assessments linked to this project</p>
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
                    {(pa.responseCount || 0) > 0 && (
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
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Assessment Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Assessment to Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an assessment template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAssessment} disabled={!selectedTemplateId}>
                Add Assessment
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
