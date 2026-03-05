import { useState, useEffect, useRef, useCallback } from "react";
import { ExternalLink, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SWOTCanvas } from "@/components/canvas/SWOTCanvas";
import { BusinessModelCanvas } from "@/components/canvas/BusinessModelCanvas";
import { SevenSCanvas } from "@/components/canvas/SevenSCanvas";
import { OperatingModelCanvas } from "@/components/canvas/OperatingModelCanvas";
import { TransformationRoadmap } from "@/components/canvas/TransformationRoadmap";
import { PrioritisationMatrix } from "@/components/canvas/PrioritisationMatrix";
import { Json } from "@/integrations/supabase/types";

interface EmbeddedToolProps {
  toolName: string;
  projectId: string;
  stepId: string;
  embedded?: boolean;
  onOpenExternal?: () => void;
}

type SaveOptions = { silent?: boolean };

// Map tool names to info about their components
const CANVAS_TOOLS = ["SWOT Analysis", "Business Model Canvas", "7S Framework", "Operating Model Canvas"];
const ROADMAP_TOOLS = ["Transformation Roadmap"];
const MATRIX_TOOLS = ["Prioritisation Matrix"];

export function EmbeddedTool({ 
  toolName, 
  projectId, 
  stepId, 
  embedded = true,
  onOpenExternal 
}: EmbeddedToolProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [toolId, setToolId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<Json | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveStatusTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchToolData = async () => {
      try {
        // First get the tool ID from consulting_tools
        const { data: toolData } = await supabase
          .from("consulting_tools")
          .select("id")
          .eq("name", toolName)
          .maybeSingle();

        if (toolData) {
          setToolId(toolData.id);

          // Then fetch existing data for this project/step/tool combination
          const { data: savedData } = await supabase
            .from("tool_data")
            .select("content_json")
            .eq("project_id", projectId)
            .eq("tool_id", toolData.id)
            .eq("step_id", stepId)
            .maybeSingle();

          if (savedData?.content_json) {
            setInitialData(savedData.content_json);
          }
        }
      } catch (error) {
        console.error("Error fetching tool data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchToolData();
  }, [toolName, projectId, stepId]);

  const handleSave = useCallback(async (data: unknown, options?: SaveOptions) => {
    if (!toolId) return;

    // Clear any existing timer
    if (saveStatusTimerRef.current) window.clearTimeout(saveStatusTimerRef.current);
    
    setSaveStatus("saving");

    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from("tool_data")
        .select("id")
        .eq("project_id", projectId)
        .eq("tool_id", toolId)
        .eq("step_id", stepId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("tool_data")
          .update({ content_json: JSON.parse(JSON.stringify(data)) })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("tool_data")
          .insert({
            project_id: projectId,
            tool_id: toolId,
            step_id: stepId,
            content_json: JSON.parse(JSON.stringify(data)),
          });
      }

      // Notify other parts of the app (AI context, etc.)
      window.dispatchEvent(new CustomEvent('tool-data-saved', { detail: { projectId, stepId, toolId } }));

      setSaveStatus("saved");
      saveStatusTimerRef.current = window.setTimeout(() => setSaveStatus("idle"), 2000);

      if (!options?.silent) {
        toast({ title: "Saved", description: `${toolName} saved to this step` });
      }
    } catch (error) {
      console.error("Error saving tool data:", error);
      setSaveStatus("error");
      saveStatusTimerRef.current = window.setTimeout(() => setSaveStatus("idle"), 3000);
      toast({ title: "Error saving", variant: "destructive" });
    }
  }, [toolId, projectId, stepId, toolName, toast]);

  const isCanvasTool = CANVAS_TOOLS.includes(toolName);
  const isRoadmapTool = ROADMAP_TOOLS.includes(toolName);
  const isMatrixTool = MATRIX_TOOLS.includes(toolName);
  const isSupported = isCanvasTool || isRoadmapTool || isMatrixTool;

  if (!isSupported) {
    // Tool not available for embedding - show link instead
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline">{toolName}</Badge>
            <span className="text-sm text-muted-foreground">Tool not available for embedding</span>
          </div>
          {onOpenExternal && (
            <Button variant="outline" size="sm" onClick={onOpenExternal}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Tool
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!embedded) {
    // Show compact link mode
    return (
      <Card className="border-dashed hover:border-primary/50 transition-colors">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{toolName}</Badge>
            <span className="text-sm text-muted-foreground">Click to open tool</span>
          </div>
          {onOpenExternal && (
            <Button variant="outline" size="sm" onClick={onOpenExternal}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Render the appropriate tool
  const renderTool = () => {
    if (isCanvasTool) {
      const CanvasComponent = {
        "SWOT Analysis": SWOTCanvas,
        "Business Model Canvas": BusinessModelCanvas,
        "7S Framework": SevenSCanvas,
        "Operating Model Canvas": OperatingModelCanvas,
      }[toolName]!;

        return (
          <CanvasComponent
            projectId={projectId}
            toolId={toolId || undefined}
            initialData={initialData as Record<string, any> | undefined}
            onSave={handleSave}
          />
        );
    }

    if (isRoadmapTool) {
        return (
          <TransformationRoadmap
            projectId={projectId}
            toolId={toolId || undefined}
            initialData={initialData as { items: any[]; tracks: string[] } | undefined}
            onSave={handleSave}
          />
        );
    }

    if (isMatrixTool) {
        return (
          <PrioritisationMatrix
            projectId={projectId}
            toolId={toolId || undefined}
            initialData={initialData as any}
            onSave={handleSave}
          />
        );
    }

    return null;
  };

  const renderSaveStatus = () => {
    switch (saveStatus) {
      case "saving":
        return (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        );
      case "saved":
        return (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3 w-3" />
            Saved
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            Error saving
          </span>
        );
      default:
        return (
          <span className="text-xs text-muted-foreground">Auto-saves</span>
        );
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Badge variant="secondary">{toolName}</Badge>
          {renderSaveStatus()}
        </CardTitle>
        {onOpenExternal && (
          <Button variant="ghost" size="sm" onClick={onOpenExternal}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {renderTool()}
      </CardContent>
    </Card>
  );
}
