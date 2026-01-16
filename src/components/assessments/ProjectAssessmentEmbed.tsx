import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Plus, ExternalLink, Users, CheckCircle2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AssessmentInstance {
  id: string;
  name: string;
  status: string;
  assessment_template_id: string;
  created_at: string;
  assessment_templates?: {
    name: string;
    category: string;
  };
}

interface ProjectAssessment {
  id: string;
  project_id: string;
  assessment_instance_id: string;
  step_id: string | null;
  notes_json: any;
  assessment_instance?: AssessmentInstance;
}

interface ProjectAssessmentEmbedProps {
  projectId: string;
  stepId?: string;
}

export function ProjectAssessmentEmbed({ projectId, stepId }: ProjectAssessmentEmbedProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projectAssessments, setProjectAssessments] = useState<ProjectAssessment[]>([]);
  const [availableInstances, setAvailableInstances] = useState<AssessmentInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    fetchData();
  }, [projectId, stepId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch linked assessments
    const { data: linkedData } = await supabase
      .from("project_assessments")
      .select(`
        *,
        assessment_instances(
          *,
          assessment_templates(name, category)
        )
      `)
      .eq("project_id", projectId);

    const mapped = (linkedData || []).map((pa: any) => ({
      ...pa,
      assessment_instance: pa.assessment_instances ? {
        ...pa.assessment_instances,
        assessment_templates: pa.assessment_instances.assessment_templates,
      } : undefined,
    }));

    setProjectAssessments(mapped);

    // Fetch available instances not yet linked
    const linkedIds = mapped.map((pa: ProjectAssessment) => pa.assessment_instance_id);
    
    const { data: instancesData } = await supabase
      .from("assessment_instances")
      .select(`
        *,
        assessment_templates(name, category)
      `)
      .order("created_at", { ascending: false });

    const available = (instancesData || [])
      .filter((inst: any) => !linkedIds.includes(inst.id))
      .map((inst: any) => ({
        ...inst,
        assessment_templates: inst.assessment_templates,
      }));

    setAvailableInstances(available);
    setLoading(false);
  };

  const linkAssessment = async () => {
    if (!selectedInstanceId) return;

    setLinking(true);
    const { error } = await supabase.from("project_assessments").insert({
      project_id: projectId,
      assessment_instance_id: selectedInstanceId,
      step_id: stepId || null,
    });

    if (error) {
      toast({ title: "Error linking assessment", variant: "destructive" });
    } else {
      toast({ title: "Assessment linked to project" });
      setSelectedInstanceId("");
      fetchData();
    }
    setLinking(false);
  };

  const unlinkAssessment = async (id: string) => {
    const { error } = await supabase.from("project_assessments").delete().eq("id", id);
    if (error) {
      toast({ title: "Error unlinking assessment", variant: "destructive" });
    } else {
      toast({ title: "Assessment unlinked" });
      fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Completed</Badge>;
      case "draft":
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading assessments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Link new assessment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Link Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select an assessment instance..." />
              </SelectTrigger>
              <SelectContent>
                {availableInstances.length === 0 ? (
                  <SelectItem value="_none" disabled>No available assessments</SelectItem>
                ) : (
                  availableInstances.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name} ({inst.assessment_templates?.name})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button 
              onClick={linkAssessment} 
              disabled={!selectedInstanceId || linking}
              size="sm"
            >
              Link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Or <button 
              onClick={() => navigate("/assessments")} 
              className="text-primary hover:underline"
            >
              create a new assessment
            </button>
          </p>
        </CardContent>
      </Card>

      {/* Linked assessments */}
      {projectAssessments.length > 0 && (
        <div className="space-y-3">
          {projectAssessments.map((pa) => (
            <Card key={pa.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <ClipboardCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{pa.assessment_instance?.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {pa.assessment_instance?.assessment_templates?.name}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        {getStatusBadge(pa.assessment_instance?.status || "draft")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/assessments/${pa.assessment_instance?.assessment_template_id}/launch/${pa.assessment_instance_id}`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unlinkAssessment(pa.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Unlink
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {projectAssessments.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No assessments linked to this project yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
