import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Plus,
  GripVertical,
  Trash2,
  Layout,
  CheckSquare,
  Wrench,
  ChevronRight,
  Wand2,
  FileText,
  Type,
  Image,
  Video,
  Minus,
  ListChecks,
  FormInput,
  BarChart3,
  MessageSquare,
  StickyNote,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  StepBlock,
  StepLayout,
  BlockType,
  LAYOUT_TEMPLATES,
} from "@/components/project/blocks/BlockTypes";
import LayoutWizard from "@/components/runbooks/LayoutWizard";

interface WorkflowStep {
  step: number;
  title: string;
  description?: string;
  tools: string[];
  deliverables: string[];
  layout?: StepLayout;
}

interface Tool {
  id: string;
  name: string;
  category: string;
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

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: "heading", label: "Heading", icon: <Type className="h-4 w-4" /> },
  { type: "text", label: "Text", icon: <FileText className="h-4 w-4" /> },
  { type: "image", label: "Image", icon: <Image className="h-4 w-4" /> },
  { type: "video", label: "Video", icon: <Video className="h-4 w-4" /> },
  { type: "divider", label: "Divider", icon: <Minus className="h-4 w-4" /> },
  { type: "tool", label: "Tool", icon: <Wrench className="h-4 w-4" /> },
  { type: "checklist", label: "Checklist", icon: <ListChecks className="h-4 w-4" /> },
  { type: "form", label: "Form", icon: <FormInput className="h-4 w-4" /> },
  { type: "poll", label: "Poll", icon: <BarChart3 className="h-4 w-4" /> },
  { type: "ai-chat", label: "AI Chat", icon: <MessageSquare className="h-4 w-4" /> },
  { type: "deliverables", label: "Deliverables", icon: <CheckSquare className="h-4 w-4" /> },
  { type: "notes", label: "Notes", icon: <StickyNote className="h-4 w-4" /> },
];

export default function RunbookDesigner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [industryFocus, setIndustryFocus] = useState("Cross-Industry");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [stepLayouts, setStepLayouts] = useState<Record<string, StepLayout>>({});
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState("");

  // Fetch runbook data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: tools } = await supabase
          .from("consulting_tools")
          .select("id, name, category")
          .order("category, name");
        
        if (tools) setAvailableTools(tools);

        if (!isNew && id) {
          const { data: runbook, error } = await supabase
            .from("runbook_templates")
            .select("*")
            .eq("id", id)
            .single();

          if (error) throw error;
          if (runbook) {
            setName(runbook.name);
            setIndustryFocus(runbook.industry_focus || "Cross-Industry");
            const workflow = Array.isArray(runbook.workflow_json)
              ? runbook.workflow_json.map((step: any) => ({
                  ...step,
                  deliverables: step.deliverables || [],
                  description: step.description || "",
                }))
              : [];
            setSteps(workflow);
            setStepLayouts((runbook.step_layouts as unknown as Record<string, StepLayout>) || {});
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load runbook data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isNew, toast]);

  const currentStep = steps[selectedStepIndex];
  const currentLayout = stepLayouts[`step_${selectedStepIndex}`] || {
    blocks: [],
    theme: "default" as const,
  };

  // Step management
  const addStep = useCallback(() => {
    const newStep: WorkflowStep = {
      step: steps.length + 1,
      title: `Step ${steps.length + 1}`,
      description: "",
      tools: [],
      deliverables: [],
    };
    setSteps((prev) => [...prev, newStep]);
    setSelectedStepIndex(steps.length);
  }, [steps.length]);

  const updateStep = useCallback((index: number, updates: Partial<WorkflowStep>) => {
    setSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  }, []);

  const removeStep = useCallback((index: number) => {
    setSteps((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      updated.forEach((step, i) => (step.step = i + 1));
      return updated;
    });
    if (selectedStepIndex >= index && selectedStepIndex > 0) {
      setSelectedStepIndex((prev) => prev - 1);
    }
  }, [selectedStepIndex]);

  const moveStep = useCallback((fromIndex: number, toIndex: number) => {
    setSteps((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, removed);
      updated.forEach((step, i) => (step.step = i + 1));
      return updated;
    });
    setSelectedStepIndex(toIndex);
  }, []);

  // Deliverables management
  const addDeliverable = useCallback(() => {
    if (!newDeliverable.trim() || selectedStepIndex < 0) return;
    updateStep(selectedStepIndex, {
      deliverables: [...(currentStep?.deliverables || []), newDeliverable.trim()],
    });
    setNewDeliverable("");
  }, [newDeliverable, selectedStepIndex, currentStep, updateStep]);

  const removeDeliverable = useCallback((deliverableIndex: number) => {
    if (!currentStep) return;
    updateStep(selectedStepIndex, {
      deliverables: currentStep.deliverables.filter((_, i) => i !== deliverableIndex),
    });
  }, [currentStep, selectedStepIndex, updateStep]);

  // Tool management
  const toggleTool = useCallback((toolName: string) => {
    if (!currentStep) return;
    const tools = currentStep.tools.includes(toolName)
      ? currentStep.tools.filter((t) => t !== toolName)
      : [...currentStep.tools, toolName];
    updateStep(selectedStepIndex, { tools });
  }, [currentStep, selectedStepIndex, updateStep]);

  // Block management
  const addBlock = useCallback((type: BlockType) => {
    const newBlock: StepBlock = createBlock(type, currentLayout.blocks.length);
    const updatedLayout: StepLayout = {
      ...currentLayout,
      blocks: [...currentLayout.blocks, newBlock],
    };
    setStepLayouts((prev) => ({
      ...prev,
      [`step_${selectedStepIndex}`]: updatedLayout,
    }));
  }, [currentLayout, selectedStepIndex]);

  const removeBlock = useCallback((blockId: string) => {
    const updatedBlocks = currentLayout.blocks
      .filter((b) => b.id !== blockId)
      .map((b, i) => ({ ...b, order: i }));
    setStepLayouts((prev) => ({
      ...prev,
      [`step_${selectedStepIndex}`]: { ...currentLayout, blocks: updatedBlocks },
    }));
  }, [currentLayout, selectedStepIndex]);

  const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
    const blocks = [...currentLayout.blocks];
    const [removed] = blocks.splice(fromIndex, 1);
    blocks.splice(toIndex, 0, removed);
    blocks.forEach((b, i) => (b.order = i));
    setStepLayouts((prev) => ({
      ...prev,
      [`step_${selectedStepIndex}`]: { ...currentLayout, blocks },
    }));
  }, [currentLayout, selectedStepIndex]);

  // Apply layout from wizard
  const handleApplyLayout = useCallback((stepIndex: number, layout: StepLayout) => {
    setStepLayouts((prev) => ({
      ...prev,
      [`step_${stepIndex}`]: layout,
    }));
  }, []);

  // Save runbook
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

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        industry_focus: industryFocus,
        workflow_json: JSON.parse(JSON.stringify(steps)),
        step_layouts: JSON.parse(JSON.stringify(stepLayouts)),
      };

      if (isNew) {
        const { error } = await supabase.from("runbook_templates").insert([payload]);
        if (error) throw error;
        toast({ title: "Runbook Created", description: `"${name}" has been created.` });
      } else {
        const { error } = await supabase
          .from("runbook_templates")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        toast({ title: "Runbook Updated", description: `"${name}" has been updated.` });
      }

      navigate("/runbooks");
    } catch (error) {
      console.error("Error saving runbook:", error);
      toast({
        title: "Error",
        description: "Failed to save runbook.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Group tools by category
  const toolsByCategory = availableTools.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/runbooks")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Runbook name..."
                className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0"
              />
              <div className="flex items-center gap-2 mt-1">
                <Select value={industryFocus} onValueChange={setIndustryFocus}>
                  <SelectTrigger className="h-7 text-xs w-auto border-none bg-muted">
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
                <span className="text-xs text-muted-foreground">
                  {steps.length} step{steps.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Runbook"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Steps Sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-border bg-muted/30 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Workflow Steps</h3>
              <Button size="sm" variant="outline" onClick={addStep} className="h-7 gap-1">
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {steps.map((step, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("stepIndex", index.toString())}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const fromIndex = parseInt(e.dataTransfer.getData("stepIndex"));
                    if (fromIndex !== index) moveStep(fromIndex, index);
                  }}
                  onClick={() => setSelectedStepIndex(index)}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-all",
                    selectedStepIndex === index
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <GripVertical className="h-4 w-4 opacity-50 cursor-grab flex-shrink-0" />
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background/20 text-xs font-bold flex-shrink-0">
                    {step.step}
                  </div>
                  <span className="flex-1 truncate text-sm font-medium">{step.title}</span>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </div>
              ))}
              {steps.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No steps yet. Click "Add" to get started.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Step Designer */}
        {currentStep ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Canvas Preview */}
            <div className="flex-1 overflow-auto p-6 bg-muted/10">
              <Card className="max-w-4xl mx-auto">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Input
                        value={currentStep.title}
                        onChange={(e) => updateStep(selectedStepIndex, { title: e.target.value })}
                        placeholder="Step title..."
                        className="text-xl font-semibold border-none p-0 h-auto focus-visible:ring-0"
                      />
                      <Textarea
                        value={currentStep.description || ""}
                        onChange={(e) => updateStep(selectedStepIndex, { description: e.target.value })}
                        placeholder="Add a description for this step..."
                        className="mt-2 text-sm text-muted-foreground border-none p-0 resize-none focus-visible:ring-0 min-h-[60px]"
                      />
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWizardOpen(true)}
                        className="gap-2"
                      >
                        <Wand2 className="h-4 w-4" />
                        AI Layout
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStep(selectedStepIndex)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Layout Blocks Preview */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Layout className="h-4 w-4" />
                        Page Layout
                      </Label>
                      {currentLayout.blocks.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {currentLayout.blocks.length} block{currentLayout.blocks.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    
                    {currentLayout.blocks.length > 0 ? (
                      <div className="space-y-2 rounded-lg border border-dashed border-border p-4 bg-muted/20">
                        {currentLayout.blocks.map((block, index) => (
                          <div
                            key={block.id}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("blockIndex", index.toString())}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              const fromIndex = parseInt(e.dataTransfer.getData("blockIndex"));
                              if (!isNaN(fromIndex) && fromIndex !== index) moveBlock(fromIndex, index);
                            }}
                            className="flex items-center gap-3 rounded-md border border-border bg-background p-3 group"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                              {BLOCK_TYPES.find((bt) => bt.type === block.type)?.icon}
                            </div>
                            <span className="flex-1 text-sm font-medium capitalize">
                              {block.type.replace("-", " ")}
                              {"toolName" in block && block.toolName && (
                                <span className="text-muted-foreground ml-2">({block.toolName})</span>
                              )}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeBlock(block.id)}
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-8 text-center bg-muted/20">
                        <Eye className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          No blocks configured. Add blocks or use AI to generate a layout.
                        </p>
                      </div>
                    )}

                    {/* Add Block Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {BLOCK_TYPES.map((bt) => (
                        <Button
                          key={bt.type}
                          variant="outline"
                          size="sm"
                          onClick={() => addBlock(bt.type)}
                          className="gap-2 text-xs"
                        >
                          {bt.icon}
                          {bt.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Deliverables */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      Deliverables
                    </Label>
                    <div className="space-y-2">
                      {currentStep.deliverables.map((deliverable, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 group"
                        >
                          <CheckSquare className="h-4 w-4 text-primary" />
                          <span className="flex-1 text-sm">{deliverable}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDeliverable(index)}
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          value={newDeliverable}
                          onChange={(e) => setNewDeliverable(e.target.value)}
                          placeholder="Add a deliverable..."
                          onKeyDown={(e) => e.key === "Enter" && addDeliverable()}
                          className="flex-1"
                        />
                        <Button onClick={addDeliverable} size="sm" variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Tools */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Assigned Tools
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(toolsByCategory).map(([category, tools]) => (
                        <div key={category} className="flex flex-wrap gap-1.5">
                          {tools.map((tool) => {
                            const isSelected = currentStep.tools.includes(tool.name);
                            return (
                              <Badge
                                key={tool.id}
                                variant={isSelected ? "default" : "outline"}
                                className="cursor-pointer transition-all hover:scale-105"
                                onClick={() => toggleTool(tool.name)}
                              >
                                {tool.name}
                              </Badge>
                            );
                          })}
                        </div>
                      ))}
                      {availableTools.length === 0 && (
                        <span className="text-sm text-muted-foreground">No tools available</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Template Sidebar */}
            <div className="w-72 flex-shrink-0 border-l border-border bg-muted/30 overflow-auto">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-sm">Layout Templates</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Quick-start layouts for common step types
                </p>
              </div>
              <div className="p-4 space-y-3">
                {Object.entries(LAYOUT_TEMPLATES).map(([key, template]) => (
                  <Card
                    key={key}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() =>
                      handleApplyLayout(selectedStepIndex, {
                        blocks: template.blocks as StepBlock[],
                        theme: "default",
                      })
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Layout className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10">
            <div className="text-center">
              <Layout className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg">No Step Selected</h3>
              <p className="text-muted-foreground mt-2">
                Add a step to start designing your runbook workflow
              </p>
              <Button onClick={addStep} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Add First Step
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Layout Wizard */}
      <LayoutWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        stepTitle={currentStep?.title || ""}
        stepIndex={selectedStepIndex}
        runbookName={name}
        industry={industryFocus}
        tools={currentStep?.tools || []}
        currentLayout={currentLayout.blocks.length > 0 ? currentLayout : undefined}
        onApplyLayout={handleApplyLayout}
      />
    </div>
  );
}

// Helper to create a new block
function createBlock(type: BlockType, order: number): StepBlock {
  const id = `${type}-${Date.now()}`;
  const base = { id, order };

  switch (type) {
    case "heading":
      return { ...base, type, content: "", level: 1 };
    case "text":
      return { ...base, type, content: "" };
    case "image":
      return { ...base, type, url: "", caption: "" };
    case "video":
      return { ...base, type, url: "", caption: "" };
    case "divider":
      return { ...base, type };
    case "tool":
      return { ...base, type, toolName: "", embedded: true };
    case "checklist":
      return { ...base, type, title: "Checklist", items: [] };
    case "form":
      return { ...base, type, title: "Form", fields: [] };
    case "poll":
      return { ...base, type, question: "", options: [], allowMultiple: false };
    case "ai-chat":
      return { ...base, type, contextPrompt: "" };
    case "deliverables":
      return { ...base, type };
    case "notes":
      return { ...base, type };
    default:
      return { ...base, type: "text", content: "" };
  }
}
