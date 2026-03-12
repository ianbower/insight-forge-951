import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "proposal", label: "Proposal" },
  { value: "deliverable", label: "Deliverable" },
  { value: "research", label: "Research" },
  { value: "contract", label: "Contract" },
  { value: "presentation", label: "Presentation" },
  { value: "data", label: "Data" },
];

interface DocumentEditDialogProps {
  document: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}

export function DocumentEditDialog({ document: doc, open, onOpenChange, clients, projects }: DocumentEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    if (doc) {
      setName(doc.name || "");
      setDescription(doc.description || "");
      setCategory(doc.category || "general");
      setClientId(doc.client_id || "none");
      setProjectId(doc.project_id || "none");
      setTagsInput((doc.tags || []).join(", "));
    }
  }, [doc]);

  const handleSave = async () => {
    if (!doc) return;
    setSaving(true);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

    const { error } = await supabase
      .from("vault_documents" as any)
      .update({
        name,
        description: description || null,
        category,
        tags,
        client_id: clientId && clientId !== "none" ? clientId : null,
        project_id: projectId && projectId !== "none" ? projectId : null,
      })
      .eq("id", doc.id);

    setSaving(false);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Document updated" });
      queryClient.invalidateQueries({ queryKey: ["vault-documents"] });
      onOpenChange(false);
    }
  };

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Document Properties</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional description..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. strategy, Q1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={!name.trim() || saving} className="w-full">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}