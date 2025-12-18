import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Play, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RunbookTemplate {
  id: string;
  name: string;
  industry_focus: string | null;
  workflow_json: any;
}

interface Client {
  id: string;
  name: string;
}

const mockRunbooks: RunbookTemplate[] = [
  {
    id: "1",
    name: "Digital Transformation Strategy",
    industry_focus: "Cross-Industry",
    workflow_json: [
      { step: 1, title: "Current State Assessment", tools: ["SWOT", "Operating Model Canvas"] },
      { step: 2, title: "Vision & Strategy Definition", tools: ["Business Model Canvas"] },
      { step: 3, title: "Roadmap Development", tools: ["Transformation Roadmap"] },
      { step: 4, title: "Implementation Planning", tools: ["7S Framework"] },
    ],
  },
  {
    id: "2",
    name: "Post-Merger Integration",
    industry_focus: "Financial Services",
    workflow_json: [
      { step: 1, title: "Due Diligence Review", tools: ["SWOT"] },
      { step: 2, title: "Synergy Identification", tools: ["Operating Model Canvas"] },
      { step: 3, title: "Integration Roadmap", tools: ["Transformation Roadmap"] },
      { step: 4, title: "Day 1 Planning", tools: ["7S Framework"] },
    ],
  },
  {
    id: "3",
    name: "Operating Model Redesign",
    industry_focus: "Technology",
    workflow_json: [
      { step: 1, title: "As-Is Analysis", tools: ["Operating Model Canvas", "7S Framework"] },
      { step: 2, title: "Target State Design", tools: ["Operating Model Canvas"] },
      { step: 3, title: "Gap Analysis", tools: ["SWOT"] },
      { step: 4, title: "Transition Planning", tools: ["Transformation Roadmap"] },
    ],
  },
  {
    id: "4",
    name: "Market Entry Strategy",
    industry_focus: "Cross-Industry",
    workflow_json: [
      { step: 1, title: "Market Analysis", tools: ["SWOT", "Porter's Five Forces"] },
      { step: 2, title: "Business Model Design", tools: ["Business Model Canvas"] },
      { step: 3, title: "Go-to-Market Planning", tools: ["Transformation Roadmap"] },
    ],
  },
];

export default function Runbooks() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [runbooks, setRunbooks] = useState<RunbookTemplate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRunbook, setExpandedRunbook] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRunbook, setSelectedRunbook] = useState<RunbookTemplate | null>(null);
  const [projectName, setProjectName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [runbooksRes, clientsRes] = await Promise.all([
          supabase.from("runbook_templates").select("*").order("name"),
          supabase.from("clients").select("id, name").order("name"),
        ]);

        if (runbooksRes.error) throw runbooksRes.error;
        if (clientsRes.error) throw clientsRes.error;

        setRunbooks(runbooksRes.data || []);
        setClients(clientsRes.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const displayRunbooks = runbooks.length > 0 ? runbooks : mockRunbooks;

  const handleStartEngagement = (runbook: RunbookTemplate) => {
    setSelectedRunbook(runbook);
    setProjectName(`${runbook.name} - ${new Date().toLocaleDateString()}`);
    setShowDialog(true);
  };

  const handleCreateProject = async () => {
    if (!selectedRunbook || !projectName.trim()) return;

    setCreating(true);
    try {
      // Create project with runbook reference
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: projectName,
          client_id: selectedClientId || null,
          runbook_id: selectedRunbook.id !== "1" && selectedRunbook.id !== "2" && selectedRunbook.id !== "3" && selectedRunbook.id !== "4" 
            ? selectedRunbook.id 
            : null,
          status: "Active",
          progress_percentage: 0,
          start_date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create tasks from runbook workflow
      const workflow = Array.isArray(selectedRunbook.workflow_json)
        ? selectedRunbook.workflow_json
        : [];

      if (workflow.length > 0 && project) {
        const tasks = workflow.map((step: any, index: number) => ({
          project_id: project.id,
          title: step.title,
          status: index === 0 ? "in_progress" : "pending",
          order_index: step.step || index + 1,
          tool_link: step.tools?.join(", ") || null,
        }));

        const { error: tasksError } = await supabase
          .from("project_tasks")
          .insert(tasks);

        if (tasksError) throw tasksError;
      }

      // Log activity
      await supabase.from("activity_feed").insert({
        action: "started engagement",
        target: projectName,
        user_name: "Consultant",
        project_id: project.id,
      });

      toast({
        title: "Engagement Started",
        description: `${projectName} has been created with ${workflow.length} tasks.`,
      });

      setShowDialog(false);
      navigate("/projects");
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "Failed to create engagement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">
          Runbooks
        </h1>
        <p className="text-muted-foreground mt-1">
          Pre-built engagement templates with proven methodologies
        </p>
      </div>

      {/* Runbooks Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {displayRunbooks.map((runbook, index) => {
          const workflow = Array.isArray(runbook.workflow_json)
            ? runbook.workflow_json
            : [];
          const isExpanded = expandedRunbook === runbook.id;

          return (
            <div
              key={runbook.id}
              className="group rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-card-lg animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Header */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold font-display">{runbook.name}</h3>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {runbook.industry_focus || "Cross-Industry"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {workflow.length} steps
                  </div>
                </div>

                {/* Workflow Preview */}
                <div className="mt-6">
                  <button
                    onClick={() =>
                      setExpandedRunbook(isExpanded ? null : runbook.id)
                    }
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {isExpanded ? "Hide workflow" : "View workflow"}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 animate-fade-in">
                      {workflow.map((step: any, stepIndex: number) => (
                        <div
                          key={stepIndex}
                          className="flex items-start gap-3 rounded-lg bg-muted/50 p-3"
                        >
                          <div
                            className={cn(
                              "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              "bg-primary text-primary-foreground"
                            )}
                          >
                            {step.step}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{step.title}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {step.tools?.map((tool: string) => (
                                <Badge
                                  key={tool}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {tool}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-border bg-muted/30 px-6 py-4">
                <Button
                  onClick={() => handleStartEngagement(runbook)}
                  className="w-full gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start Engagement
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Engagement Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Engagement</DialogTitle>
            <DialogDescription>
              Create a new project using the "{selectedRunbook?.name}" template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client (Optional)</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={creating || !projectName.trim()}>
              {creating ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
