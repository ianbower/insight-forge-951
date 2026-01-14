import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isAfter, isBefore, isToday } from "date-fns";
import { CheckCircle2, Circle, AlertCircle, Clock, Plus } from "lucide-react";

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  target_date: string;
  completed_date?: string;
  status: "upcoming" | "at_risk" | "completed" | "missed";
  order_index: number;
}

interface MilestoneTimelineProps {
  milestones: Milestone[];
  onAddMilestone?: () => void;
  onEditMilestone?: (milestone: Milestone) => void;
  compact?: boolean;
}

const statusConfig = {
  upcoming: {
    icon: Circle,
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    border: "border-blue-500/30",
    label: "Upcoming",
  },
  at_risk: {
    icon: AlertCircle,
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    border: "border-amber-500/30",
    label: "At Risk",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/30",
    label: "Completed",
  },
  missed: {
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-500/20",
    border: "border-red-500/30",
    label: "Missed",
  },
};

export function MilestoneTimeline({ milestones, onAddMilestone, onEditMilestone, compact = false }: MilestoneTimelineProps) {
  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
  );

  const getDaysLabel = (targetDate: string, completedDate?: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    
    if (completedDate) {
      return `Completed ${format(new Date(completedDate), "MMM d")}`;
    }
    
    const diff = differenceInDays(target, today);
    if (diff === 0) return "Due today";
    if (diff < 0) return `${Math.abs(diff)} days overdue`;
    return `${diff} days remaining`;
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {sortedMilestones.slice(0, 5).map((milestone) => {
          const config = statusConfig[milestone.status];
          const Icon = config.icon;
          
          return (
            <div
              key={milestone.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onEditMilestone?.(milestone)}
            >
              <Icon className={cn("h-4 w-4", config.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{milestone.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(milestone.target_date), "MMM d, yyyy")}
                </p>
              </div>
              <Badge variant="outline" className={cn("text-xs", config.bg, config.color, config.border)}>
                {config.label}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Project Milestones</h3>
        {onAddMilestone && (
          <Button variant="outline" size="sm" onClick={onAddMilestone} className="gap-1">
            <Plus className="h-4 w-4" />
            Add Milestone
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-4">
          {sortedMilestones.map((milestone, idx) => {
            const config = statusConfig[milestone.status];
            const Icon = config.icon;
            
            return (
              <div
                key={milestone.id}
                className={cn(
                  "relative pl-10 group cursor-pointer",
                  "animate-in fade-in slide-in-from-left-2"
                )}
                style={{ animationDelay: `${idx * 100}ms` }}
                onClick={() => onEditMilestone?.(milestone)}
              >
                {/* Timeline Node */}
                <div className={cn(
                  "absolute left-2 top-2 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-110",
                  config.bg,
                  config.border
                )}>
                  <Icon className={cn("h-3 w-3", config.color)} />
                </div>

                {/* Milestone Card */}
                <div className={cn(
                  "p-4 rounded-lg border transition-all",
                  "bg-card/50 hover:bg-card hover:shadow-md",
                  "border-border/50 hover:border-primary/30"
                )}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium">{milestone.title}</h4>
                      {milestone.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className={cn("shrink-0", config.bg, config.color, config.border)}>
                      {config.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(milestone.target_date), "MMM d, yyyy")}
                    </div>
                    <span className={cn(
                      "text-xs",
                      milestone.status === "at_risk" && "text-amber-400",
                      milestone.status === "missed" && "text-red-400",
                      milestone.status === "completed" && "text-emerald-400"
                    )}>
                      {getDaysLabel(milestone.target_date, milestone.completed_date)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {sortedMilestones.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No milestones defined yet</p>
          {onAddMilestone && (
            <Button variant="link" size="sm" onClick={onAddMilestone} className="mt-2">
              Add your first milestone
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
