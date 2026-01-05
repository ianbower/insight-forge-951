import { useState, useEffect } from "react";
import { Plus, GripVertical, Trash2, Save, X, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WorkflowStep {
  step: number;
  title: string;
  tools: string[];
}

interface Tool {
  id: string;
  name: string;
  category: string;
}

interface RunbookBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editRunbook?: {
    id: string;
    name: string;
    industry_focus: string | null;
    workflow_json: WorkflowStep[];
  } | null;
}

const INDUSTRY_OPTIONS = [
  "Cross-Industry",
  "Technology",
  "Financial Services",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Energy",
  "Telecommunications",
];

export default function RunbookBuilder({
  open,
  onOpenChange,
  onSuccess,
  editRunbook,
}: RunbookBuilderProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [industryFocus, setIndustryFocus] = useState("Cross-Industry");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [saving, setSaving] = useState(false);
  const [draggedStep, setDraggedStep] = useState<number | null>(null);

  useEffect(() => {
    const fetchTools = async () => {
      const { data, error } = await supabase
        .from("consulting_tools")
        .select("id, name, category")
        .order("category, name");

      if (!error && data) {
        setAvailableTools(data);
      }
    };
    fetchTools();
  }, []);

  useEffect(() => {
    if (editRunbook) {
      setName(editRunbook.name);
      setIndustryFocus(editRunbook.industry_focus || "Cross-Industry");
      const workflow = Array.isArray(editRunbook.workflow_json)
        ? editRunbook.workflow_json
        : [];
      setSteps(workflow);
    } else {
      setName("");
      setIndustryFocus("Cross-Industry");
      setSteps([]);
    }
  }, [editRunbook, open]);

  const addStep = () => {
    const newStep: WorkflowStep = {
      step: steps.length + 1,
      title: "",
      tools: [],
    };
    setSteps([...steps, newStep]);
  };

  const updateStepTitle = (index: number, title: string) => {
    const updated = [...steps];
    updated[index].title = title;
    setSteps(updated);
  };

  const removeStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index);
    // Renumber steps
    updated.forEach((step, i) => {
      step.step = i + 1;
    });
    setSteps(updated);
  };

  const toggleTool = (stepIndex: number, toolName: string) => {
    const updated = [...steps];
    const toolIndex = updated[stepIndex].tools.indexOf(toolName);
    if (toolIndex === -1) {
      updated[stepIndex].tools.push(toolName);
    } else {
      updated[stepIndex].tools.splice(toolIndex, 1);
    }
    setSteps(updated);
  };

  const handleDragStart = (index: number) => {
    setDraggedStep(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedStep === null || draggedStep === index) return;

    const updated = [...steps];
    const [removed] = updated.splice(draggedStep, 1);
    updated.splice(index, 0, removed);
    // Renumber steps
    updated.forEach((step, i) => {
      step.step = i + 1;
    });
    setSteps(updated);
    setDraggedStep(index);
  };

  const handleDragEnd = () => {
    setDraggedStep(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a runbook name.",
        variant: "destructive",
      });
      return;
    }

    if (steps.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one step.",
        variant: "destructive",
      });
      return;
    }

    const emptySteps = steps.filter((s) => !s.title.trim());
    if (emptySteps.length > 0) {
      toast({
        title: "Validation Error",
        description: "All steps must have a title.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editRunbook) {
        const { error } = await supabase
          .from("runbook_templates")
          .update({
            name: name.trim(),
            industry_focus: industryFocus,
            workflow_json: JSON.parse(JSON.stringify(steps)),
          })
          .eq("id", editRunbook.id);

        if (error) throw error;

        toast({
          title: "Runbook Updated",
          description: `"${name}" has been updated successfully.`,
        });
      } else {
        const { error } = await supabase.from("runbook_templates").insert([{
          name: name.trim(),
          industry_focus: industryFocus,
          workflow_json: JSON.parse(JSON.stringify(steps)),
        }]);

        if (error) throw error;

        toast({
          title: "Runbook Created",
          description: `"${name}" has been created successfully.`,
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving runbook:", error);
      toast({
        title: "Error",
        description: "Failed to save runbook. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Group tools by category
  const toolsByCategory = availableTools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editRunbook ? "Edit Runbook" : "Create New Runbook"}
          </DialogTitle>
          <DialogDescription>
            Define the workflow steps and assign tools to each step.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="runbookName">Runbook Name</Label>
              <Input
                id="runbookName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Digital Transformation Strategy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry Focus</Label>
              <Select value={industryFocus} onValueChange={setIndustryFocus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Workflow Steps</Label>
              <Button onClick={addStep} size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Step
              </Button>
            </div>

            {steps.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="text-muted-foreground">
                  No steps added yet. Click "Add Step" to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-lg border border-border bg-card p-4 transition-all ${
                      draggedStep === index ? "opacity-50 scale-[0.98]" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground" />
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {step.step}
                        </div>
                      </div>

                      <div className="flex-1 space-y-3">
                        <Input
                          value={step.title}
                          onChange={(e) => updateStepTitle(index, e.target.value)}
                          placeholder="Step title..."
                          className="font-medium"
                        />

                        {/* Tool Selection */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Wrench className="h-4 w-4" />
                            <span>Assign tools to this step:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(toolsByCategory).map(([category, tools]) => (
                              <div key={category} className="flex flex-wrap gap-1">
                                {tools.map((tool) => {
                                  const isSelected = step.tools.includes(tool.name);
                                  return (
                                    <Badge
                                      key={tool.id}
                                      variant={isSelected ? "default" : "outline"}
                                      className="cursor-pointer transition-all hover:scale-105"
                                      onClick={() => toggleTool(index, tool.name)}
                                    >
                                      {tool.name}
                                    </Badge>
                                  );
                                })}
                              </div>
                            ))}
                            {availableTools.length === 0 && (
                              <span className="text-xs text-muted-foreground">
                                No tools available
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStep(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : editRunbook ? "Update Runbook" : "Create Runbook"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
