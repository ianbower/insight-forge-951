import { useMemo } from "react";
import { CheckCircle2, PlayCircle, Circle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StepLayout, StepBlock } from "@/components/project/blocks/BlockTypes";

interface Task {
  id: string;
  title: string;
  status: string;
  order_index: number | null;
  tool_link: string | null;
  layout_json?: any;
}

interface StepPreviewPanelProps {
  tasks: Task[];
  currentStepId: string;
  projectId: string;
  onNavigate: (stepId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export function StepPreviewPanel({
  tasks,
  currentStepId,
  projectId,
  onNavigate,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
}: StepPreviewPanelProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-3 w-3 text-success" />;
      case "in_progress":
        return <PlayCircle className="h-3 w-3 text-warning" />;
      default:
        return <Circle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getBlockPreview = (block: StepBlock) => {
    switch (block.type) {
      case "heading":
        return <div className="h-1.5 bg-foreground/60 rounded w-3/4" />;
      case "text":
        return (
          <div className="space-y-0.5">
            <div className="h-1 bg-muted-foreground/30 rounded w-full" />
            <div className="h-1 bg-muted-foreground/30 rounded w-4/5" />
          </div>
        );
      case "tool":
        return <div className="h-6 bg-primary/20 rounded border border-primary/30" />;
      case "checklist":
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 border border-muted-foreground/50 rounded-sm" />
              <div className="h-1 bg-muted-foreground/30 rounded flex-1" />
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 bg-success/50 rounded-sm" />
              <div className="h-1 bg-muted-foreground/30 rounded flex-1" />
            </div>
          </div>
        );
      case "deliverables":
        return <div className="h-4 bg-success/10 rounded border border-success/20" />;
      case "ai-chat":
        return <div className="h-4 bg-primary/10 rounded border border-primary/20" />;
      case "notes":
        return <div className="h-3 bg-muted/50 rounded border border-border" />;
      case "divider":
        return <div className="h-px bg-border my-1" />;
      default:
        return <div className="h-2 bg-muted rounded" />;
    }
  };

  const renderMiniPreview = (task: Task) => {
    const layout = task.layout_json as StepLayout | null;
    const blocks = layout?.blocks || [];
    
    // Show up to 5 blocks in preview
    const previewBlocks = blocks.slice(0, 5);

    return (
      <div className="p-2 space-y-1">
        {previewBlocks.length > 0 ? (
          previewBlocks.map((block, i) => (
            <div key={i}>{getBlockPreview(block)}</div>
          ))
        ) : (
          <div className="text-[8px] text-muted-foreground text-center py-2">
            No layout
          </div>
        )}
        {blocks.length > 5 && (
          <div className="text-[8px] text-muted-foreground text-center">
            +{blocks.length - 5} more
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-48 flex flex-col border-r border-border bg-muted/30">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium">Steps</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onPrev}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onNext}
            disabled={!canGoNext}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Step List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {tasks.map((task, index) => {
            const isCurrent = task.id === currentStepId;
            
            return (
              <button
                key={task.id}
                onClick={() => onNavigate(task.id)}
                className={cn(
                  "w-full rounded-lg border transition-all text-left group",
                  isCurrent
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
                )}
              >
                {/* Step Header */}
                <div className="flex items-center gap-2 p-2 border-b border-border/50">
                  <Badge
                    variant={isCurrent ? "default" : "outline"}
                    className="h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                  >
                    {index + 1}
                  </Badge>
                  <span className={cn(
                    "text-xs truncate flex-1",
                    isCurrent && "font-medium"
                  )}>
                    {task.title}
                  </span>
                  {getStatusIcon(task.status)}
                </div>

                {/* Mini Preview */}
                <div className="min-h-[60px] bg-background/50">
                  {renderMiniPreview(task)}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
