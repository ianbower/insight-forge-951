import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Milestone {
  date: Date;
  title: string;
  project: string;
  type: "deadline" | "review" | "milestone";
}

interface ProjectCalendarProps {
  milestones?: Milestone[];
  className?: string;
}

export function ProjectCalendar({ milestones = [], className }: ProjectCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Mock milestones for display
  const mockMilestones: Milestone[] = [
    {
      date: new Date(2024, 11, 20),
      title: "Strategy Review",
      project: "Digital Transformation",
      type: "review",
    },
    {
      date: new Date(2024, 11, 23),
      title: "Phase 1 Complete",
      project: "Operating Model",
      type: "milestone",
    },
    {
      date: new Date(2024, 11, 28),
      title: "Client Presentation",
      project: "M&A Integration",
      type: "deadline",
    },
  ];

  const displayMilestones = milestones.length > 0 ? milestones : mockMilestones;

  return (
    <div className={cn("rounded-xl border border-border bg-card h-full flex flex-col overflow-hidden", className)}>
      <div className="border-b border-border p-4">
        <h3 className="font-semibold font-display">Project Calendar</h3>
      </div>
      <div className="p-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md"
        />
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
          {displayMilestones.slice(0, 3).map((milestone, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
            >
              <div>
                <p className="text-sm font-medium">{milestone.title}</p>
                <p className="text-xs text-muted-foreground">{milestone.project}</p>
              </div>
              <Badge
                variant={
                  milestone.type === "deadline"
                    ? "destructive"
                    : milestone.type === "review"
                    ? "secondary"
                    : "default"
                }
                className="text-xs"
              >
                {milestone.type}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
