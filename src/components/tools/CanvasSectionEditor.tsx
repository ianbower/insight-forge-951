import { useState, useRef, useCallback, useEffect } from "react";
import { 
  Square, Circle, Type, Move, Trash2, RotateCcw, 
  ZoomIn, ZoomOut, Wand2, Loader2, MousePointer, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CanvasSection {
  id: string;
  title: string;
  description: string;
  shape: "rectangle" | "circle" | "rounded-rectangle";
  position: { x: number; y: number; width: number; height: number };
  color: string;
}

interface CanvasSectionEditorProps {
  backgroundImageUrl: string | null;
  sections: CanvasSection[];
  onSectionsChange: (sections: CanvasSection[]) => void;
  onAnalyzeRequest?: () => void;
}

type Tool = "select" | "rectangle" | "circle" | "rounded-rectangle";

const SECTION_COLORS = [
  "#4F46E5", "#7C3AED", "#DB2777", "#DC2626", 
  "#EA580C", "#D97706", "#65A30D", "#059669",
  "#0891B2", "#0284C7", "#6366F1", "#8B5CF6",
];

export function CanvasSectionEditor({
  backgroundImageUrl,
  sections,
  onSectionsChange,
  onAnalyzeRequest,
}: CanvasSectionEditorProps) {
  const [selectedTool, setSelectedTool] = useState<Tool>("select");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [tempRect, setTempRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; sectionX: number; sectionY: number } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  const getCanvasCoords = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100 / scale;
    const y = ((e.clientY - rect.top) / rect.height) * 100 / scale;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }, [scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const coords = getCanvasCoords(e);

    if (selectedTool === "select") {
      // Check if clicking on a section
      const clickedSection = sections.find(s => {
        const { x, y, width, height } = s.position;
        return coords.x >= x && coords.x <= x + width && 
               coords.y >= y && coords.y <= y + height;
      });

      if (clickedSection) {
        setSelectedSection(clickedSection.id);
        setIsDragging(true);
        setDragStart({ 
          x: coords.x, 
          y: coords.y, 
          sectionX: clickedSection.position.x,
          sectionY: clickedSection.position.y 
        });
      } else {
        setSelectedSection(null);
      }
    } else {
      // Drawing mode
      setIsDrawing(true);
      setDrawStart(coords);
      setTempRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
    }
  }, [selectedTool, sections, getCanvasCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    if (isDrawing && drawStart) {
      const width = coords.x - drawStart.x;
      const height = coords.y - drawStart.y;
      setTempRect({
        x: width >= 0 ? drawStart.x : coords.x,
        y: height >= 0 ? drawStart.y : coords.y,
        width: Math.abs(width),
        height: Math.abs(height),
      });
    }

    if (isDragging && selectedSection && dragStart) {
      const deltaX = coords.x - dragStart.x;
      const deltaY = coords.y - dragStart.y;
      
      onSectionsChange(sections.map(s => {
        if (s.id !== selectedSection) return s;
        const newX = Math.max(0, Math.min(100 - s.position.width, dragStart.sectionX + deltaX));
        const newY = Math.max(0, Math.min(100 - s.position.height, dragStart.sectionY + deltaY));
        return { ...s, position: { ...s.position, x: newX, y: newY } };
      }));
    }

    if (isResizing && selectedSection && resizeHandle && dragStart) {
      const section = sections.find(s => s.id === selectedSection);
      if (!section) return;

      const deltaX = coords.x - dragStart.x;
      const deltaY = coords.y - dragStart.y;
      
      let newPos = { ...section.position };

      if (resizeHandle.includes("e")) {
        newPos.width = Math.max(5, dragStart.sectionX + deltaX);
      }
      if (resizeHandle.includes("s")) {
        newPos.height = Math.max(5, dragStart.sectionY + deltaY);
      }
      if (resizeHandle.includes("w")) {
        const newWidth = Math.max(5, section.position.width - deltaX);
        newPos.x = section.position.x + (section.position.width - newWidth);
        newPos.width = newWidth;
      }
      if (resizeHandle.includes("n")) {
        const newHeight = Math.max(5, section.position.height - deltaY);
        newPos.y = section.position.y + (section.position.height - newHeight);
        newPos.height = newHeight;
      }

      onSectionsChange(sections.map(s => 
        s.id === selectedSection ? { ...s, position: newPos } : s
      ));
    }
  }, [isDrawing, drawStart, isDragging, isResizing, selectedSection, dragStart, resizeHandle, sections, getCanvasCoords, onSectionsChange]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing && tempRect && tempRect.width > 2 && tempRect.height > 2) {
      const newSection: CanvasSection = {
        id: `section_${Date.now()}`,
        title: `Section ${sections.length + 1}`,
        description: "Click to edit description",
        shape: selectedTool === "circle" ? "circle" : selectedTool === "rounded-rectangle" ? "rounded-rectangle" : "rectangle",
        position: tempRect,
        color: SECTION_COLORS[sections.length % SECTION_COLORS.length],
      };
      onSectionsChange([...sections, newSection]);
      setSelectedSection(newSection.id);
      setSelectedTool("select");
    }

    setIsDrawing(false);
    setDrawStart(null);
    setTempRect(null);
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setDragStart(null);
  }, [isDrawing, tempRect, selectedTool, sections, onSectionsChange]);

  const handleResizeStart = useCallback((e: React.MouseEvent, sectionId: string, handle: string) => {
    e.stopPropagation();
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    setSelectedSection(sectionId);
    setIsResizing(true);
    setResizeHandle(handle);
    const coords = getCanvasCoords(e);
    setDragStart({
      x: coords.x,
      y: coords.y,
      sectionX: section.position.width,
      sectionY: section.position.height,
    });
  }, [sections, getCanvasCoords]);

  const updateSection = useCallback((id: string, updates: Partial<CanvasSection>) => {
    onSectionsChange(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [sections, onSectionsChange]);

  const deleteSection = useCallback((id: string) => {
    onSectionsChange(sections.filter(s => s.id !== id));
    if (selectedSection === id) setSelectedSection(null);
  }, [sections, selectedSection, onSectionsChange]);

  const handleAnalyzeImage = async () => {
    if (!backgroundImageUrl) {
      toast.error("Please upload a background image first");
      return;
    }

    setAnalyzing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error("Please sign in to use AI analysis");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-canvas-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ imageUrl: backgroundImageUrl }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Analysis failed");
      }

      const result = await response.json();
      
      if (result.sections && Array.isArray(result.sections)) {
        const newSections: CanvasSection[] = result.sections.map((s: any, index: number) => ({
          id: s.id || `section_${Date.now()}_${index}`,
          title: s.title || `Section ${index + 1}`,
          description: s.description || "",
          shape: s.shape || "rectangle",
          position: {
            x: s.position?.x ?? 0,
            y: s.position?.y ?? 0,
            width: s.position?.width ?? 20,
            height: s.position?.height ?? 20,
          },
          color: s.color || SECTION_COLORS[index % SECTION_COLORS.length],
        }));
        
        onSectionsChange(newSections);
        toast.success(`AI detected ${newSections.length} sections`);
      } else {
        toast.error("AI couldn't detect sections in this image");
      }
    } catch (error) {
      console.error("Image analysis error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze image");
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedSectionData = sections.find(s => s.id === selectedSection);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-1">
          <Button
            variant={selectedTool === "select" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedTool("select")}
            title="Select & Move"
          >
            <MousePointer className="h-4 w-4" />
          </Button>
          <Button
            variant={selectedTool === "rectangle" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedTool("rectangle")}
            title="Draw Rectangle"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={selectedTool === "rounded-rectangle" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedTool("rounded-rectangle")}
            title="Draw Rounded Rectangle"
          >
            <Square className="h-4 w-4 rounded" />
          </Button>
          <Button
            variant={selectedTool === "circle" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedTool("circle")}
            title="Draw Circle/Ellipse"
          >
            <Circle className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyzeImage}
            disabled={!backgroundImageUrl || analyzing}
            title="AI Analyze Image"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-1" />
            )}
            AI Detect
          </Button>

          <Button
            variant={showPreview ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            title="Preview Mode"
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.min(2, s + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setScale(1)}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Canvas Area */}
        <div className="overflow-auto rounded-xl border border-border bg-muted/30" style={{ maxHeight: "60vh" }}>
          <div
            ref={canvasRef}
            className={cn(
              "relative origin-top-left",
              selectedTool !== "select" && "cursor-crosshair"
            )}
            style={{
              width: 800 * scale,
              height: 600 * scale,
              backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundColor: backgroundImageUrl ? "hsl(var(--muted))" : "hsl(var(--card))",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Render sections */}
            {sections.map((section) => (
              <div
                key={section.id}
                className={cn(
                  "absolute border-2 transition-shadow cursor-move group",
                  selectedSection === section.id && "ring-2 ring-primary ring-offset-2",
                  section.shape === "circle" && "rounded-full",
                  section.shape === "rounded-rectangle" && "rounded-xl"
                )}
                style={{
                  left: `${section.position.x * scale}%`,
                  top: `${section.position.y * scale}%`,
                  width: `${section.position.width * scale}%`,
                  height: `${section.position.height * scale}%`,
                  backgroundColor: `${section.color}33`,
                  borderColor: section.color,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSection(section.id);
                }}
              >
                {/* Section label */}
                <div 
                  className="absolute inset-0 flex items-center justify-center p-2 pointer-events-none"
                >
                  <span 
                    className="text-xs font-medium text-center truncate px-1 py-0.5 rounded"
                    style={{ 
                      backgroundColor: section.color,
                      color: "white",
                      maxWidth: "90%",
                    }}
                  >
                    {section.title}
                  </span>
                </div>

                {/* Resize handles (only for selected section in edit mode) */}
                {selectedSection === section.id && !showPreview && (
                  <>
                    {["nw", "ne", "sw", "se", "n", "s", "e", "w"].map((handle) => (
                      <div
                        key={handle}
                        className={cn(
                          "absolute w-3 h-3 bg-white border-2 border-primary rounded-sm cursor-pointer z-10",
                          handle === "nw" && "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize",
                          handle === "ne" && "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize",
                          handle === "sw" && "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize",
                          handle === "se" && "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize",
                          handle === "n" && "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-n-resize",
                          handle === "s" && "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize",
                          handle === "e" && "top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-e-resize",
                          handle === "w" && "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-w-resize"
                        )}
                        onMouseDown={(e) => handleResizeStart(e, section.id, handle)}
                      />
                    ))}
                  </>
                )}
              </div>
            ))}

            {/* Temp drawing rect */}
            {tempRect && (
              <div
                className={cn(
                  "absolute border-2 border-dashed border-primary bg-primary/20 pointer-events-none",
                  selectedTool === "circle" && "rounded-full",
                  selectedTool === "rounded-rectangle" && "rounded-xl"
                )}
                style={{
                  left: `${tempRect.x * scale}%`,
                  top: `${tempRect.y * scale}%`,
                  width: `${tempRect.width * scale}%`,
                  height: `${tempRect.height * scale}%`,
                }}
              />
            )}

            {/* No background placeholder */}
            {!backgroundImageUrl && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-muted-foreground/50">
                  <p className="text-lg font-medium">Upload a background image</p>
                  <p className="text-sm">Then draw sections or use AI to detect them</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Properties Panel */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-card">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Type className="h-4 w-4" />
              Section Properties
            </h3>
            
            {selectedSectionData ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={selectedSectionData.title}
                    onChange={(e) => updateSection(selectedSectionData.id, { title: e.target.value })}
                    placeholder="Section title"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={selectedSectionData.description}
                    onChange={(e) => updateSection(selectedSectionData.id, { description: e.target.value })}
                    placeholder="What goes in this section?"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Color</Label>
                  <div className="flex flex-wrap gap-1">
                    {SECTION_COLORS.map((color) => (
                      <button
                        key={color}
                        className={cn(
                          "w-6 h-6 rounded border-2 transition-all",
                          selectedSectionData.color === color ? "border-foreground scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => updateSection(selectedSectionData.id, { color })}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteSection(selectedSectionData.id)}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Section
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a section to edit its properties, or draw a new one using the toolbar.
              </p>
            )}
          </div>

          {/* Sections List */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <h3 className="font-semibold mb-3">Sections ({sections.length})</h3>
            <div className="space-y-1 max-h-40 overflow-auto">
              {sections.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sections yet</p>
              ) : (
                sections.map((section) => (
                  <button
                    key={section.id}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm hover:bg-muted transition-colors",
                      selectedSection === section.id && "bg-muted"
                    )}
                    onClick={() => setSelectedSection(section.id)}
                  >
                    <div 
                      className="w-3 h-3 rounded-sm shrink-0" 
                      style={{ backgroundColor: section.color }} 
                    />
                    <span className="truncate">{section.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
