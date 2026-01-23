import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Calendar, Target, CheckCircle2, Clock, AlertCircle, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Deliverable } from "./DeliverableForm";

interface Milestone {
  id: string;
  title: string;
}

interface DeliverablesListProps {
  deliverables: Deliverable[];
  milestones: Milestone[];
  onAddDeliverable: () => void;
  onEditDeliverable: (deliverable: Deliverable) => void;
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-muted-foreground",
    bg: "bg-muted/50",
    border: "border-border",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
  },
  blocked: {
    label: "Blocked",
    icon: Pause,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
  },
};

export function DeliverablesList({
  deliverables,
  milestones,
  onAddDeliverable,
  onEditDeliverable,
}: DeliverablesListProps) {
  const getMilestoneTitle = (milestoneId: string | null) => {
    if (!milestoneId) return null;
    return milestones.find((m) => m.id === milestoneId)?.title;
  };

  const groupedByMilestone = deliverables.reduce((acc, d) => {
    const key = d.milestone_id || "unlinked";
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {} as Record<string, Deliverable[]>);

  const completedCount = deliverables.filter((d) => d.status === "completed").length;
  const totalCount = deliverables.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-medium">Deliverables</CardTitle>
            {totalCount > 0 && (
              <Badge variant="secondary">
                {completedCount}/{totalCount} completed
              </Badge>
            )}
          </div>
          <Button size="sm" onClick={onAddDeliverable} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Deliverable
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {deliverables.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No deliverables yet</p>
            <Button variant="link" size="sm" onClick={onAddDeliverable} className="mt-2">
              Add your first deliverable
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Unlinked deliverables first */}
            {groupedByMilestone["unlinked"]?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Not linked to milestone
                </h4>
                <div className="grid gap-2">
                  {groupedByMilestone["unlinked"].map((d) => (
                    <DeliverableItem
                      key={d.id}
                      deliverable={d}
                      onClick={() => onEditDeliverable(d)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Grouped by milestone */}
            {milestones.map((milestone) => {
              const items = groupedByMilestone[milestone.id];
              if (!items?.length) return null;
              return (
                <div key={milestone.id} className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    {milestone.title}
                    <Badge variant="outline" className="ml-2">
                      {items.filter((i) => i.status === "completed").length}/{items.length}
                    </Badge>
                  </h4>
                  <div className="grid gap-2 pl-6 border-l-2 border-primary/20">
                    {items.map((d) => (
                      <DeliverableItem
                        key={d.id}
                        deliverable={d}
                        onClick={() => onEditDeliverable(d)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeliverableItem({
  deliverable,
  onClick,
}: {
  deliverable: Deliverable;
  onClick: () => void;
}) {
  const config = statusConfig[deliverable.status];
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
        config.bg,
        config.border
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h5 className="font-medium truncate">{deliverable.title}</h5>
            <Badge variant="secondary" className={cn("shrink-0", config.color)}>
              {config.label}
            </Badge>
          </div>
          {deliverable.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {deliverable.description}
            </p>
          )}
          {deliverable.due_date && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Due: {new Date(deliverable.due_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
