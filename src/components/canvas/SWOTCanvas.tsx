import { useState, useCallback, useEffect, useRef } from "react";
import { Plus, Download, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyNote, stickyColors } from "./StickyNote";
import { exportToPPT, exportToPDF, type StickyNoteData, type CanvasExportData } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SWOTCanvasProps {
  projectId?: string;
  toolId?: string;
  initialData?: Record<string, StickyNoteData[]>;
  onSave?: (data: Record<string, StickyNoteData[]>, options?: { silent?: boolean }) => Promise<void> | void;
}

const sections = [
  { id: "strengths", name: "Strengths", color: "bg-green-50 border-green-200", icon: "💪", description: "Internal positive attributes" },
  { id: "weaknesses", name: "Weaknesses", color: "bg-red-50 border-red-200", icon: "⚠️", description: "Internal areas for improvement" },
  { id: "opportunities", name: "Opportunities", color: "bg-blue-50 border-blue-200", icon: "🎯", description: "External factors to leverage" },
  { id: "threats", name: "Threats", color: "bg-orange-50 border-orange-200", icon: "⚡", description: "External risks to mitigate" },
];

export function SWOTCanvas({ projectId, toolId, initialData, onSave }: SWOTCanvasProps) {
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
      position: { x: 10 + Math.random() * 80, y: 60 + Math.random() * 60 },
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
      title: "SWOT Analysis",
      sections: sections.map((s) => ({
        name: s.name,
        notes: notes[s.id] || [],
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
      await exportToPDF("swot-canvas", "SWOT Analysis");
      toast({ title: "Exported", description: "PDF file downloaded" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold">SWOT Analysis</h2>
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

      <div id="swot-canvas" className="grid grid-cols-2 gap-2 bg-card border border-border rounded-xl p-2">
        {sections.map((section) => (
          <div
            key={section.id}
            className={cn(
              "relative border rounded-lg p-3 min-h-[280px] overflow-hidden",
              section.color
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{section.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{section.name}</h3>
                  <p className="text-xs text-gray-600">{section.description}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => addNote(section.id)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative h-[calc(100%-50px)]">
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
