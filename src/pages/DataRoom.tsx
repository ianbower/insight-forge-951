import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Search, Grid3X3, List, Database, Loader2 } from "lucide-react";
import { DocumentUpload } from "@/components/dataroom/DocumentUpload";
import { DocumentCard } from "@/components/dataroom/DocumentCard";
import { DocumentDetailSheet } from "@/components/dataroom/DocumentDetailSheet";
import { DocumentEditDialog } from "@/components/dataroom/DocumentEditDialog";
import { FolderTree } from "@/components/dataroom/FolderTree";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "general", label: "General" },
  { value: "proposal", label: "Proposal" },
  { value: "deliverable", label: "Deliverable" },
  { value: "research", label: "Research" },
  { value: "contract", label: "Contract" },
  { value: "presentation", label: "Presentation" },
  { value: "data", label: "Data" },
];

export default function DataRoom() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const { data: folders = [] } = useQuery({
    queryKey: ["vault-folders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vault_folders" as any).select("*").order("name");
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["vault-documents", search, categoryFilter, selectedFolderId],
    queryFn: async () => {
      let query = supabase.from("vault_documents" as any).select("*, clients(name), projects(name)").order("created_at", { ascending: false });
      if (categoryFilter !== "all") query = query.eq("category", categoryFilter);
      if (selectedFolderId) query = query.eq("folder_id", selectedFolderId);
      if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,ai_summary.ilike.%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => { const { data } = await supabase.from("clients").select("id, name").order("name"); return data || []; },
    enabled: !!user,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => { const { data } = await supabase.from("projects").select("id, name").order("name"); return data || []; },
    enabled: !!user,
  });

  const { data: allDocsCount = 0 } = useQuery({
    queryKey: ["vault-documents-count"],
    queryFn: async () => { const { count } = await supabase.from("vault_documents" as any).select("*", { count: "exact", head: true }); return count || 0; },
    enabled: !!user,
  });

  const handleDownload = async (doc: any) => {
    const { data } = await supabase.storage.from("project-documents").createSignedUrl(doc.file_url, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (doc: any) => {
    await supabase.storage.from("project-documents").remove([doc.file_url]);
    const { error } = await supabase.from("vault_documents" as any).delete().eq("id", doc.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Document deleted" }); queryClient.invalidateQueries({ queryKey: ["vault-documents"] }); queryClient.invalidateQueries({ queryKey: ["vault-documents-count"] }); setDetailOpen(false); }
  };

  const handleResummarize = async (doc: any) => {
    toast({ title: "AI summarization coming soon", description: "This feature will generate an AI summary of your document." });
  };

  const handleCreateFolder = async (name: string, parentId: string | null) => {
    if (!user) return;
    const { error } = await supabase.from("vault_folders" as any).insert({ name, parent_id: parentId, created_by: user.id });
    if (error) toast({ title: "Failed to create folder", description: error.message, variant: "destructive" });
    else queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
  };

  const handleRenameFolder = async (id: string, name: string) => {
    const { error } = await supabase.from("vault_folders" as any).update({ name }).eq("id", id);
    if (error) toast({ title: "Rename failed", description: error.message, variant: "destructive" });
    else queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
  };

  const handleDeleteFolder = async (id: string) => {
    await supabase.from("vault_documents" as any).update({ folder_id: null }).eq("folder_id", id);
    const { error } = await supabase.from("vault_folders" as any).delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { if (selectedFolderId === id) setSelectedFolderId(null); queryClient.invalidateQueries({ queryKey: ["vault-folders"] }); queryClient.invalidateQueries({ queryKey: ["vault-documents"] }); }
  };

  const handleEdit = (doc: any) => { setEditDoc(doc); setEditOpen(true); };

  return (
    <div className="flex gap-0 h-[calc(100vh-4rem)]">
      <div className="w-60 shrink-0 border-r border-border bg-muted/30 p-3 overflow-y-auto">
        <FolderTree folders={folders as any} selectedFolderId={selectedFolderId} onSelectFolder={setSelectedFolderId} onCreateFolder={handleCreateFolder} onRenameFolder={handleRenameFolder} onDeleteFolder={handleDeleteFolder} totalDocCount={allDocsCount} />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Database className="h-6 w-6 text-primary" />Data Room</h1>
            <p className="text-muted-foreground mt-1 text-sm">{selectedFolderId ? `Viewing: ${(folders as any[]).find((f: any) => f.id === selectedFolderId)?.name || "Folder"}` : "All documents"}</p>
          </div>
          <Button onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4 mr-2" />Upload</Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search documents, tags, summaries..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}</SelectContent>
          </Select>
          <div className="flex items-center gap-1 border rounded-md p-0.5">
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("grid")}><Grid3X3 className="h-4 w-4" /></Button>
            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
          </div>
        </div>

        {(search || categoryFilter !== "all") && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{(documents as any[]).length} result{(documents as any[]).length !== 1 ? "s" : ""}</Badge>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSearch(""); setCategoryFilter("all"); }}>Clear filters</Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (documents as any[]).length === 0 ? (
          <div className="text-center py-20">
            <Database className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No documents{selectedFolderId ? " in this folder" : " yet"}</h3>
            <p className="text-muted-foreground mt-1 mb-4">Upload your first document to get started</p>
            <Button onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4 mr-2" />Upload Documents</Button>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
            {(documents as any[]).map((doc: any) => (
              <DocumentCard key={doc.id} document={doc} onView={(d) => { setSelectedDoc(d); setDetailOpen(true); }} onDownload={handleDownload} onDelete={handleDelete} onResummarize={handleResummarize} onEdit={handleEdit} />
            ))}
          </div>
        )}
      </div>

      <DocumentUpload open={uploadOpen} onOpenChange={setUploadOpen} clients={clients} projects={projects} folders={folders as any[]} currentFolderId={selectedFolderId} />
      <DocumentDetailSheet document={selectedDoc} open={detailOpen} onOpenChange={setDetailOpen} onDownload={handleDownload} onDelete={handleDelete} onResummarize={handleResummarize} onEdit={handleEdit} />
      <DocumentEditDialog document={editDoc} open={editOpen} onOpenChange={setEditOpen} clients={clients} projects={projects} />
    </div>
  );
}