import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Plus, Sparkles, Save, Download, FileText, Pencil, Trash2, X, ChevronDown, SlidersHorizontal, FileSpreadsheet, Presentation, RotateCcw, Eye, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

export type DetailLevel = "high-level" | "medium" | "detailed";
export type GroupByOption = "category" | "quadrant" | "priority";

/** Rich context from assessment data to feed the AI */
export interface AssessmentContext {
  dimensions: Array<{
    name: string;
    score: number;
    target: number;
    questionScores: Array<{ question: string; score: number; target: number }>;
  }>;
  projectName?: string;
  projectDescription?: string;
  industry?: string;
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
  /** Rich assessment context for AI-powered recommendations */
  assessmentContext?: AssessmentContext;
  /** Key for localStorage persistence when onSave is not provided */
  storageKey?: string;
  /** Render items as sized bubbles instead of pills. priorityScore controls bubble diameter. */
  bubbleMode?: boolean;
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

function getQuadrant(item: MatrixItem) {
  if (item.impact >= 50 && item.effort >= 50) return "1. Quick Wins";
  if (item.impact >= 50 && item.effort < 50) return "2. Strategic";
  if (item.impact < 50 && item.effort >= 50) return "3. Opportunistic";
  return "4. Deprioritise";
}

export function PrioritisationMatrix({ projectId, toolId, initialData, onSave, defaultItems, compact, maxItems, assessmentContext, storageKey, bubbleMode }: PrioritisationMatrixProps) {
  const { toast } = useToast();

  // Load persisted data from localStorage if storageKey is provided
  const loadedFromStorage = useMemo(() => {
    if (!storageKey) return null;
    try {
      const stored = localStorage.getItem(`pmatrix-${storageKey}`);
      if (stored) return JSON.parse(stored) as PrioritisationMatrixData;
    } catch { /* ignore */ }
    return null;
  }, [storageKey]);

  const [items, setItems] = useState<MatrixItem[]>(loadedFromStorage?.items || initialData?.items || defaultItems || []);
  const [axisLabels, setAxisLabels] = useState(loadedFromStorage?.axisLabels || initialData?.axisLabels || { xLabel: "Implementation Effort", yLabel: "Business Impact / Value" });
  const [editingItem, setEditingItem] = useState<MatrixItem | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [displayCount, setDisplayCount] = useState<number>(maxItems || 0);
  const [detailLevel, setDetailLevel] = useState<DetailLevel>("medium");
  const [groupBy, setGroupBy] = useState<GroupByOption>("category");
  const [detailItem, setDetailItem] = useState<MatrixItem | null>(null);
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

  // Group visible items by selected grouping
  const groupedItems = useMemo(() => {
    const groups: Record<string, MatrixItem[]> = {};
    const getGroupKey = (item: MatrixItem) => {
      switch (groupBy) {
        case "quadrant":
          return getQuadrant(item);
        case "priority": {
          const p = item.priorityScore ?? 0;
          if (p >= 4) return "High Priority (4-5)";
          if (p >= 2) return "Medium Priority (2-3)";
          return "Low Priority (0-1)";
        }
        case "category":
        default:
          return item.category || "Uncategorised";
      }
    };
    visibleItems.forEach(item => {
      const key = getGroupKey(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    // Sort groups
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      if (groupBy === "quadrant") {
        return a.localeCompare(b); // 1. Quick Wins, 2. Strategic, etc.
      }
      if (groupBy === "priority") {
        const order = ["High Priority (4-5)", "Medium Priority (2-3)", "Low Priority (0-1)"];
        return order.indexOf(a) - order.indexOf(b);
      }
      return a.localeCompare(b);
    });
    return Object.fromEntries(sorted);
  }, [visibleItems, groupBy]);

  // New item form state
  const [newItem, setNewItem] = useState<Partial<MatrixItem>>({ title: "", description: "", effort: 50, impact: 50, category: "" });

  // Autosave to onSave callback and/or localStorage
  useEffect(() => {
    if (!onSave && !storageKey) return;
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      const data = { items, axisLabels };
      if (storageKey) {
        try { localStorage.setItem(`pmatrix-${storageKey}`, JSON.stringify(data)); } catch { /* ignore */ }
      }
      if (onSave) onSave(data, { silent: true });
    }, 800);
    return () => { if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current); };
  }, [items, axisLabels, onSave, storageKey]);

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
    setAiLoading(true);
    try {
      const detailRange = detailLevel === "high-level" ? { min: 5, max: 10 } : detailLevel === "medium" ? { min: 11, max: 25 } : { min: 25, max: 50 };
      
      const body: any = {
        detailLevel,
        itemCountRange: detailRange,
        assessmentContext: assessmentContext || null,
      };

      // Also pass existing items if any, so AI can refine
      if (items.length > 0) {
        body.existingItems = items.map(i => ({ id: i.id, title: i.title, description: i.description, category: i.category }));
      }

      const { data, error } = await supabase.functions.invoke("prioritisation-ai", { body });
      if (error) throw error;
      if (data?.recommendations) {
        const newItems: MatrixItem[] = data.recommendations.map((rec: any, idx: number) => ({
          id: rec.id || `ai-${Date.now()}-${idx}`,
          title: rec.title,
          description: rec.description,
          effort: rec.effort,
          impact: rec.impact,
          category: rec.category || "Neutral",
          priorityScore: rec.priorityScore,
        }));
        setItems(newItems);
        setDisplayCount(0); // show all
        toast({ title: "AI Recommendations Generated", description: `${newItems.length} initiatives plotted based on assessment insights.` });
      }
    } catch (err) {
      console.error("AI recommendation error:", err);
      toast({ title: "AI Error", description: "Could not generate recommendations. Try again later.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  // Reset: wipe AI items and localStorage, restore clean survey data
  const handleReset = useCallback(() => {
    if (storageKey) {
      try { localStorage.removeItem(`pmatrix-${storageKey}`); } catch { /* ignore */ }
    }
    const cleanItems = defaultItems || [];
    setItems(cleanItems);
    setDisplayCount(0);
    toast({ title: "Matrix Reset", description: "AI recommendations cleared. Showing clean survey data." });
  }, [storageKey, defaultItems, toast]);

  const handleExportPDF = async () => {
    try {
      await exportToPDF("prioritisation-matrix", "Prioritisation Matrix");
      toast({ title: "Exported", description: "PDF file downloaded" });
    } catch { toast({ title: "Error", description: "Failed to export", variant: "destructive" }); }
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      
      // Summary sheet data
      const summaryData = visibleItems.map(item => ({
        "Priority": item.priorityScore ?? "",
        "Title": item.title,
        "Description": item.description || "",
        "Category": item.category || "Uncategorised",
        "Quadrant": getQuadrant(item),
        "Impact (0-100)": Math.round(item.impact),
        "Effort (0=High, 100=Low)": Math.round(item.effort),
      }));

      // Quadrant breakdown sheets
      const quadrants = ["1. Quick Wins", "2. Strategic", "3. Opportunistic", "4. Deprioritise"];
      
      const wb = XLSX.utils.book_new();
      
      // All items sheet
      const ws = XLSX.utils.json_to_sheet(summaryData);
      ws["!cols"] = [
        { wch: 8 }, { wch: 35 }, { wch: 60 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "All Initiatives");

      // Per-quadrant sheets
      quadrants.forEach(q => {
        const qItems = visibleItems.filter(i => getQuadrant(i) === q);
        if (qItems.length === 0) return;
        const qData = qItems.map(item => ({
          "Priority": item.priorityScore ?? "",
          "Title": item.title,
          "Description": item.description || "",
          "Category": item.category || "",
          "Impact": Math.round(item.impact),
          "Effort": Math.round(item.effort),
        }));
        const qws = XLSX.utils.json_to_sheet(qData);
        qws["!cols"] = [{ wch: 8 }, { wch: 35 }, { wch: 60 }, { wch: 15 }, { wch: 10 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, qws, q.replace(/^\d+\.\s*/, ""));
      });

      XLSX.writeFile(wb, "Prioritisation_Matrix.xlsx");
      toast({ title: "Exported", description: "Excel file downloaded" });
    } catch (err) {
      console.error("Excel export error:", err);
      toast({ title: "Error", description: "Failed to export Excel", variant: "destructive" });
    }
  };

  const handleExportPPT = async () => {
    try {
      const pptxgen = (await import("pptxgenjs")).default;
      const pptx = new pptxgen();
      pptx.title = "Prioritisation Matrix";
      pptx.author = "Consulting Workbench";

      // Title slide
      const titleSlide = pptx.addSlide();
      titleSlide.addText("Prioritisation Matrix", { x: 0.5, y: 2, w: "90%", h: 1.5, fontSize: 36, bold: true, color: "1a365d", align: "center" });
      titleSlide.addText(`${visibleItems.length} initiatives · Generated ${new Date().toLocaleDateString()}`, { x: 0.5, y: 3.8, w: "90%", fontSize: 14, color: "666666", align: "center" });

      // Matrix overview slide with quadrant summary
      const overviewSlide = pptx.addSlide();
      overviewSlide.addText("Matrix Overview", { x: 0.5, y: 0.3, w: "90%", fontSize: 24, bold: true, color: "1a365d" });

      const quadrants = ["1. Quick Wins", "2. Strategic", "3. Opportunistic", "4. Deprioritise"];
      const qColors: Record<string, string> = { "1. Quick Wins": "10B981", "2. Strategic": "F59E0B", "3. Opportunistic": "3B82F6", "4. Deprioritise": "EF4444" };
      
      quadrants.forEach((q, idx) => {
        const qItems = visibleItems.filter(i => getQuadrant(i) === q);
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        overviewSlide.addText(q, { x: 0.5 + col * 4.5, y: 1.2 + row * 2.5, w: 4, fontSize: 14, bold: true, color: qColors[q] });
        if (qItems.length > 0) {
          overviewSlide.addText(
            qItems.map(i => ({ text: `${i.title}${i.description ? ` – ${i.description.slice(0, 80)}` : ""}`, options: { bullet: true, indentLevel: 0 } })),
            { x: 0.5 + col * 4.5, y: 1.6 + row * 2.5, w: 4, fontSize: 10, color: "333333", valign: "top" }
          );
        } else {
          overviewSlide.addText("No items", { x: 0.5 + col * 4.5, y: 1.6 + row * 2.5, w: 4, fontSize: 10, color: "999999", italic: true });
        }
      });

      // Detail slides per quadrant
      quadrants.forEach(q => {
        const qItems = visibleItems.filter(i => getQuadrant(i) === q);
        if (qItems.length === 0) return;
        const slide = pptx.addSlide();
        slide.addText(q, { x: 0.5, y: 0.3, w: "90%", fontSize: 22, bold: true, color: qColors[q] });
        
        const rows: any[][] = [
          [
            { text: "#", options: { bold: true, fontSize: 9, fill: { color: "f3f4f6" } } },
            { text: "Initiative", options: { bold: true, fontSize: 9, fill: { color: "f3f4f6" } } },
            { text: "Description", options: { bold: true, fontSize: 9, fill: { color: "f3f4f6" } } },
            { text: "Category", options: { bold: true, fontSize: 9, fill: { color: "f3f4f6" } } },
          ],
        ];
        qItems.forEach(item => {
          rows.push([
            { text: String(item.priorityScore ?? ""), options: { fontSize: 9 } },
            { text: item.title, options: { fontSize: 9 } },
            { text: item.description || "", options: { fontSize: 8, color: "555555" } },
            { text: item.category || "", options: { fontSize: 9 } },
          ]);
        });
        
        slide.addTable(rows, { x: 0.5, y: 1.0, w: 9, colW: [0.5, 2.5, 4.5, 1.5], border: { pt: 0.5, color: "cccccc" }, autoPage: true });
      });

      await pptx.writeFile({ fileName: "Prioritisation_Matrix.pptx" });
      toast({ title: "Exported", description: "PowerPoint file downloaded" });
    } catch (err) {
      console.error("PPT export error:", err);
      toast({ title: "Error", description: "Failed to export PowerPoint", variant: "destructive" });
    }
  };


  return (
    <TooltipProvider>
      <div className={cn("space-y-4 transition-all duration-500", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {!compact && <h2 className="text-xl font-display font-semibold">Prioritisation Matrix</h2>}
          <div className="flex gap-2 flex-wrap ml-auto items-center">
            {/* AI Detail level selector */}
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={detailLevel} onValueChange={v => setDetailLevel(v as DetailLevel)}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Detail level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high-level">High-level (5–10)</SelectItem>
                  <SelectItem value="medium">Medium (11–25)</SelectItem>
                  <SelectItem value="detailed">Detailed (25–50)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Display count filter */}
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
            <Button variant="outline" size="sm" onClick={handleReset} className="transition-transform duration-200 hover:scale-105">
              <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
            {!compact && (
              <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" /> Export to PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPPT}>
                  <Presentation className="h-4 w-4 mr-2" /> Export to PowerPoint
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              <span>{bubbleMode ? `Low ${axisLabels.xLabel}` : "High Effort"}</span>
              <span className="font-medium text-foreground/60">{axisLabels.xLabel}</span>
              <span>{bubbleMode ? `High ${axisLabels.xLabel}` : "Low Effort"}</span>
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
              {visibleItems.map((item, idx) => {
                // Bubble size: map priorityScore (0-100) to pixel diameter (24-64)
                const bubbleDiameter = bubbleMode && item.priorityScore != null
                  ? Math.max(28, Math.min(64, 24 + (item.priorityScore / 100) * 40))
                  : 0;

                return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    {bubbleMode ? (
                      <div
                        className={cn(
                          "absolute rounded-full border-2 flex items-center justify-center select-none z-10",
                          "transition-all duration-300 ease-out",
                          "hover:shadow-lg hover:z-20 hover:scale-110",
                          draggingId === item.id ? "shadow-xl z-30 scale-110 cursor-grabbing ring-2 ring-primary/40" : "cursor-grab",
                          getCategoryStyle(item.category),
                          mounted ? "opacity-100" : "opacity-0",
                        )}
                        style={{
                          left: `${item.effort}%`,
                          top: `${100 - item.impact}%`,
                          width: bubbleDiameter,
                          height: bubbleDiameter,
                          transform: `translate(-50%, -50%)${draggingId === item.id ? " scale(1.1)" : ""}`,
                          transitionDelay: mounted ? `${300 + idx * 80}ms` : "0ms",
                        }}
                        onMouseDown={(e) => handleMouseDown(e, item.id)}
                        onDoubleClick={() => setEditingItem(item)}
                      >
                        <span className="text-[9px] font-bold leading-tight text-center px-0.5 truncate"
                          style={{ maxWidth: bubbleDiameter - 6 }}
                        >
                          {item.title.length > 8 ? item.title.slice(0, 6) + "…" : item.title}
                        </span>
                      </div>
                    ) : (
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
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px] animate-scale-in">
                    <p className="font-semibold">{item.title}</p>
                    {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                    <p className="text-xs mt-1">Quadrant: {getQuadrant(item)}</p>
                    <p className="text-xs text-muted-foreground">Double-click to edit · Drag to reposition</p>
                  </TooltipContent>
                </Tooltip>
                );
              })}

              {visibleItems.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center animate-fade-in">
                  <div className="text-center text-muted-foreground">
                    <p className="text-sm font-medium">No items yet</p>
                    <p className="text-xs">Click "Add Item" or use "AI Recommend" to populate</p>
                  </div>
                </div>
              )}
            </div>

            {/* X-axis label - only show when no inline label */}
            {!bubbleMode && (
              <div className="text-center text-xs text-muted-foreground font-semibold mt-2 tracking-wider uppercase">
                {axisLabels.xLabel}
              </div>
            )}
          </div>
        </div>

        {/* Collapsible item list with group-by selector */}
        {visibleItems.length > 0 && (
          <div className="space-y-3">
            {/* Group-by selector */}
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Group by:</span>
              <div className="flex gap-1">
                {([
                  { value: "category", label: "Category" },
                  { value: "quadrant", label: "Quadrant" },
                  { value: "priority", label: "Priority" },
                ] as const).map((opt) => (
                  <Button
                    key={opt.value}
                    variant={groupBy === opt.value ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => setGroupBy(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {Object.entries(groupedItems).map(([group, grpItems], catIdx) => (
              <Collapsible key={group} defaultOpen>
                <CollapsibleTrigger className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-sm font-semibold transition-all duration-300 hover:shadow-sm group",
                  groupBy === "category" ? getCategoryStyle(group) : "bg-muted/50 border-border text-foreground",
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                )} style={{ transitionDelay: mounted ? `${500 + catIdx * 100}ms` : "0ms" }}>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                  <span>{group}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{grpItems.length}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-4 mt-1 space-y-1">
                    {grpItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start gap-2 px-3 py-2 rounded-lg border text-sm transition-all duration-300 hover:shadow-md hover:scale-[1.01] cursor-pointer",
                          "bg-card border-border/60",
                          mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                        )}
                        style={{ transitionDelay: mounted ? `${600 + catIdx * 100 + idx * 40}ms` : "0ms" }}
                        onClick={() => setDetailItem(item)}
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
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 transition-transform hover:scale-110" onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive transition-transform hover:scale-110" onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}>
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

        {/* Item Detail Sheet */}
        <Sheet open={!!detailItem} onOpenChange={(open) => { if (!open) setDetailItem(null); }}>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            {detailItem && (
              <>
                <SheetHeader>
                  <SheetTitle className="text-lg">{detailItem.title}</SheetTitle>
                </SheetHeader>
                <div className="space-y-5 mt-6">
                  {/* Category & Quadrant */}
                  <div className="flex gap-2 flex-wrap">
                    {detailItem.category && (
                      <Badge className={cn("text-xs", getCategoryStyle(detailItem.category))}>{detailItem.category}</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{getQuadrant(detailItem)}</Badge>
                  </div>

                  {/* Description */}
                  {detailItem.description && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</Label>
                      <p className="text-sm leading-relaxed">{detailItem.description}</p>
                    </div>
                  )}

                  {/* Scores grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 p-3 rounded-lg border bg-muted/30">
                      <span className="text-xs text-muted-foreground">Priority Score</span>
                      <p className="text-2xl font-bold">{detailItem.priorityScore ?? "—"}</p>
                    </div>
                    <div className="space-y-1 p-3 rounded-lg border bg-muted/30">
                      <span className="text-xs text-muted-foreground">Quadrant</span>
                      <p className="text-sm font-semibold mt-1">{getQuadrant(detailItem)}</p>
                    </div>
                  </div>

                  {/* Position */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Matrix Position</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg border bg-muted/30">
                        <span className="text-xs text-muted-foreground block">{axisLabels.xLabel || "Effort"}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${detailItem.effort}%` }} />
                          </div>
                          <span className="text-xs font-medium w-8 text-right">{Math.round(detailItem.effort)}</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border bg-muted/30">
                        <span className="text-xs text-muted-foreground block">{axisLabels.yLabel || "Impact"}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${detailItem.impact}%` }} />
                          </div>
                          <span className="text-xs font-medium w-8 text-right">{Math.round(detailItem.impact)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingItem(detailItem); setDetailItem(null); }}>
                      <Pencil className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => { deleteItem(detailItem.id); setDetailItem(null); }}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

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
