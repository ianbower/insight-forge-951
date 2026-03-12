import { FileText, Image, FileSpreadsheet, Presentation, File, Download, Trash2, Sparkles, MoreHorizontal, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

export interface VaultDocument {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  category: string;
  tags: string[];
  ai_summary: string | null;
  description?: string | null;
  created_at: string;
  updated_at?: string;
  client_id: string | null;
  project_id: string | null;
  clients?: { name: string } | null;
  projects?: { name: string } | null;
}

interface DocumentCardProps {
  document: VaultDocument;
  onView: (doc: VaultDocument) => void;
  onDownload: (doc: VaultDocument) => void;
  onDelete: (doc: VaultDocument) => void;
  onResummarize: (doc: VaultDocument) => void;
  onEdit?: (doc: VaultDocument) => void;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return Image;
  if (fileType.includes("spreadsheet") || fileType.includes("csv") || fileType.includes("excel")) return FileSpreadsheet;
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return Presentation;
  if (fileType.includes("pdf") || fileType.includes("document") || fileType.includes("text")) return FileText;
  return File;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentCard({ document: doc, onView, onDownload, onDelete, onResummarize, onEdit }: DocumentCardProps) {
  const Icon = getFileIcon(doc.file_type);

  return (
    <Card
      className="group p-4 hover:shadow-md transition-all cursor-pointer border-border/50"
      onClick={() => onView(doc)}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{doc.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{formatSize(doc.file_size)}</span>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(doc); }}>
              <Download className="h-4 w-4 mr-2" />Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onResummarize(doc); }}>
              <Sparkles className="h-4 w-4 mr-2" />Re-summarize
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(doc); }}>
                <Pencil className="h-4 w-4 mr-2" />Edit properties
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(doc); }}>
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        <Badge variant="secondary" className="text-xs capitalize">{doc.category}</Badge>
        {doc.clients?.name && <Badge variant="outline" className="text-xs">{doc.clients.name}</Badge>}
        {doc.projects?.name && <Badge variant="outline" className="text-xs">{doc.projects.name}</Badge>}
        {doc.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs text-muted-foreground">{tag}</Badge>
        ))}
        {doc.tags.length > 2 && <Badge variant="outline" className="text-xs text-muted-foreground">+{doc.tags.length - 2}</Badge>}
      </div>

      {doc.ai_summary && (
        <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">{doc.ai_summary}</p>
      )}
    </Card>
  );
}