import { useState, useEffect } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
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
import { Json } from "@/integrations/supabase/types";

interface EmbeddedToolProps {
  toolName: string;
  projectId: string;
  stepId: string;
  embedded?: boolean;
  onOpenExternal?: () => void;
}

// Map tool names to info about their components
const CANVAS_TOOLS = ["SWOT Analysis", "Business Model Canvas", "7S Framework", "Operating Model Canvas"];
const ROADMAP_TOOLS = ["Transformation Roadmap"];

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

  const handleSave = async (data: unknown) => {
    if (!toolId) return;

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

      toast({ title: "Tool data saved", description: `${toolName} data saved to this step` });
    } catch (error) {
      console.error("Error saving tool data:", error);
      toast({ title: "Error saving", variant: "destructive" });
    }
  };

  const isCanvasTool = CANVAS_TOOLS.includes(toolName);
  const isRoadmapTool = ROADMAP_TOOLS.includes(toolName);
  const isSupported = isCanvasTool || isRoadmapTool;

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

    return null;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Badge variant="secondary">{toolName}</Badge>
          <span className="text-xs text-muted-foreground">Auto-saves to this step</span>
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
