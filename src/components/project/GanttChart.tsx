import { useMemo, useState } from "react";
import { format, differenceInDays, addDays, startOfWeek, endOfWeek, eachWeekOfInterval, isWithinInterval, isBefore, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar, Flag, CheckCircle2, AlertTriangle } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Task {
  id: string;
  title: string;
  status: string;
  order_index?: number | null;
}

interface Milestone {
  id: string;
  title: string;
  target_date: string;
  completed_date?: string | null;
  status: string;
  description?: string | null;
}

interface GanttChartProps {
  tasks: Task[];
  milestones: Milestone[];
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  onMilestoneClick?: (milestone: Milestone) => void;
  onTaskClick?: (task: Task) => void;
}

const statusColors: Record<string, string> = {
  completed: "bg-emerald-500",
  in_progress: "bg-blue-500",
  todo: "bg-muted",
  upcoming: "bg-muted",
  at_risk: "bg-amber-500",
  missed: "bg-red-500",
};

export function GanttChart({
  tasks,
  milestones,
  projectStartDate,
  projectEndDate,
  onMilestoneClick,
  onTaskClick,
}: GanttChartProps) {
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = week view, 2 = biweekly, 0.5 = days
  const [viewOffset, setViewOffset] = useState(0);

  const { chartStart, chartEnd, weeks, totalDays } = useMemo(() => {
    const now = new Date();
    let start = projectStartDate ? new Date(projectStartDate) : now;
    let end = projectEndDate ? new Date(projectEndDate) : addDays(now, 90);

    // Extend to include all milestones
    milestones.forEach((m) => {
      const mDate = new Date(m.target_date);
      if (isBefore(mDate, start)) start = mDate;
      if (isAfter(mDate, end)) end = mDate;
    });

    // Add padding
    start = startOfWeek(addDays(start, -7));
    end = endOfWeek(addDays(end, 14));

    const weeks = eachWeekOfInterval({ start, end });
    const totalDays = differenceInDays(end, start);

    return { chartStart: start, chartEnd: end, weeks, totalDays };
  }, [projectStartDate, projectEndDate, milestones]);

  const cellWidth = 120 / zoomLevel;
  const todayPosition = useMemo(() => {
    const today = new Date();
    if (isBefore(today, chartStart) || isAfter(today, chartEnd)) return null;
    const days = differenceInDays(today, chartStart);
    return (days / 7) * cellWidth;
  }, [chartStart, chartEnd, cellWidth]);

  const getMilestonePosition = (date: string) => {
    const d = new Date(date);
    const days = differenceInDays(d, chartStart);
    return (days / 7) * cellWidth;
  };

  const sortedMilestones = useMemo(() => {
    return [...milestones].sort(
      (a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
    );
  }, [milestones]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-3 w-3" />;
      case "at_risk":
      case "missed":
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Flag className="h-3 w-3" />;
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Project Timeline</span>
            <Badge variant="outline" className="ml-2">
              {sortedMilestones.length} milestones
            </Badge>
            <Badge variant="outline">
              {tasks.length} tasks
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewOffset((v) => v - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.5))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoomLevel((z) => Math.min(3, z + 0.5))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewOffset((v) => v + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              {/* Week Headers */}
              <div className="flex border-b border-border bg-muted/30">
                <div className="w-48 shrink-0 px-3 py-2 border-r border-border">
                  <span className="text-xs font-medium text-muted-foreground">Item</span>
                </div>
                <div className="flex relative" style={{ width: weeks.length * cellWidth }}>
                  {weeks.map((week, i) => (
                    <div
                      key={i}
                      className="shrink-0 px-2 py-2 border-r border-border/50 text-center"
                      style={{ width: cellWidth }}
                    >
                      <div className="text-xs font-medium text-muted-foreground">
                        {format(week, "MMM d")}
                      </div>
                    </div>
                  ))}
                  {/* Today line in header */}
                  {todayPosition !== null && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                      style={{ left: todayPosition }}
                    />
                  )}
                </div>
              </div>

              {/* Milestones Section */}
              <div className="border-b border-border">
                <div className="flex items-center px-3 py-1.5 bg-muted/20 border-b border-border/50">
                  <Flag className="h-3 w-3 mr-2 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Milestones</span>
                </div>
                {sortedMilestones.length === 0 ? (
                  <div className="flex">
                    <div className="w-48 shrink-0 px-3 py-3 text-sm text-muted-foreground">
                      No milestones
                    </div>
                  </div>
                ) : (
                  sortedMilestones.map((milestone) => (
                    <div key={milestone.id} className="flex hover:bg-muted/20 transition-colors">
                      <div className="w-48 shrink-0 px-3 py-2 border-r border-border flex items-center gap-2">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            statusColors[milestone.status] || "bg-muted"
                          )}
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onMilestoneClick?.(milestone)}
                              className="text-sm truncate text-left hover:text-primary transition-colors"
                            >
                              {milestone.title}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{milestone.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(milestone.target_date), "MMM d, yyyy")}
                            </p>
                            {milestone.description && (
                              <p className="text-xs mt-1 max-w-[200px]">{milestone.description}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div
                        className="relative flex items-center"
                        style={{ width: weeks.length * cellWidth }}
                      >
                        {/* Grid lines */}
                        {weeks.map((_, i) => (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 border-r border-border/30"
                            style={{ left: i * cellWidth, width: cellWidth }}
                          />
                        ))}
                        {/* Milestone diamond */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onMilestoneClick?.(milestone)}
                              className={cn(
                                "absolute flex items-center justify-center h-6 w-6 rotate-45 rounded-sm transition-transform hover:scale-110 z-10",
                                statusColors[milestone.status] || "bg-muted"
                              )}
                              style={{
                                left: getMilestonePosition(milestone.target_date) - 12,
                              }}
                            >
                              <span className="-rotate-45 text-white">
                                {getStatusIcon(milestone.status)}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{milestone.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {milestone.status.replace("_", " ")}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        {/* Today line */}
                        {todayPosition !== null && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-primary/50"
                            style={{ left: todayPosition }}
                          />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Tasks Section */}
              <div>
                <div className="flex items-center px-3 py-1.5 bg-muted/20 border-b border-border/50">
                  <CheckCircle2 className="h-3 w-3 mr-2 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Tasks</span>
                </div>
                {tasks.length === 0 ? (
                  <div className="flex">
                    <div className="w-48 shrink-0 px-3 py-3 text-sm text-muted-foreground">
                      No tasks
                    </div>
                  </div>
                ) : (
                  tasks.slice(0, 10).map((task, index) => (
                    <div key={task.id} className="flex hover:bg-muted/20 transition-colors">
                      <div className="w-48 shrink-0 px-3 py-2 border-r border-border flex items-center gap-2">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            statusColors[task.status] || "bg-muted"
                          )}
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onTaskClick?.(task)}
                              className="text-sm truncate text-left hover:text-primary transition-colors"
                            >
                              {task.title}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {task.status.replace("_", " ")}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div
                        className="relative flex items-center"
                        style={{ width: weeks.length * cellWidth }}
                      >
                        {/* Grid lines */}
                        {weeks.map((_, i) => (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 border-r border-border/30"
                            style={{ left: i * cellWidth, width: cellWidth }}
                          />
                        ))}
                        {/* Task bar - simulated position based on index */}
                        <div
                          className={cn(
                            "absolute h-5 rounded transition-all hover:opacity-80",
                            statusColors[task.status] || "bg-muted"
                          )}
                          style={{
                            left: (index * 0.5 + 1) * cellWidth,
                            width: cellWidth * (1 + Math.random() * 2),
                          }}
                        />
                        {/* Today line */}
                        {todayPosition !== null && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-primary/50"
                            style={{ left: todayPosition }}
                          />
                        )}
                      </div>
                    </div>
                  ))
                )}
                {tasks.length > 10 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border/50">
                    + {tasks.length - 10} more tasks
                  </div>
                )}
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
            <span>At Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span>Missed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 bg-primary" />
            <span>Today</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
