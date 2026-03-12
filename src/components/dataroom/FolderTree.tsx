import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FolderPlus, MoreHorizontal, Pencil, Trash2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface VaultFolder {
  id: string;
  name: string;
  parent_id: string | null;
  folder_type?: string;
  children?: VaultFolder[];
  document_count?: number;
}

interface FolderTreeProps {
  folders: VaultFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  totalDocCount: number;
}

function buildTree(folders: VaultFolder[]): VaultFolder[] {
  const map = new Map<string, VaultFolder>();
  const roots: VaultFolder[] = [];
  folders.forEach((f) => map.set(f.id, { ...f, children: [] }));
  map.forEach((f) => {
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id)!.children!.push(f);
    } else {
      roots.push(f);
    }
  });
  return roots.sort((a, b) => a.name.localeCompare(b.name));
}

function FolderNode({
  folder, depth, selectedFolderId, onSelectFolder, onCreateFolder, onRenameFolder, onDeleteFolder,
}: {
  folder: VaultFolder; depth: number; selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void; onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void; onDeleteFolder: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const [creatingChild, setCreatingChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedFolderId === folder.id;
  const Icon = expanded && hasChildren ? FolderOpen : Folder;

  const handleRename = () => { if (renameValue.trim()) onRenameFolder(folder.id, renameValue.trim()); setRenaming(false); };
  const handleCreateChild = () => { if (newChildName.trim()) { onCreateFolder(newChildName.trim(), folder.id); setNewChildName(""); setCreatingChild(false); setExpanded(true); } };

  return (
    <div>
      <div
        className={cn("flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer group text-sm hover:bg-accent/50 transition-colors", isSelected && "bg-accent text-accent-foreground font-medium")}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelectFolder(folder.id)}
      >
        <button className="p-0.5 hover:bg-accent rounded shrink-0" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
          {hasChildren ? (expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />) : <span className="w-3.5" />}
        </button>
        <Icon className="h-4 w-4 text-primary/70 shrink-0" />
        {renaming ? (
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(false); }}
            className="h-6 text-xs py-0 px-1" autoFocus onClick={(e) => e.stopPropagation()} />
        ) : <span className="truncate flex-1">{folder.name}</span>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setCreatingChild(true); setExpanded(true); }}><FolderPlus className="h-4 w-4 mr-2" />New subfolder</DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenaming(true); setRenameValue(folder.name); }}><Pencil className="h-4 w-4 mr-2" />Rename</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {expanded && hasChildren && folder.children!.map((child) => (
        <FolderNode key={child.id} folder={child} depth={depth + 1} selectedFolderId={selectedFolderId} onSelectFolder={onSelectFolder} onCreateFolder={onCreateFolder} onRenameFolder={onRenameFolder} onDeleteFolder={onDeleteFolder} />
      ))}
      {creatingChild && (
        <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
          <Folder className="h-4 w-4 text-primary/70 shrink-0" />
          <Input value={newChildName} onChange={(e) => setNewChildName(e.target.value)}
            onBlur={() => { if (!newChildName.trim()) setCreatingChild(false); else handleCreateChild(); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateChild(); if (e.key === "Escape") setCreatingChild(false); }}
            className="h-6 text-xs py-0 px-1" placeholder="Folder name" autoFocus />
        </div>
      )}
    </div>
  );
}

export function FolderTree({ folders, selectedFolderId, onSelectFolder, onCreateFolder, onRenameFolder, onDeleteFolder, totalDocCount }: FolderTreeProps) {
  const [creatingRoot, setCreatingRoot] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const tree = buildTree(folders);

  const handleCreateRoot = () => { if (newFolderName.trim()) { onCreateFolder(newFolderName.trim(), null); setNewFolderName(""); setCreatingRoot(false); } };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Folders</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCreatingRoot(true)}><FolderPlus className="h-3.5 w-3.5" /></Button>
      </div>
      <div className={cn("flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm hover:bg-accent/50 transition-colors", selectedFolderId === null && "bg-accent text-accent-foreground font-medium")} onClick={() => onSelectFolder(null)}>
        <Database className="h-4 w-4 text-primary/70" />
        <span className="flex-1">All Documents</span>
        <span className="text-xs text-muted-foreground">{totalDocCount}</span>
      </div>
      {tree.map((folder) => (
        <FolderNode key={folder.id} folder={folder} depth={0} selectedFolderId={selectedFolderId} onSelectFolder={onSelectFolder} onCreateFolder={onCreateFolder} onRenameFolder={onRenameFolder} onDeleteFolder={onDeleteFolder} />
      ))}
      {creatingRoot && (
        <div className="flex items-center gap-1 px-2 py-1">
          <Folder className="h-4 w-4 text-primary/70 shrink-0" />
          <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={() => { if (!newFolderName.trim()) setCreatingRoot(false); else handleCreateRoot(); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateRoot(); if (e.key === "Escape") setCreatingRoot(false); }}
            className="h-6 text-xs py-0 px-1" placeholder="Folder name" autoFocus />
        </div>
      )}
    </div>
  );
}