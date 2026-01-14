import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import type { Issue } from "./RAIDLog";

interface IssueFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue?: Issue | null;
  projectId: string;
  onSave: (issue: Omit<Issue, "id"> & { id?: string }) => void;
  onDelete?: (issueId: string) => void;
}

const priorities = ["Critical", "High", "Medium", "Low"] as const;
const statuses = ["Open", "In Progress", "Resolved", "Escalated"] as const;

export function IssueForm({ open, onOpenChange, issue, projectId, onSave, onDelete }: IssueFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Issue["priority"]>("Medium");
  const [status, setStatus] = useState<Issue["status"]>("Open");
  const [resolution, setResolution] = useState("");
  const [targetDate, setTargetDate] = useState("");

  useEffect(() => {
    if (issue) {
      setTitle(issue.title);
      setDescription(issue.description || "");
      setPriority(issue.priority);
      setStatus(issue.status);
      setResolution(issue.resolution || "");
      setTargetDate(issue.target_resolution_date || "");
    } else {
      setTitle("");
      setDescription("");
      setPriority("Medium");
      setStatus("Open");
      setResolution("");
      setTargetDate("");
    }
  }, [issue, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: issue?.id,
      project_id: projectId,
      title,
      description,
      priority,
      status,
      resolution,
      raised_date: issue?.raised_date || new Date().toISOString().split("T")[0],
      target_resolution_date: targetDate || undefined,
      resolved_date: status === "Resolved" ? new Date().toISOString().split("T")[0] : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>{issue ? "Edit Issue" : "Add Issue"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Issue Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Data quality issues in source system"
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
              placeholder="Describe the issue and its impact..."
              className="bg-background resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Issue["priority"])}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Issue["status"])}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Resolution Date</Label>
            <Input
              id="targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-background"
            />
          </div>

          {(status === "Resolved" || resolution) && (
            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution</Label>
              <Textarea
                id="resolution"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="How was this issue resolved?"
                className="bg-background resize-none"
                rows={2}
              />
            </div>
          )}

          <div className="flex justify-between pt-4">
            {issue && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onDelete(issue.id);
                  onOpenChange(false);
                }}
              >
                Delete
              </Button>
            )}
            <div className={`flex gap-3 ${!issue ? "ml-auto" : ""}`}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {issue ? "Save Changes" : "Add Issue"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
