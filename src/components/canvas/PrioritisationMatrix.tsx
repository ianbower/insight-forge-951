import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Plus, Sparkles, Save, Download, FileText, Pencil, Trash2, X, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { exportToPDF, type CanvasExportData } from "@/lib/exportUtils";

export interface MatrixItem {
  id: string;
  title: string;
  description?: string;
  effort: number;   // 0-100 (0=high effort left, 100=low effort right)
  impact: number;   // 0-100 (0=low bottom, 100=high top)
  category?: string;
  priorityScore?: number;
}

export interface PrioritisationMatrixData {
  items: MatrixItem[];
  axisLabels?: {
    xLabel?: string;
    yLabel?: string;
  };
}

interface PrioritisationMatrixProps {
  projectId?: string;
  toolId?: string;
  initialData?: PrioritisationMatrixData;
  onSave?: (data: PrioritisationMatrixData, options?: { silent?: boolean }) => Promise<void> | void;
  /** Pre-populate items (e.g. from assessment dimensions). Won't overwrite user edits. */
  defaultItems?: MatrixItem[];
  /** Hide toolbar actions not relevant in embedded contexts */
  compact?: boolean;
  /** Maximum number of items to show (controls level of detail). All items kept, but only top N displayed on matrix. */
  maxItems?: number;
}

const QUADRANT_META = [
  { label: "2. Strategic Roadmap", sub: "High Impact · High Effort", x: "left", y: "top" },
  { label: "1. Tactical – Quick Wins", sub: "High Impact · Low Effort", x: "right", y: "top" },
  { label: "4. Deprioritise", sub: "Low Impact · High Effort", x: "left", y: "bottom" },
  { label: "3. Opportunistic", sub: "Low Impact · Low Effort", x: "right", y: "bottom" },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Analyse": "bg-sky-100 border-sky-400 text-sky-800",
  "Design": "bg-indigo-100 border-indigo-400 text-indigo-800",
  "Develop": "bg-emerald-100 border-emerald-400 text-emerald-800",
  "Test": "bg-cyan-100 border-cyan-400 text-cyan-800",
  "Deploy": "bg-slate-100 border-slate-400 text-slate-800",
  "Strength": "bg-emerald-100 border-emerald-400 text-emerald-800",
  "Gap": "bg-red-100 border-red-400 text-red-800",
  "Neutral": "bg-amber-100 border-amber-400 text-amber-800",
  "default": "bg-primary/10 border-primary text-primary",
};

function getCategoryStyle(category?: string) {
  if (!category) return CATEGORY_COLORS["default"];
  return CATEGORY_COLORS[category] || CATEGORY_COLORS["default"];
}

export function PrioritisationMatrix({ projectId, toolId, initialData, onSave, defaultItems, compact, maxItems }: PrioritisationMatrixProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<MatrixItem[]>(initialData?.items || defaultItems || []);
  const [axisLabels, setAxisLabels] = useState(initialData?.axisLabels || { xLabel: "Implementation Effort", yLabel: "Business Impact / Value" });
  const [editingItem, setEditingItem] = useState<MatrixItem | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [displayCount, setDisplayCount] = useState<number>(maxItems || 0);
  const matrixRef = useRef<HTMLDivElement>(null);
  const autosaveTimerRef = useRef<number | null>(null);

  // Entrance animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Visible items filtered by displayCount (0 = show all)
  const visibleItems = useMemo(() => {
    if (!displayCount || displayCount >= items.length) return items;
    // Sort by priority score descending (highest priority first), then by impact descending
    return [...items]
      .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0) || b.impact - a.impact)
      .slice(0, displayCount);
  }, [items, displayCount]);

  // Group visible items by category for the collapsible list
  const groupedItems = useMemo(() => {
    const groups: Record<string, MatrixItem[]> = {};
    visibleItems.forEach(item => {
      const cat = item.category || "Uncategorised";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [visibleItems]);

  // New item form state
  const [newItem, setNewItem] = useState<Partial<MatrixItem>>({ title: "", description: "", effort: 50, impact: 50, category: "" });

  // Autosave
  useEffect(() => {
    if (!onSave) return;
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      onSave({ items, axisLabels }, { silent: true });
    }, 800);
    return () => { if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current); };
  }, [items, axisLabels, onSave]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.({ items, axisLabels });
    } finally {
      setSaving(false);
    }
  };

  const addItem = useCallback(() => {
    if (!newItem.title?.trim()) return;
    const item: MatrixItem = {
      id: `item-${Date.now()}`,
      title: newItem.title!.trim(),
      description: newItem.description,
      effort: newItem.effort ?? 50,
      impact: newItem.impact ?? 50,
      category: newItem.category,
      priorityScore: newItem.priorityScore,
    };
    setItems(prev => [...prev, item]);
    setNewItem({ title: "", description: "", effort: 50, impact: 50, category: "" });
    setShowAddDialog(false);
  }, [newItem]);

  const updateItem = useCallback((updated: MatrixItem) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    setEditingItem(null);
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setEditingItem(null);
  }, []);

  // Drag to reposition on the matrix
  const handleMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setDraggingId(id);
  }, []);

  useEffect(() => {
    if (!draggingId) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!matrixRef.current) return;
      const rect = matrixRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, 100 - ((e.clientY - rect.top) / rect.height) * 100));
      setItems(prev => prev.map(i => i.id === draggingId ? { ...i, effort: x, impact: y } : i));
    };
    const handleMouseUp = () => setDraggingId(null);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [draggingId]);

  // AI Recommend
  const handleAIRecommend = async () => {
    if (items.length === 0) {
      toast({ title: "No items", description: "Add items first, then AI can recommend their placement.", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("prioritisation-ai", {
        body: { items: items.map(i => ({ id: i.id, title: i.title, description: i.description, category: i.category })) },
      });
      if (error) throw error;
      if (data?.recommendations) {
        setItems(prev => prev.map(item => {
          const rec = data.recommendations.find((r: any) => r.id === item.id);
          if (rec) return { ...item, effort: rec.effort, impact: rec.impact, priorityScore: rec.priorityScore };
          return item;
        }));
        toast({ title: "AI Recommendations Applied", description: "Items repositioned based on AI analysis." });
      }
    } catch (err) {
      console.error("AI recommendation error:", err);
      toast({ title: "AI Error", description: "Could not generate recommendations. Try again later.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      await exportToPDF("prioritisation-matrix", "Prioritisation Matrix");
      toast({ title: "Exported", description: "PDF file downloaded" });
    } catch { toast({ title: "Error", description: "Failed to export", variant: "destructive" }); }
  };

  const getQuadrant = (item: MatrixItem) => {
    if (item.impact >= 50 && item.effort >= 50) return "1. Quick Wins";
    if (item.impact >= 50 && item.effort < 50) return "2. Strategic";
    if (item.impact < 50 && item.effort >= 50) return "3. Opportunistic";
    return "4. Deprioritise";
  };

  return (
    <TooltipProvider>
      <div className={cn("space-y-4 transition-all duration-500", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {!compact && <h2 className="text-xl font-display font-semibold">Prioritisation Matrix</h2>}
          <div className="flex gap-2 flex-wrap ml-auto items-center">
            {/* Level of detail selector */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={String(displayCount)} onValueChange={v => setDisplayCount(Number(v))}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Show items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All items ({items.length})</SelectItem>
                  {[5, 10, 15, 20, 25].filter(n => n < items.length).map(n => (
                    <SelectItem key={n} value={String(n)}>Top {n} items</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)} className="transition-transform duration-200 hover:scale-105">
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
            <Button variant="outline" size="sm" onClick={handleAIRecommend} disabled={aiLoading} className="transition-transform duration-200 hover:scale-105">
              <Sparkles className={cn("h-4 w-4 mr-1", aiLoading && "animate-spin")} /> {aiLoading ? "Analysing..." : "AI Recommend"}
            </Button>
            {!compact && (
              <>
                <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-1" /> Export PDF
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Matrix */}
        <div id="prioritisation-matrix" className="relative bg-card border border-border rounded-xl p-4">
          {/* Y-axis label */}
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground font-semibold whitespace-nowrap tracking-wider uppercase">
            {axisLabels.yLabel}
          </div>

          <div className="ml-6">
            {/* Axis markers */}
            <div className="flex justify-between text-xs text-muted-foreground mb-1 px-1">
              <span>High Effort</span>
              <span>Low Effort</span>
            </div>

            {/* Matrix area */}
            <div
              ref={matrixRef}
              className={cn(
                "relative w-full border border-border/60 rounded-lg overflow-hidden transition-all duration-700",
                mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"
              )}
              style={{ aspectRatio: "2 / 1", minHeight: compact ? 260 : 320 }}
            >
              {/* Quadrant backgrounds with staggered entrance */}
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                {[
                  { bg: "bg-amber-500/5", label: "2. Strategic Roadmap", sub: "High Impact · High Effort", delay: "delay-100" },
                  { bg: "bg-emerald-500/8", label: "1. Tactical – Quick Wins", sub: "High Impact · Low Effort", delay: "delay-200" },
                  { bg: "bg-red-500/5", label: "4. Deprioritise", sub: "Low Impact · High Effort", delay: "delay-300" },
                  { bg: "bg-sky-500/5", label: "3. Opportunistic", sub: "Low Impact · Low Effort", delay: "delay-500" },
                ].map((q, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center justify-center p-2 transition-all duration-500",
                      q.bg,
                      idx === 0 && "border-r border-b border-dashed border-border/50",
                      idx === 1 && "border-b border-dashed border-border/50",
                      idx === 2 && "border-r border-dashed border-border/50",
                      mounted ? "opacity-100" : "opacity-0",
                      q.delay
                    )}
                  >
                    <div className="text-center opacity-40 select-none">
                      <p className="text-sm font-semibold text-foreground">{q.label}</p>
                      <p className="text-xs text-muted-foreground">{q.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Crosshair lines */}
              <div className={cn("absolute left-1/2 top-0 bottom-0 w-px bg-border transition-all duration-700", mounted ? "scale-y-100" : "scale-y-0")} style={{ transformOrigin: "top" }} />
              <div className={cn("absolute top-1/2 left-0 right-0 h-px bg-border transition-all duration-700", mounted ? "scale-x-100" : "scale-x-0")} style={{ transformOrigin: "left" }} />

              {/* Items with staggered entrance animation */}
              {visibleItems.map((item, idx) => (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "absolute flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium select-none z-10",
                        "transition-all duration-300 ease-out",
                        "hover:shadow-lg hover:z-20 hover:scale-110",
                        draggingId === item.id ? "shadow-xl z-30 scale-110 cursor-grabbing ring-2 ring-primary/40" : "cursor-grab",
                        getCategoryStyle(item.category),
                        mounted ? "opacity-100" : "opacity-0",
                      )}
                      style={{
                        left: `${item.effort}%`,
                        top: `${100 - item.impact}%`,
                        transform: `translate(-50%, -50%)${draggingId === item.id ? " scale(1.1)" : ""}`,
                        maxWidth: 180,
                        transitionDelay: mounted ? `${300 + idx * 80}ms` : "0ms",
                      }}
                      onMouseDown={(e) => handleMouseDown(e, item.id)}
                      onDoubleClick={() => setEditingItem(item)}
                    >
                      {item.priorityScore != null && (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-background/80 border text-[10px] font-bold shrink-0 transition-transform duration-200 hover:scale-125">
                          {item.priorityScore}
                        </span>
                      )}
                      <span className="truncate">{item.title}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px] animate-scale-in">
                    <p className="font-semibold">{item.title}</p>
                    {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                    <p className="text-xs mt-1">Quadrant: {getQuadrant(item)}</p>
                    <p className="text-xs text-muted-foreground">Double-click to edit · Drag to reposition</p>
                  </TooltipContent>
                </Tooltip>
              ))}

              {visibleItems.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center animate-fade-in">
                  <div className="text-center text-muted-foreground">
                    <p className="text-sm font-medium">No items yet</p>
                    <p className="text-xs">Click "Add Item" or use "AI Recommend" to populate</p>
                  </div>
                </div>
              )}
            </div>

            {/* X-axis label */}
            <div className="text-center text-xs text-muted-foreground font-semibold mt-2 tracking-wider uppercase">
              {axisLabels.xLabel}
            </div>
          </div>
        </div>

        {/* Collapsible categorised item list */}
        {visibleItems.length > 0 && (
          <div className="space-y-2">
            {Object.entries(groupedItems).map(([category, catItems], catIdx) => (
              <Collapsible key={category} defaultOpen>
                <CollapsibleTrigger className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-sm font-semibold transition-all duration-300 hover:shadow-sm group",
                  getCategoryStyle(category),
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                )} style={{ transitionDelay: mounted ? `${500 + catIdx * 100}ms` : "0ms" }}>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                  <span>{category}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{catItems.length}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-4 mt-1 space-y-1">
                    {catItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start gap-2 px-3 py-2 rounded-lg border text-sm transition-all duration-300 hover:shadow-md hover:scale-[1.01]",
                          "bg-card border-border/60",
                          mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                        )}
                        style={{ transitionDelay: mounted ? `${600 + catIdx * 100 + idx * 40}ms` : "0ms" }}
                      >
                        {item.priorityScore != null && (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold shrink-0 mt-0.5">
                            {item.priorityScore}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium block truncate">{item.title}</span>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">{getQuadrant(item)}</Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 transition-transform hover:scale-110" onClick={() => setEditingItem(item)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive transition-transform hover:scale-110" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Category legend */}
        {!compact && (
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            <span className="font-medium">Categories:</span>
            {Object.entries(CATEGORY_COLORS).filter(([k]) => k !== "default").map(([cat, style]) => (
              <span key={cat} className={cn("px-2 py-0.5 rounded border transition-transform hover:scale-105", style)}>{cat}</span>
            ))}
          </div>
        )}

        {/* Add Item Dialog */}
        <ItemDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          item={newItem}
          onChange={setNewItem}
          onSubmit={addItem}
          title="Add Item"
          submitLabel="Add"
        />

        {/* Edit Item Dialog */}
        {editingItem && (
          <ItemDialog
            open={!!editingItem}
            onOpenChange={(open) => { if (!open) setEditingItem(null); }}
            item={editingItem}
            onChange={(changes) => setEditingItem(prev => prev ? { ...prev, ...changes } : null)}
            onSubmit={() => editingItem && updateItem(editingItem)}
            onDelete={() => editingItem && deleteItem(editingItem.id)}
            title="Edit Item"
            submitLabel="Update"
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// Reusable item dialog
function ItemDialog({
  open, onOpenChange, item, onChange, onSubmit, onDelete, title, submitLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Partial<MatrixItem>;
  onChange: (item: any) => void;
  onSubmit: () => void;
  onDelete?: () => void;
  title: string;
  submitLabel: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md animate-scale-in">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={item.title || ""} onChange={e => onChange({ ...item, title: e.target.value })} placeholder="e.g. Code migration" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={item.description || ""} onChange={e => onChange({ ...item, description: e.target.value })} placeholder="Brief description..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={item.category || ""} onValueChange={v => onChange({ ...item, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Analyse">Analyse</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Develop">Develop</SelectItem>
                  <SelectItem value="Test">Test</SelectItem>
                  <SelectItem value="Deploy">Deploy</SelectItem>
                  <SelectItem value="Strength">Strength</SelectItem>
                  <SelectItem value="Gap">Gap</SelectItem>
                  <SelectItem value="Neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority Score</Label>
              <Input type="number" min={1} max={5} value={item.priorityScore ?? ""} onChange={e => onChange({ ...item, priorityScore: e.target.value ? Number(e.target.value) : undefined })} placeholder="1-5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Effort Position (0=High, 100=Low)</Label>
              <Input type="number" min={0} max={100} value={item.effort ?? 50} onChange={e => onChange({ ...item, effort: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Impact Position (0=Low, 100=High)</Label>
              <Input type="number" min={0} max={100} value={item.impact ?? 50} onChange={e => onChange({ ...item, impact: Number(e.target.value) })} />
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
          <Button onClick={onSubmit} disabled={!item.title?.trim()}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
