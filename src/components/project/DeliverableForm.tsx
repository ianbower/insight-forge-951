import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface Deliverable {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "blocked";
  due_date: string | null;
  milestone_id: string | null;
  order_index: number;
}

interface Milestone {
  id: string;
  title: string;
}

interface DeliverableFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliverable: Deliverable | null;
  milestones: Milestone[];
  onSave: (deliverable: Omit<Deliverable, "id" | "project_id" | "order_index"> & { id?: string }) => void;
  onDelete?: (id: string) => void;
}

export function DeliverableForm({ 
  open, 
  onOpenChange, 
  deliverable, 
  milestones,
  onSave, 
  onDelete 
}: DeliverableFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Deliverable["status"]>("pending");
  const [dueDate, setDueDate] = useState("");
  const [milestoneId, setMilestoneId] = useState<string>("none");

  useEffect(() => {
    if (deliverable) {
      setTitle(deliverable.title);
      setDescription(deliverable.description || "");
      setStatus(deliverable.status);
      setDueDate(deliverable.due_date || "");
      setMilestoneId(deliverable.milestone_id || "none");
    } else {
      setTitle("");
      setDescription("");
      setStatus("pending");
      setDueDate("");
      setMilestoneId("none");
    }
  }, [deliverable, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: deliverable?.id,
      title,
      description: description || null,
      status,
      due_date: dueDate || null,
      milestone_id: milestoneId === "none" ? null : milestoneId,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{deliverable ? "Edit Deliverable" : "Add Deliverable"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Deliverable title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the deliverable..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Deliverable["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone">Link to Milestone</Label>
            <Select value={milestoneId} onValueChange={setMilestoneId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a milestone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No milestone</SelectItem>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex justify-between">
            {deliverable && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onDelete(deliverable.id);
                  onOpenChange(false);
                }}
              >
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {deliverable ? "Update" : "Add"} Deliverable
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
