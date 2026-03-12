import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "proposal", label: "Proposal" },
  { value: "deliverable", label: "Deliverable" },
  { value: "research", label: "Research" },
  { value: "contract", label: "Contract" },
  { value: "presentation", label: "Presentation" },
  { value: "data", label: "Data" },
];

interface DocumentUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  folders?: { id: string; name: string; parent_id: string | null }[];
  currentFolderId?: string | null;
}

export function DocumentUpload({ open, onOpenChange, clients, projects, folders = [], currentFolderId }: DocumentUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState("general");
  const [clientId, setClientId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [tagsInput, setTagsInput] = useState("");
  const [folderId, setFolderId] = useState<string>(currentFolderId || "");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleUpload = async () => {
    if (!user || files.length === 0) return;
    setUploading(true);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

    try {
      for (const file of files) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: storageError } = await supabase.storage
          .from("project-documents")
          .upload(filePath, file);

        if (storageError) throw storageError;

        await supabase
          .from("vault_documents")
          .insert({
            name: file.name,
            file_url: filePath,
            file_type: file.type || "application/octet-stream",
            file_size: file.size,
            uploaded_by: user.id,
            category,
            tags,
            client_id: clientId && clientId !== "none" ? clientId : null,
            project_id: projectId && projectId !== "none" ? projectId : null,
            folder_id: folderId && folderId !== "none" ? folderId : null,
          } as any);
      }

      toast({ title: "Documents uploaded", description: `${files.length} file(s) uploaded successfully.` });
      queryClient.invalidateQueries({ queryKey: ["vault-documents"] });
      setFiles([]);
      setTagsInput("");
      setCategory("general");
      setClientId("");
      setProjectId("");
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
          )}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Drag & drop files here or click to browse</p>
          <input id="file-input" type="file" multiple className="hidden" onChange={handleFileSelect} />
        </div>

        {files.length > 0 && (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-3 py-1.5">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{file.name}</span>
                <span className="text-muted-foreground text-xs">{(file.size / 1024).toFixed(0)}KB</span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeFile(i)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

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
            <Label className="text-xs">Client (optional)</Label>
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
            <Label className="text-xs">Project (optional)</Label>
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

        <Button onClick={handleUpload} disabled={files.length === 0 || uploading} className="w-full">
          {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : `Upload ${files.length} file(s)`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}