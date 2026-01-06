import { useState, useCallback, useRef } from "react";
import { Save, Download, FileDown, Plus, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyNote } from "./StickyNote";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { exportToPPT, exportToPDF } from "@/lib/exportUtils";

interface Note {
  id: string;
  content: string;
  color: string;
  position: { x: number; y: number };
}

interface CustomToolCanvasProps {
  toolId?: string;
  toolName?: string;
  canvasImageUrl?: string;
  projectId?: string;
  initialData?: Record<string, Note[]>;
  onSave?: (data: Record<string, Note[]>) => void;
}

const noteColors = [
  "bg-yellow-200 border-yellow-300",
  "bg-pink-200 border-pink-300",
  "bg-blue-200 border-blue-300",
  "bg-green-200 border-green-300",
  "bg-purple-200 border-purple-300",
  "bg-orange-200 border-orange-300",
];

export function CustomToolCanvas({
  toolId,
  toolName = "Custom Canvas",
  canvasImageUrl,
  projectId,
  initialData,
  onSave,
}: CustomToolCanvasProps) {
  const [notes, setNotes] = useState<Record<string, Note[]>>(
    initialData || { canvas: [] }
  );
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const addNote = useCallback((e?: React.MouseEvent) => {
    const position = e && canvasRef.current
      ? {
          x: e.clientX - canvasRef.current.getBoundingClientRect().left - 70,
          y: e.clientY - canvasRef.current.getBoundingClientRect().top - 50,
        }
      : { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 };

    const newNote: Note = {
      id: crypto.randomUUID(),
      content: "",
      color: noteColors[Math.floor(Math.random() * noteColors.length)],
      position,
    };
    setNotes((prev) => ({
      ...prev,
      canvas: [...(prev.canvas || []), newNote],
    }));
  }, []);

  const updateNote = useCallback((noteId: string, content: string) => {
    setNotes((prev) => ({
      ...prev,
      canvas: prev.canvas.map((note) =>
        note.id === noteId ? { ...note, content } : note
      ),
    }));
  }, []);

  const deleteNote = useCallback((noteId: string) => {
    setNotes((prev) => ({
      ...prev,
      canvas: prev.canvas.filter((note) => note.id !== noteId),
    }));
  }, []);

  const moveNote = useCallback((noteId: string, position: { x: number; y: number }) => {
    setNotes((prev) => ({
      ...prev,
      canvas: prev.canvas.map((note) =>
        note.id === noteId ? { ...note, position } : note
      ),
    }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (projectId && toolId) {
        // Check if record exists
        const { data: existing } = await supabase
          .from("tool_data")
          .select("id")
          .eq("project_id", projectId)
          .eq("tool_id", toolId)
          .single();

        if (existing) {
          const { error } = await supabase
            .from("tool_data")
            .update({ content_json: JSON.parse(JSON.stringify(notes)) })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("tool_data")
            .insert([{
              project_id: projectId,
              tool_id: toolId,
              content_json: JSON.parse(JSON.stringify(notes)),
            }]);
          if (error) throw error;
        }
      }
      onSave?.(notes);
      toast.success("Canvas saved successfully");
    } catch (error) {
      console.error("Error saving canvas:", error);
      toast.error("Failed to save canvas");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPPT = () => {
    exportToPPT({
      title: toolName,
      sections: [
        {
          name: toolName,
          notes: notes.canvas?.map((n) => ({
            id: n.id,
            content: n.content,
            color: n.color,
            position: n.position,
          })) || [],
        },
      ],
    });
  };

  const handleExportPDF = () => {
    exportToPDF("custom-canvas", toolName);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only add note if clicking directly on canvas background (not on a note)
    if ((e.target as HTMLElement).closest(".sticky-note-wrapper")) return;
    if (!isDragging) {
      addNote(e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold">{toolName}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPPT}>
            <Download className="h-4 w-4 mr-2" />
            PPT
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Plus className="h-4 w-4" />
        <span>Click anywhere on the canvas to add a sticky note</span>
        <Move className="h-4 w-4 ml-4" />
        <span>Drag notes to reposition</span>
      </div>

      <div
        id="custom-canvas"
        ref={canvasRef}
        className="relative min-h-[600px] rounded-xl border border-border overflow-hidden cursor-crosshair"
        style={{
          backgroundImage: canvasImageUrl ? `url(${canvasImageUrl})` : undefined,
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: canvasImageUrl ? "hsl(var(--muted))" : "hsl(var(--card))",
        }}
        onClick={handleCanvasClick}
      >
        {!canvasImageUrl && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-muted-foreground/50">
              <p className="text-lg font-medium">No canvas image</p>
              <p className="text-sm">Click to add sticky notes</p>
            </div>
          </div>
        )}

        {notes.canvas?.map((note) => (
          <div
            key={note.id}
            className="sticky-note-wrapper"
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setTimeout(() => setIsDragging(false), 100)}
          >
            <StickyNote
              id={note.id}
              content={note.content}
              color={note.color}
              position={note.position}
              onUpdate={updateNote}
              onDelete={deleteNote}
              onMove={moveNote}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
