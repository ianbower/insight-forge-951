import { useState, useCallback, useEffect, useRef } from "react";
import { Plus, Download, FileText, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportToPPT, exportToPDF, type CanvasExportData } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface RoadmapItem {
  id: string;
  title: string;
  startMonth: number;
  duration: number;
  track: string;
  color: string;
}

interface TransformationRoadmapProps {
  projectId?: string;
  toolId?: string;
  initialData?: { items: RoadmapItem[]; tracks: string[] };
  onSave?: (data: { items: RoadmapItem[]; tracks: string[] }, options?: { silent?: boolean }) => Promise<void> | void;
}

const defaultTracks = ["Strategy", "Technology", "People", "Process"];
const trackColors = [
  "bg-blue-400",
  "bg-emerald-400",
  "bg-purple-400",
  "bg-orange-400",
  "bg-pink-400",
];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function TransformationRoadmap({ projectId, toolId, initialData, onSave }: TransformationRoadmapProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<RoadmapItem[]>(initialData?.items || []);
  const [tracks, setTracks] = useState<string[]>(initialData?.tracks || defaultTracks);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const hasLoadedRef = useRef(false);

  // Mark initial load complete
  useEffect(() => {
    hasLoadedRef.current = true;
  }, []);

  // Autosave (debounced)
  useEffect(() => {
    if (!onSave) return;
    if (!hasLoadedRef.current) return;
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = window.setTimeout(() => {
      onSave({ items, tracks }, { silent: true });
    }, 800);

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    };
  }, [items, tracks, onSave]);

  const addItem = useCallback((track: string) => {
    const trackIndex = tracks.indexOf(track);
    const newItem: RoadmapItem = {
      id: `item-${Date.now()}`,
      title: "New Initiative",
      startMonth: 0,
      duration: 3,
      track,
      color: trackColors[trackIndex % trackColors.length],
    };
    setItems((prev) => [...prev, newItem]);
    setEditingItem(newItem.id);
  }, [tracks]);

  const updateItem = useCallback((id: string, updates: Partial<RoadmapItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.({ items, tracks });
    } finally {
      setSaving(false);
    }
  };

  const handleExportPPT = async () => {
    const exportData: CanvasExportData = {
      title: "Transformation Roadmap",
      sections: tracks.map((track) => ({
        name: track,
        notes: items
          .filter((item) => item.track === track)
          .map((item) => ({
            id: item.id,
            content: `${item.title} (${months[item.startMonth]} - ${months[(item.startMonth + item.duration - 1) % 12]})`,
            color: "",
            position: { x: 0, y: 0 },
          })),
      })),
    };
    try {
      await exportToPPT(exportData);
      toast({ title: "Exported", description: "PowerPoint file downloaded" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export", variant: "destructive" });
    }
  };

  const handleExportPDF = async () => {
    try {
      await exportToPDF("roadmap-canvas", "Transformation Roadmap");
      toast({ title: "Exported", description: "PDF file downloaded" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold">Transformation Roadmap</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPPT}>
            <Download className="h-4 w-4 mr-2" />
            Export PPT
          </Button>
        </div>
      </div>

      <div id="roadmap-canvas" className="bg-card border border-border rounded-xl p-4 overflow-x-auto">
        {/* Month headers */}
        <div className="flex mb-2 ml-32">
          {months.map((month) => (
            <div
              key={month}
              className="flex-1 min-w-[60px] text-center text-xs font-medium text-muted-foreground border-l border-border px-1"
            >
              {month}
            </div>
          ))}
        </div>

        {/* Tracks */}
        <div className="space-y-2">
          {tracks.map((track, trackIndex) => (
            <div key={track} className="flex items-stretch">
              {/* Track label */}
              <div className="w-32 flex-shrink-0 flex items-center justify-between pr-2">
                <span className="text-sm font-medium truncate">{track}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => addItem(track)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {/* Timeline */}
              <div className="flex-1 relative h-16 bg-muted/30 border border-border rounded">
                {/* Grid lines */}
                <div className="absolute inset-0 flex">
                  {months.map((_, i) => (
                    <div key={i} className="flex-1 border-l border-border/50" />
                  ))}
                </div>

                {/* Items */}
                {items
                  .filter((item) => item.track === track)
                  .map((item) => {
                    const left = (item.startMonth / 12) * 100;
                    const width = (item.duration / 12) * 100;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "absolute top-2 h-12 rounded-md shadow-sm cursor-pointer group transition-all",
                          item.color
                        )}
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          minWidth: "60px",
                        }}
                        onClick={() => setEditingItem(editingItem === item.id ? null : item.id)}
                      >
                        <div className="h-full px-2 py-1 flex items-center justify-between">
                          {editingItem === item.id ? (
                            <Input
                              value={item.title}
                              onChange={(e) => updateItem(item.id, { title: e.target.value })}
                              onBlur={() => setEditingItem(null)}
                              autoFocus
                              className="h-6 text-xs bg-white/80"
                            />
                          ) : (
                            <span className="text-xs font-medium text-white truncate">
                              {item.title}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteItem(item.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-white/80 hover:text-white transition-opacity ml-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        {/* Resize handles */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            // Drag to resize start
                          }}
                        />
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            // Drag to resize end
                          }}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* Duration controls for selected item */}
        {editingItem && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Edit Initiative</p>
            <div className="flex gap-4 items-center">
              <div>
                <label className="text-xs text-muted-foreground">Start Month</label>
                <select
                  className="block mt-1 text-sm border rounded px-2 py-1"
                  value={items.find((i) => i.id === editingItem)?.startMonth || 0}
                  onChange={(e) =>
                    updateItem(editingItem, { startMonth: parseInt(e.target.value) })
                  }
                >
                  {months.map((m, i) => (
                    <option key={m} value={i}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Duration (months)</label>
                <select
                  className="block mt-1 text-sm border rounded px-2 py-1"
                  value={items.find((i) => i.id === editingItem)?.duration || 1}
                  onChange={(e) =>
                    updateItem(editingItem, { duration: parseInt(e.target.value) })
                  }
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
