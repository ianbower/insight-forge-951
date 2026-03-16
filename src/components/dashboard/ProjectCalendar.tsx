import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Milestone {
  date: Date;
  title: string;
  project: string;
  type: "deadline" | "review" | "milestone";
}

interface MilestoneQueryRow {
  title: string;
  target_date: string;
  status: string | null;
  projects?: {
    name?: string | null;
  } | null;
}

interface ProjectCalendarProps {
  className?: string;
}

export function ProjectCalendar({ className }: ProjectCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + 60); // Next 60 days

        const { data, error } = await supabase
          .from("project_milestones")
          .select(`
            id,
            title,
            target_date,
            status,
            project_id,
            projects:project_id (name)
          `)
          .gte("target_date", now.toISOString().split("T")[0])
          .lte("target_date", futureDate.toISOString().split("T")[0])
          .order("target_date", { ascending: true })
          .limit(5);

        if (error) throw error;

        const formattedMilestones: Milestone[] = ((data || []) as MilestoneQueryRow[]).map((m) => ({
          date: new Date(m.target_date),
          title: m.title,
          project: m.projects?.name || "Unknown Project",
          type: m.status === "completed" ? "milestone" : m.status === "in_progress" ? "review" : "deadline",
        }));

        setMilestones(formattedMilestones);
      } catch (error) {
        console.error("Error fetching milestones:", error);
        setMilestones([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMilestones();
  }, []);

  return (
    <div className={cn("enterprise-card flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border/80", className)}>
      <div className="border-b border-border/80 p-5">
        <h3 className="font-display text-[1.6rem] text-primary">Project Calendar</h3>
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
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : milestones.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No upcoming milestones
            </div>
          ) : (
            milestones.slice(0, 3).map((milestone, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl bg-primary/5 p-3"
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
          ))
          )}
        </div>
      </div>
    </div>
  );
}
