import { useState, useCallback, useRef } from "react";
import { Save, Download, FileDown, Plus, Move, ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyNote } from "./StickyNote";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { exportToPPT, exportToPDF } from "@/lib/exportUtils";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface CanvasSectionDef {
  id: string;
  title: string;
  description: string;
  shape: "rectangle" | "circle" | "rounded-rectangle";
  position: { x: number; y: number; width: number; height: number };
  color: string;
}

interface CustomToolCanvasProps {
  toolId?: string;
  toolName?: string;
  canvasImageUrl?: string;
  projectId?: string;
  sections?: CanvasSectionDef[];
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
  sections = [],
  initialData,
  onSave,
}: CustomToolCanvasProps) {
  // If sections are defined, use section-based notes; otherwise use "canvas" key
  const hasSections = sections && sections.length > 0;
  
  const [notes, setNotes] = useState<Record<string, Note[]>>(() => {
    if (initialData) return initialData;
    if (hasSections) {
      // Initialize with empty arrays for each section
      const initial: Record<string, Note[]> = {};
      sections.forEach(s => { initial[s.id] = []; });
      return initial;
    }
    return { canvas: [] };
  });
  const [saving, setSaving] = useState(false);
  const [scale, setScale] = useState(1);
  const [canvasSizeIndex, setCanvasSizeIndex] = useState(0);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const currentSize = CANVAS_SIZES[canvasSizeIndex];

  const addNoteToSection = useCallback((sectionId: string, e?: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    // Position note within the section bounds (in percentage of canvas)
    const sectionX = (section.position.x / 100) * currentSize.width;
    const sectionY = (section.position.y / 100) * currentSize.height;
    const sectionW = (section.position.width / 100) * currentSize.width;
    const sectionH = (section.position.height / 100) * currentSize.height;
    
    const newNote: Note = {
      id: crypto.randomUUID(),
      content: "",
      color: noteColors[Math.floor(Math.random() * noteColors.length)],
      position: { 
        x: sectionX + 10 + Math.random() * Math.max(20, sectionW - 160), 
        y: sectionY + 40 + Math.random() * Math.max(20, sectionH - 120) 
      },
      size: { width: 120, height: 80 },
    };
    
    setNotes((prev) => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] || []), newNote],
    }));
  }, [sections, currentSize]);

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
      size: { width: 140, height: 100 },
    };
    setNotes((prev) => ({
      ...prev,
      canvas: [...(prev.canvas || []), newNote],
    }));
  }, [scale]);

  // Generic note operations that work across all keys
  const resizeNote = useCallback((noteId: string, size: { width: number; height: number }) => {
    setNotes((prev) => {
      const newNotes = { ...prev };
      for (const key of Object.keys(newNotes)) {
        newNotes[key] = newNotes[key].map((note) =>
          note.id === noteId ? { ...note, size } : note
        );
      }
      return newNotes;
    });
  }, []);

  const updateNote = useCallback((noteId: string, content: string) => {
    setNotes((prev) => {
      const newNotes = { ...prev };
      for (const key of Object.keys(newNotes)) {
        newNotes[key] = newNotes[key].map((note) =>
          note.id === noteId ? { ...note, content } : note
        );
      }
      return newNotes;
    });
  }, []);

  const deleteNote = useCallback((noteId: string) => {
    setNotes((prev) => {
      const newNotes = { ...prev };
      for (const key of Object.keys(newNotes)) {
        newNotes[key] = newNotes[key].filter((note) => note.id !== noteId);
      }
      return newNotes;
    });
  }, []);

  const moveNote = useCallback((noteId: string, position: { x: number; y: number }) => {
    setNotes((prev) => {
      const newNotes = { ...prev };
      for (const key of Object.keys(newNotes)) {
        newNotes[key] = newNotes[key].map((note) =>
          note.id === noteId ? { ...note, position } : note
        );
      }
      return newNotes;
    });
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
    // Export with section names if available
    const exportSections = hasSections
      ? sections.map(s => ({
          name: s.title,
          notes: (notes[s.id] || []).map((n) => ({
            id: n.id,
            content: n.content,
            color: n.color,
            position: n.position,
          })),
        }))
      : [{
          name: toolName,
          notes: (notes.canvas || []).map((n) => ({
            id: n.id,
            content: n.content,
            color: n.color,
            position: n.position,
          })),
        }];

    exportToPPT({
      title: toolName,
      sections: exportSections,
    });
  };

  const handleExportPDF = () => {
    exportToPDF("custom-canvas", toolName);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".sticky-note-wrapper")) return;
    if ((e.target as HTMLElement).closest(".section-zone")) return;
    if (!hasSections) {
      addNote(e);
    }
  };

  const handleSectionClick = (e: React.MouseEvent, sectionId: string) => {
    e.stopPropagation();
    if ((e.target as HTMLElement).closest(".sticky-note-wrapper")) return;
    addNoteToSection(sectionId, e);
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

  // Calculate the scaled dimensions for the wrapper
  const scaledWidth = currentSize.width * scale;
  const scaledHeight = currentSize.height * scale;

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
        className="overflow-auto rounded-xl border border-border bg-muted/30"
        style={{ maxHeight: "70vh" }}
      >
        {/* Wrapper div that takes the scaled size so scrolling works */}
        <div style={{ width: scaledWidth, height: scaledHeight }}>
          <div
            id="custom-canvas"
            ref={canvasRef}
            className="relative cursor-crosshair origin-top-left"
            style={{
              width: currentSize.width,
              height: currentSize.height,
              transform: `scale(${scale})`,
              backgroundImage: canvasImageUrl ? `url(${canvasImageUrl})` : undefined,
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundColor: canvasImageUrl ? "hsl(var(--muted))" : "hsl(var(--card))",
            }}
            onClick={handleCanvasClick}
          >
            {/* Show placeholder only if no image and no sections */}
            {!canvasImageUrl && !hasSections && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-muted-foreground/50">
                  <p className="text-lg font-medium">No canvas image</p>
                  <p className="text-sm">Click to add sticky notes</p>
                </div>
              </div>
            )}

            {/* Render sections if defined */}
            {hasSections && sections.map((section) => (
              <div
                key={section.id}
                className={cn(
                  "section-zone absolute border-2 cursor-pointer transition-all hover:shadow-md group",
                  section.shape === "circle" && "rounded-full",
                  section.shape === "rounded-rectangle" && "rounded-xl",
                  selectedSection === section.id && "ring-2 ring-primary ring-offset-2"
                )}
                style={{
                  left: `${section.position.x}%`,
                  top: `${section.position.y}%`,
                  width: `${section.position.width}%`,
                  height: `${section.position.height}%`,
                  backgroundColor: `${section.color}22`,
                  borderColor: section.color,
                }}
                onClick={(e) => handleSectionClick(e, section.id)}
              >
                {/* Section header */}
                <div 
                  className="absolute top-0 left-0 right-0 px-2 py-1 flex items-center justify-between"
                  style={{ backgroundColor: `${section.color}dd` }}
                >
                  <span className="text-xs font-semibold text-white truncate flex-1">
                    {section.title}
                  </span>
                  <button
                    className="ml-1 p-0.5 rounded bg-white/20 hover:bg-white/40 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      addNoteToSection(section.id);
                    }}
                    title="Add sticky note"
                  >
                    <Plus className="h-3 w-3 text-white" />
                  </button>
                </div>

                {/* Notes in this section */}
                {(notes[section.id] || []).map((note) => (
                  <div key={note.id} className="sticky-note-wrapper">
                    <StickyNote
                      id={note.id}
                      content={note.content}
                      color={note.color}
                      position={note.position}
                      size={note.size || { width: 120, height: 80 }}
                      onUpdate={updateNote}
                      onDelete={deleteNote}
                      onMove={moveNote}
                      onResize={resizeNote}
                      canvasRef={canvasRef}
                      scale={scale}
                    />
                  </div>
                ))}
              </div>
            ))}

            {/* Fallback: render notes in canvas key for non-sectioned canvases */}
            {!hasSections && notes.canvas?.map((note) => (
              <div key={note.id} className="sticky-note-wrapper">
                <StickyNote
                  id={note.id}
                  content={note.content}
                  color={note.color}
                  position={note.position}
                  size={note.size || { width: 140, height: 100 }}
                  onUpdate={updateNote}
                  onDelete={deleteNote}
                  onMove={moveNote}
                  onResize={resizeNote}
                  canvasRef={canvasRef}
                  scale={scale}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
