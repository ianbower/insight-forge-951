import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import type { Milestone } from "./MilestoneTimeline";

interface MilestoneFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone?: Milestone | null;
  projectId: string;
  onSave: (milestone: Omit<Milestone, "id"> & { id?: string }) => void;
  onDelete?: (milestoneId: string) => void;
}

export function MilestoneForm({ open, onOpenChange, milestone, projectId, onSave, onDelete }: MilestoneFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState<Milestone["status"]>("upcoming");

  useEffect(() => {
    if (milestone) {
      setTitle(milestone.title);
      setDescription(milestone.description || "");
      setTargetDate(milestone.target_date);
      setStatus(milestone.status);
    } else {
      setTitle("");
      setDescription("");
      setTargetDate("");
      setStatus("upcoming");
    }
  }, [milestone, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: milestone?.id,
      project_id: projectId,
      title,
      description,
      target_date: targetDate,
      status,
      order_index: milestone?.order_index || 0,
      completed_date: status === "completed" ? new Date().toISOString().split("T")[0] : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>{milestone ? "Edit Milestone" : "Add Milestone"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Phase 1 Complete"
              required
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key deliverables and success criteria..."
              className="bg-background resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Date</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Milestone["status"])}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            {milestone && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onDelete(milestone.id);
                  onOpenChange(false);
                }}
              >
                Delete
              </Button>
            )}
            <div className={cn("flex gap-3", !milestone && "ml-auto")}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {milestone ? "Save Changes" : "Add Milestone"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
