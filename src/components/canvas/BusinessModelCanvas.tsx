import { useState, useCallback, useEffect, useRef } from "react";
import { Plus, Download, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyNote, stickyColors } from "./StickyNote";
import { exportToPPT, exportToPDF, type StickyNoteData, type CanvasExportData } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BusinessModelCanvasProps {
  projectId?: string;
  toolId?: string;
  initialData?: Record<string, StickyNoteData[]>;
  onSave?: (data: Record<string, StickyNoteData[]>, options?: { silent?: boolean }) => Promise<void> | void;
}

const sections = [
  { id: "key-partners", name: "Key Partners", gridArea: "kp", description: "Who are our key partners and suppliers?" },
  { id: "key-activities", name: "Key Activities", gridArea: "ka", description: "What key activities does our value proposition require?" },
  { id: "key-resources", name: "Key Resources", gridArea: "kr", description: "What key resources does our value proposition require?" },
  { id: "value-propositions", name: "Value Propositions", gridArea: "vp", description: "What value do we deliver to the customer?" },
  { id: "customer-relationships", name: "Customer Relationships", gridArea: "cr", description: "What type of relationship does each customer segment expect?" },
  { id: "channels", name: "Channels", gridArea: "ch", description: "Through which channels do our customers want to be reached?" },
  { id: "customer-segments", name: "Customer Segments", gridArea: "cs", description: "For whom are we creating value?" },
  { id: "cost-structure", name: "Cost Structure", gridArea: "cost", description: "What are the most important costs inherent in our business model?" },
  { id: "revenue-streams", name: "Revenue Streams", gridArea: "rev", description: "For what value are our customers willing to pay?" },
];

export function BusinessModelCanvas({ projectId, toolId, initialData, onSave }: BusinessModelCanvasProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Record<string, StickyNoteData[]>>(initialData || {});
  const [saving, setSaving] = useState(false);
  const autosaveTimerRef = useRef<number | null>(null);

  const addNote = useCallback((sectionId: string) => {
    const colorIndex = Math.floor(Math.random() * stickyColors.length);
    const newNote: StickyNoteData = {
      id: `note-${Date.now()}`,
      content: "",
      color: stickyColors[colorIndex],
      position: { x: 10 + Math.random() * 50, y: 40 + Math.random() * 30 },
      section: sectionId,
    };
    setNotes((prev) => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] || []), newNote],
    }));
  }, []);

  const updateNote = useCallback((sectionId: string, noteId: string, content: string) => {
    setNotes((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId]?.map((n) =>
        n.id === noteId ? { ...n, content } : n
      ) || [],
    }));
  }, []);

  const deleteNote = useCallback((sectionId: string, noteId: string) => {
    setNotes((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId]?.filter((n) => n.id !== noteId) || [],
    }));
  }, []);

  const moveNote = useCallback((sectionId: string, noteId: string, position: { x: number; y: number }) => {
    setNotes((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId]?.map((n) =>
        n.id === noteId ? { ...n, position } : n
      ) || [],
    }));
  }, []);

  // Autosave (debounced)
  useEffect(() => {
    if (!onSave) return;
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = window.setTimeout(() => {
      onSave(notes, { silent: true });
    }, 800);

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    };
  }, [notes, onSave]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.(notes);
    } finally {
      setSaving(false);
    }
  };

  const handleExportPPT = async () => {
    const exportData: CanvasExportData = {
      title: "Business Model Canvas",
      sections: sections.map((s) => ({
        name: s.name,
        notes: notes[s.id] || [],
      })),
    };
    try {
      await exportToPPT(exportData);
      toast({ title: "Exported", description: "PowerPoint file downloaded" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export PPT", variant: "destructive" });
    }
  };

  const handleExportPDF = async () => {
    try {
      await exportToPDF("bmc-canvas", "Business Model Canvas");
      toast({ title: "Exported", description: "PDF file downloaded" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export PDF", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold">Business Model Canvas</h2>
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

      {/* Canvas Grid */}
      <div
        id="bmc-canvas"
        className="grid gap-1 bg-card border border-border rounded-xl p-2 overflow-hidden"
        style={{
          gridTemplateColumns: "repeat(5, 1fr)",
          gridTemplateRows: "repeat(3, minmax(180px, auto))",
          gridTemplateAreas: `
            "kp ka vp cr cs"
            "kp kr vp ch cs"
            "cost cost rev rev rev"
          `,
        }}
      >
        {sections.map((section) => (
          <div
            key={section.id}
            className="relative bg-muted/30 border border-border rounded-lg p-2 min-h-[180px] overflow-hidden"
            style={{ gridArea: section.gridArea }}
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="text-xs font-semibold text-foreground">{section.name}</h3>
                <p className="text-[10px] text-muted-foreground leading-tight">{section.description}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => addNote(section.id)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="relative h-[calc(100%-40px)]">
              {notes[section.id]?.map((note) => (
                <StickyNote
                  key={note.id}
                  {...note}
                  onUpdate={(id, content) => updateNote(section.id, id, content)}
                  onDelete={(id) => deleteNote(section.id, id)}
                  onMove={(id, pos) => moveNote(section.id, id, pos)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
