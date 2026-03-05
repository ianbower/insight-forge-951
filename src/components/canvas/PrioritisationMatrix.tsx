import { useState, useCallback, useEffect, useRef } from "react";
import { Plus, Sparkles, Save, Download, FileText, Pencil, Trash2, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { exportToPPT, exportToPDF, type CanvasExportData } from "@/lib/exportUtils";

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
}

const QUADRANT_LABELS = [
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
  "default": "bg-primary/10 border-primary text-primary",
};

function getCategoryStyle(category?: string) {
  if (!category) return CATEGORY_COLORS["default"];
  return CATEGORY_COLORS[category] || CATEGORY_COLORS["default"];
}

export function PrioritisationMatrix({ projectId, toolId, initialData, onSave }: PrioritisationMatrixProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<MatrixItem[]>(initialData?.items || []);
  const [axisLabels, setAxisLabels] = useState(initialData?.axisLabels || { xLabel: "Implementation Effort", yLabel: "Business Impact / Value" });
  const [editingItem, setEditingItem] = useState<MatrixItem | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const matrixRef = useRef<HTMLDivElement>(null);
  const autosaveTimerRef = useRef<number | null>(null);

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
    if (item.impact >= 50 && item.effort >= 50) return "1. Tactical – Quick Wins";
    if (item.impact >= 50 && item.effort < 50) return "2. Strategic Roadmap";
    if (item.impact < 50 && item.effort >= 50) return "3. Opportunistic";
    return "4. Deprioritise";
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl font-display font-semibold">Prioritisation Matrix</h2>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
            <Button variant="outline" size="sm" onClick={handleAIRecommend} disabled={aiLoading}>
              <Sparkles className="h-4 w-4 mr-1" /> {aiLoading ? "Analysing..." : "AI Recommend"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-1" /> Export PDF
            </Button>
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
              className="relative w-full border border-border/60 rounded-lg overflow-hidden"
              style={{ aspectRatio: "2 / 1", minHeight: 320 }}
            >
              {/* Quadrant backgrounds */}
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                <div className="border-r border-b border-dashed border-border/50 bg-amber-500/5 flex items-center justify-center p-2">
                  <div className="text-center opacity-40">
                    <p className="text-sm font-semibold text-foreground">2. Strategic Roadmap</p>
                    <p className="text-xs text-muted-foreground">High Impact · High Effort</p>
                  </div>
                </div>
                <div className="border-b border-dashed border-border/50 bg-emerald-500/8 flex items-center justify-center p-2">
                  <div className="text-center opacity-40">
                    <p className="text-sm font-semibold text-foreground">1. Tactical – Quick Wins</p>
                    <p className="text-xs text-muted-foreground">High Impact · Low Effort</p>
                  </div>
                </div>
                <div className="border-r border-dashed border-border/50 bg-red-500/5 flex items-center justify-center p-2">
                  <div className="text-center opacity-40">
                    <p className="text-sm font-semibold text-foreground">4. Deprioritise</p>
                    <p className="text-xs text-muted-foreground">Low Impact · High Effort</p>
                  </div>
                </div>
                <div className="bg-sky-500/5 flex items-center justify-center p-2">
                  <div className="text-center opacity-40">
                    <p className="text-sm font-semibold text-foreground">3. Opportunistic</p>
                    <p className="text-xs text-muted-foreground">Low Impact · Low Effort</p>
                  </div>
                </div>
              </div>

              {/* Crosshair lines */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />

              {/* Items */}
              {items.map((item) => (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "absolute flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium cursor-grab select-none transition-shadow z-10",
                        "hover:shadow-md hover:z-20",
                        draggingId === item.id && "shadow-lg z-30 cursor-grabbing",
                        getCategoryStyle(item.category)
                      )}
                      style={{
                        left: `${item.effort}%`,
                        top: `${100 - item.impact}%`,
                        transform: "translate(-50%, -50%)",
                        maxWidth: 180,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, item.id)}
                      onDoubleClick={() => setEditingItem(item)}
                    >
                      {item.priorityScore != null && (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-background/80 border text-[10px] font-bold shrink-0">
                          {item.priorityScore}
                        </span>
                      )}
                      <span className="truncate">{item.title}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px]">
                    <p className="font-semibold">{item.title}</p>
                    {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                    <p className="text-xs mt-1">Quadrant: {getQuadrant(item)}</p>
                    <p className="text-xs text-muted-foreground">Double-click to edit · Drag to reposition</p>
                  </TooltipContent>
                </Tooltip>
              ))}

              {items.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
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

        {/* Item list below matrix */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {items.map(item => (
              <div key={item.id} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-sm", getCategoryStyle(item.category))}>
                {item.priorityScore != null && (
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-background/80 border text-xs font-bold shrink-0">
                    {item.priorityScore}
                  </span>
                )}
                <span className="font-medium flex-1 truncate">{item.title}</span>
                <Badge variant="outline" className="text-[10px] shrink-0">{getQuadrant(item)}</Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setEditingItem(item)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={() => deleteItem(item.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Category legend */}
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          <span className="font-medium">Categories:</span>
          {Object.entries(CATEGORY_COLORS).filter(([k]) => k !== "default").map(([cat, style]) => (
            <span key={cat} className={cn("px-2 py-0.5 rounded border", style)}>{cat}</span>
          ))}
        </div>

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
      <DialogContent className="sm:max-w-md">
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
