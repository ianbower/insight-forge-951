import { CheckCircle2, Circle, PlayCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface WorkflowStep {
  id: string;
  title: string;
  status: string;
  order_index: number | null;
  tool_link: string | null;
  description?: string | null;
}

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  activeStepId: string | null;
  onStepClick: (step: WorkflowStep) => void;
}

export function WorkflowTimeline({ steps, activeStepId, onStepClick }: WorkflowTimelineProps) {
  const getStatusIcon = (status: string, isActive: boolean) => {
    const iconClass = cn("h-5 w-5 transition-transform", isActive && "scale-110");
    switch (status) {
      case "completed":
        return <CheckCircle2 className={cn(iconClass, "text-success")} />;
      case "in_progress":
        return <PlayCircle className={cn(iconClass, "text-warning")} />;
      default:
        return <Circle className={cn(iconClass, "text-muted-foreground")} />;
    }
  };

  const getStepStyles = (status: string, isActive: boolean) => {
    const base = "relative flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-all duration-300";
    
    if (isActive) {
      return cn(base, "bg-primary/10 border-2 border-primary shadow-lg scale-105");
    }
    
    switch (status) {
      case "completed":
        return cn(base, "bg-success/5 border border-success/20 hover:bg-success/10 hover:shadow-md");
      case "in_progress":
        return cn(base, "bg-warning/5 border border-warning/20 hover:bg-warning/10 hover:shadow-md");
      default:
        return cn(base, "bg-muted/30 border border-border hover:bg-muted/50 hover:shadow-md");
    }
  };

  const getConnectorStyles = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success";
      case "in_progress":
        return "bg-warning";
      default:
        return "bg-border";
    }
  };

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No workflow steps defined
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Horizontal scroll container */}
      <div className="overflow-x-auto overflow-y-visible pb-4 pt-4">
        <div className="flex items-start gap-2 min-w-max px-4">
          {steps.map((step, index) => {
            const isActive = step.id === activeStepId;
            const isLast = index === steps.length - 1;
            const tools = step.tool_link?.split(", ").filter(Boolean) || [];

            return (
              <div key={step.id} className="flex items-center">
                {/* Step Card */}
                <div
                  className={getStepStyles(step.status, isActive)}
                  onClick={() => onStepClick(step)}
                  style={{ minWidth: "160px", maxWidth: "200px" }}
                >
                  {/* Step Number Badge */}
                  <div
                    className={cn(
                      "absolute -top-2 -left-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-md transition-all",
                      step.status === "completed"
                        ? "bg-success text-success-foreground"
                        : step.status === "in_progress"
                        ? "bg-warning text-warning-foreground"
                        : "bg-muted-foreground text-muted",
                      isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                  >
                    {step.order_index || index + 1}
                  </div>

                  {/* Status Icon */}
                  <div className="mt-2">
                    {getStatusIcon(step.status, isActive)}
                  </div>

                  {/* Title */}
                  <p className={cn(
                    "text-sm font-medium text-center line-clamp-2",
                    isActive && "text-primary"
                  )}>
                    {step.title}
                  </p>

                  {/* Tools Preview */}
                  {tools.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center mt-1">
                      {tools.slice(0, 2).map((tool) => (
                        <Badge
                          key={tool}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {tool}
                        </Badge>
                      ))}
                      {tools.length > 2 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{tools.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Connector Arrow */}
                {!isLast && (
                  <div className="flex items-center px-1">
                    <div className={cn("h-0.5 w-6 transition-colors", getConnectorStyles(step.status))} />
                    <ChevronRight className={cn(
                      "h-4 w-4 -ml-1",
                      step.status === "completed" ? "text-success" : 
                      step.status === "in_progress" ? "text-warning" : "text-muted-foreground"
                    )} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span>{steps.filter(s => s.status === "completed").length} completed</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5">
          <PlayCircle className="h-4 w-4 text-warning" />
          <span>{steps.filter(s => s.status === "in_progress").length} in progress</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5">
          <Circle className="h-4 w-4 text-muted-foreground" />
          <span>{steps.filter(s => s.status === "pending").length} pending</span>
        </div>
      </div>
    </div>
  );
}
