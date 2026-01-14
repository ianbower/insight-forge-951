import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import type { Risk } from "./RiskMatrix";

interface RiskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  risk?: Risk | null;
  projectId: string;
  onSave: (risk: Omit<Risk, "id"> & { id?: string }) => void;
  onDelete?: (riskId: string) => void;
}

const categories = ["Strategic", "Operational", "Technical", "Resource", "External"];
const levels = ["Low", "Medium", "High"] as const;
const statuses = ["Open", "Mitigating", "Closed"] as const;

export function RiskForm({ open, onOpenChange, risk, projectId, onSave, onDelete }: RiskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Operational");
  const [likelihood, setLikelihood] = useState<Risk["likelihood"]>("Medium");
  const [impact, setImpact] = useState<Risk["impact"]>("Medium");
  const [status, setStatus] = useState<Risk["status"]>("Open");
  const [mitigationPlan, setMitigationPlan] = useState("");

  useEffect(() => {
    if (risk) {
      setTitle(risk.title);
      setDescription(risk.description || "");
      setCategory(risk.category);
      setLikelihood(risk.likelihood);
      setImpact(risk.impact);
      setStatus(risk.status);
      setMitigationPlan(risk.mitigation_plan || "");
    } else {
      setTitle("");
      setDescription("");
      setCategory("Operational");
      setLikelihood("Medium");
      setImpact("Medium");
      setStatus("Open");
      setMitigationPlan("");
    }
  }, [risk, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: risk?.id,
      project_id: projectId,
      title,
      description,
      category,
      likelihood,
      impact,
      status,
      mitigation_plan: mitigationPlan,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>{risk ? "Edit Risk" : "Add Risk"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Risk Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resource availability constraints"
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
              placeholder="Describe the risk and its potential impact..."
              className="bg-background resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Risk["status"])}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="likelihood">Likelihood</Label>
              <Select value={likelihood} onValueChange={(v) => setLikelihood(v as Risk["likelihood"])}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="impact">Impact</Label>
              <Select value={impact} onValueChange={(v) => setImpact(v as Risk["impact"])}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mitigation">Mitigation Plan</Label>
            <Textarea
              id="mitigation"
              value={mitigationPlan}
              onChange={(e) => setMitigationPlan(e.target.value)}
              placeholder="Steps to mitigate or manage this risk..."
              className="bg-background resize-none"
              rows={2}
            />
          </div>

          <div className="flex justify-between pt-4">
            {risk && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onDelete(risk.id);
                  onOpenChange(false);
                }}
              >
                Delete
              </Button>
            )}
            <div className={`flex gap-3 ${!risk ? "ml-auto" : ""}`}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {risk ? "Save Changes" : "Add Risk"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
