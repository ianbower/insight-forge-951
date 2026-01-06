import { useState, useEffect } from "react";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Wrench, 
  Bot, 
  StickyNote,
  CheckCircle2,
  PlayCircle,
  Circle,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StepAIChat } from "./StepAIChat";

export interface StepDetail {
  id: string;
  title: string;
  status: string;
  order_index: number | null;
  tool_link: string | null;
  description?: string | null;
  notes_json?: any[];
  deliverables?: any[];
}

interface StepDetailPanelProps {
  step: StepDetail | null;
  projectId: string;
  projectName: string;
  clientName?: string;
  totalSteps: number;
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  onStatusChange: (stepId: string, status: string) => void;
  onOpenTool: (toolName: string) => void;
}

export function StepDetailPanel({
  step,
  projectId,
  projectName,
  clientName,
  totalSteps,
  currentIndex,
  onClose,
  onNavigate,
  onStatusChange,
  onOpenTool,
}: StepDetailPanelProps) {
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (step) {
      setDescription(step.description || "");
      const notesArray = step.notes_json || [];
      setNotes(notesArray.length > 0 ? notesArray.map((n: any) => n.text || n).join("\n") : "");
    }
  }, [step]);

  if (!step) return null;

  const tools = step.tool_link?.split(", ").filter(Boolean) || [];

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      const notesArray = notes.split("\n").filter(Boolean).map(text => ({ 
        text, 
        timestamp: new Date().toISOString() 
      }));
      
      const { error } = await supabase
        .from("project_tasks")
        .update({ 
          description,
          notes_json: notesArray 
        })
        .eq("id", step.id);

      if (error) throw error;
      toast({ title: "Notes saved" });
    } catch (error) {
      toast({ title: "Error saving notes", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "in_progress":
        return <PlayCircle className="h-4 w-4 text-warning" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Completed";
      case "in_progress": return "In Progress";
      default: return "Pending";
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Step {currentIndex + 1} of {totalSteps}
              </Badge>
              {getStatusIcon(step.status)}
              <span className="text-sm text-muted-foreground">
                {getStatusLabel(step.status)}
              </span>
            </div>
            <h2 className="font-display font-semibold text-lg mt-1">{step.title}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate("prev")}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate("next")}
            disabled={currentIndex === totalSteps - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Actions */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/10">
        <span className="text-sm text-muted-foreground mr-2">Set status:</span>
        {["pending", "in_progress", "completed"].map((status) => (
          <Button
            key={status}
            variant={step.status === status ? "default" : "outline"}
            size="sm"
            onClick={() => onStatusChange(step.id, status)}
            className={cn(
              "capitalize",
              step.status === status && status === "completed" && "bg-success hover:bg-success/90",
              step.status === status && status === "in_progress" && "bg-warning hover:bg-warning/90"
            )}
          >
            {status.replace("_", " ")}
          </Button>
        ))}
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-6 mt-4 justify-start bg-muted/50">
          <TabsTrigger value="overview" className="gap-2">
            <FileText className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2">
            <Wrench className="h-4 w-4" />
            Tools ({tools.length})
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Bot className="h-4 w-4" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <StickyNote className="h-4 w-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          {/* Overview Tab */}
          <TabsContent value="overview" className="h-full m-0 p-6 overflow-auto">
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the objectives and scope of this step..."
                  className="mt-2 min-h-[120px]"
                />
              </div>

              {tools.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Assigned Tools</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tools.map((tool) => (
                      <Badge key={tool} variant="secondary" className="gap-1">
                        <Wrench className="h-3 w-3" />
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Expected Deliverables</label>
                <div className="mt-2 p-4 rounded-lg bg-muted/30 border border-border">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {(step.deliverables && (step.deliverables as any[]).length > 0) ? (
                      (step.deliverables as any[]).map((d: any, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                          {typeof d === 'string' ? d : d.text || d.name}
                        </li>
                      ))
                    ) : (
                      <li className="italic">No deliverables defined yet</li>
                    )}
                  </ul>
                </div>
              </div>

              <Button onClick={handleSaveNotes} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="h-full m-0 p-6 overflow-auto">
            {tools.length > 0 ? (
              <div className="grid gap-4">
                {tools.map((tool) => (
                  <div
                    key={tool}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Wrench className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{tool}</p>
                        <p className="text-sm text-muted-foreground">
                          Open canvas to work on this tool
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => onOpenTool(tool)} className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Open Canvas
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Wrench className="h-12 w-12 mb-4 opacity-30" />
                <p>No tools assigned to this step</p>
                <p className="text-sm">Tools can be assigned when editing the runbook</p>
              </div>
            )}
          </TabsContent>

          {/* AI Assistant Tab */}
          <TabsContent value="ai" className="h-full m-0 overflow-hidden">
            <StepAIChat 
              stepTitle={step.title}
              projectName={projectName}
              clientName={clientName}
              tools={tools}
            />
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="h-full m-0 p-6 overflow-auto">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Working Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes, observations, and key findings..."
                  className="mt-2 min-h-[300px] font-mono text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Notes are saved with the step and visible to your team
                </p>
                <Button onClick={handleSaveNotes} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Notes"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
