import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Sparkles, Trash2, FileText, Calendar, HardDrive, Tag, FolderOpen, Building2, Pencil } from "lucide-react";
import { format } from "date-fns";
import type { VaultDocument } from "./DocumentCard";

interface DocumentDetailSheetProps {
  document: VaultDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (doc: VaultDocument) => void;
  onDelete: (doc: VaultDocument) => void;
  onResummarize: (doc: VaultDocument) => void;
  onEdit?: (doc: VaultDocument) => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentDetailSheet({ document: doc, open, onOpenChange, onDownload, onDelete, onResummarize, onEdit }: DocumentDetailSheetProps) {
  if (!doc) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left pr-8">{doc.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onDownload(doc)} className="flex-1">
              <Download className="h-4 w-4 mr-2" />Download
            </Button>
            <Button size="sm" variant="outline" onClick={() => onResummarize(doc)}>
              <Sparkles className="h-4 w-4 mr-2" />Summarize
            </Button>
            {onEdit && (
              <Button size="sm" variant="outline" onClick={() => { onEdit(doc); onOpenChange(false); }}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={() => onDelete(doc)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />AI Summary
            </h4>
            {doc.ai_summary ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{doc.ai_summary}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No summary yet. Click "Summarize" to generate one.</p>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Details</h4>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Type:</span>
                <span>{doc.file_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Size:</span>
                <span>{formatSize(doc.file_size)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Uploaded:</span>
                <span>{format(new Date(doc.created_at), "MMM d, yyyy 'at' HH:mm")}</span>
              </div>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Category:</span>
                <Badge variant="secondary" className="capitalize">{doc.category}</Badge>
              </div>
              {doc.clients?.name && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Client:</span>
                  <span>{doc.clients.name}</span>
                </div>
              )}
              {doc.projects?.name && (
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Project:</span>
                  <span>{doc.projects.name}</span>
                </div>
              )}
            </div>
          </div>

          {doc.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />Tags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {doc.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}