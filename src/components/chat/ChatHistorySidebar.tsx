import { useState, useRef, useEffect } from "react";
import { Bot, Trash2, FolderPlus, Folder, ChevronDown, ChevronRight, Pencil, Check, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChatSession, ChatFolder } from "@/hooks/useChatSessions";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ChatHistorySidebarProps {
  sessions: ChatSession[];
  folders: ChatFolder[];
  activeSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onUpdateTitle: (sessionId: string, newTitle: string) => void;
  onMoveToFolder: (sessionId: string, folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onNewChat: () => void;
}

export function ChatHistorySidebar({
  sessions,
  folders,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onUpdateTitle,
  onMoveToFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onNewChat,
}: ChatHistorySidebarProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editInputRef.current && (editingSessionId || editingFolderId || creatingFolder)) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSessionId, editingFolderId, creatingFolder]);

  const startEditingSession = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditValue(session.title);
  };

  const saveSessionTitle = () => {
    if (editingSessionId && editValue.trim()) {
      onUpdateTitle(editingSessionId, editValue.trim());
    }
    setEditingSessionId(null);
    setEditValue("");
  };

  const startEditingFolder = (folder: ChatFolder) => {
    setEditingFolderId(folder.id);
    setEditValue(folder.name);
  };

  const saveFolderName = () => {
    if (editingFolderId && editValue.trim()) {
      onRenameFolder(editingFolderId, editValue.trim());
    }
    setEditingFolderId(null);
    setEditValue("");
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setCreatingFolder(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, sessionId: string) => {
    e.dataTransfer.setData("text/plain", sessionId);
    setDraggedSessionId(sessionId);
  };

  const handleDragEnd = () => {
    setDraggedSessionId(null);
    setDragOverFolderId(null);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolderId(folderId);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const sessionId = e.dataTransfer.getData("text/plain");
    if (sessionId) {
      onMoveToFolder(sessionId, folderId);
    }
    setDraggedSessionId(null);
    setDragOverFolderId(null);
  };

  const unfolderedSessions = sessions.filter((s) => !s.folder_id);
  const getSessionsInFolder = (folderId: string) =>
    sessions.filter((s) => s.folder_id === folderId);

  const renderSession = (session: ChatSession) => {
    const isEditing = editingSessionId === session.id;
    const isDragging = draggedSessionId === session.id;

    return (
      <ContextMenu key={session.id}>
        <ContextMenuTrigger asChild>
          <div
            draggable={!isEditing}
            onDragStart={(e) => handleDragStart(e, session.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors",
              activeSessionId === session.id
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted",
              isDragging && "opacity-50"
            )}
            onClick={() => !isEditing && onSelectSession(session.id)}
          >
            <GripVertical className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-50 cursor-grab" />
            <Bot className="h-4 w-4 flex-shrink-0" />
            {isEditing ? (
              <div className="flex-1 flex items-center gap-1">
                <Input
                  ref={editInputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveSessionTitle();
                    if (e.key === "Escape") setEditingSessionId(null);
                  }}
                  className="h-6 text-xs"
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    saveSessionTitle();
                  }}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSessionId(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                <span className="flex-1 truncate">{session.title}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => startEditingSession(session)}>
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </ContextMenuItem>
          {folders.length > 0 && (
            <>
              {folders.map((folder) => (
                <ContextMenuItem
                  key={folder.id}
                  onClick={() => onMoveToFolder(session.id, folder.id)}
                >
                  <Folder className="h-4 w-4 mr-2" />
                  Move to {folder.name}
                </ContextMenuItem>
              ))}
              {session.folder_id && (
                <ContextMenuItem onClick={() => onMoveToFolder(session.id, null)}>
                  <X className="h-4 w-4 mr-2" />
                  Remove from folder
                </ContextMenuItem>
              )}
            </>
          )}
          <ContextMenuItem
            onClick={() => onDeleteSession(session.id)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  const renderFolder = (folder: ChatFolder) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isEditing = editingFolderId === folder.id;
    const folderSessions = getSessionsInFolder(folder.id);
    const isDragOver = dragOverFolderId === folder.id;

    return (
      <ContextMenu key={folder.id}>
        <ContextMenuTrigger asChild>
          <Collapsible open={isExpanded} onOpenChange={() => toggleFolder(folder.id)}>
            <div
              onDragOver={(e) => handleDragOver(e, folder.id)}
              onDragLeave={() => setDragOverFolderId(null)}
              onDrop={(e) => handleDrop(e, folder.id)}
              className={cn(
                "rounded-lg transition-colors",
                isDragOver && "bg-primary/10 ring-2 ring-primary/50"
              )}
            >
              <CollapsibleTrigger asChild>
                <div
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-muted"
                  )}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  )}
                  <Folder className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-1">
                      <Input
                        ref={editInputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveFolderName();
                          if (e.key === "Escape") setEditingFolderId(null);
                        }}
                        className="h-6 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveFolderName();
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 truncate font-medium">{folder.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {folderSessions.length}
                      </span>
                    </>
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 border-l border-border pl-2 space-y-1">
                  {folderSessions.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-3 py-2">
                      Drag conversations here
                    </p>
                  ) : (
                    folderSessions.map(renderSession)
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => startEditingFolder(folder)}>
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onDeleteFolder(folder.id)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete folder
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" className="flex-1" onClick={onNewChat}>
            New Chat
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="ml-2"
            onClick={() => setCreatingFolder(true)}
            title="Create folder"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
        {creatingFolder && (
          <div className="flex items-center gap-1">
            <Input
              ref={editInputRef}
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") {
                  setCreatingFolder(false);
                  setNewFolderName("");
                }
              }}
              className="h-8 text-sm"
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCreateFolder}>
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                setCreatingFolder(false);
                setNewFolderName("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Folders */}
          {folders.map(renderFolder)}

          {/* Unfoldered sessions drop zone */}
          <div
            onDragOver={(e) => handleDragOver(e, null)}
            onDragLeave={() => setDragOverFolderId(null)}
            onDrop={(e) => handleDrop(e, null)}
            className={cn(
              "space-y-1 rounded-lg transition-colors min-h-[40px]",
              dragOverFolderId === null && draggedSessionId && "bg-muted/50"
            )}
          >
            {unfolderedSessions.length === 0 && folders.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">No conversations yet</p>
            ) : (
              unfolderedSessions.map(renderSession)
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
