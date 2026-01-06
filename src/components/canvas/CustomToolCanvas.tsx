import { useState, useCallback, useRef } from "react";
import { Save, Download, FileDown, Plus, Move, ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyNote } from "./StickyNote";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { exportToPPT, exportToPDF } from "@/lib/exportUtils";
import { Slider } from "@/components/ui/slider";

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

const CANVAS_SIZES = [
  { name: "Standard", width: 1200, height: 800 },
  { name: "Large", width: 1600, height: 1000 },
  { name: "Extra Large", width: 2000, height: 1400 },
  { name: "Huge", width: 2400, height: 1800 },
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
  const [scale, setScale] = useState(1);
  const [canvasSizeIndex, setCanvasSizeIndex] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSize = CANVAS_SIZES[canvasSizeIndex];

  const addNote = useCallback((e?: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const position = e
      ? {
          x: (e.clientX - rect.left) / scale,
          y: (e.clientY - rect.top) / scale,
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
  }, [scale]);

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
    if ((e.target as HTMLElement).closest(".sticky-note-wrapper")) return;
    addNote(e);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.3));
  };

  const handleResetZoom = () => {
    setScale(1);
  };

  const handleIncreaseCanvasSize = () => {
    setCanvasSizeIndex((prev) => Math.min(prev + 1, CANVAS_SIZES.length - 1));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-display font-semibold">{toolName}</h2>
        <div className="flex gap-2 flex-wrap">
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

      {/* Canvas Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Plus className="h-4 w-4" />
          <span>Click on canvas to add notes</span>
          <Move className="h-4 w-4 ml-2" />
          <span>Drag to move</span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Canvas Size */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Size:</span>
            <span className="text-sm font-medium">{currentSize.name}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleIncreaseCanvasSize}
              disabled={canvasSizeIndex >= CANVAS_SIZES.length - 1}
              title="Increase canvas size"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomOut}
              disabled={scale <= 0.3}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <div className="w-24">
              <Slider
                value={[scale * 100]}
                min={30}
                max={200}
                step={5}
                onValueChange={([value]) => setScale(value / 100)}
              />
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomIn}
              disabled={scale >= 2}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              {Math.round(scale * 100)}%
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas Container with Scroll */}
      <div
        ref={containerRef}
        className="overflow-auto rounded-xl border border-border bg-muted/30"
        style={{ maxHeight: "70vh" }}
      >
        <div
          id="custom-canvas"
          ref={canvasRef}
          className="relative cursor-crosshair"
          style={{
            width: currentSize.width,
            height: currentSize.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
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
            <div key={note.id} className="sticky-note-wrapper">
              <StickyNote
                id={note.id}
                content={note.content}
                color={note.color}
                position={note.position}
                onUpdate={updateNote}
                onDelete={deleteNote}
                onMove={moveNote}
                canvasRef={canvasRef}
                scale={scale}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
