import { useState, useCallback } from "react";
import { Plus, Download, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyNote, stickyColors } from "./StickyNote";
import { exportToPPT, exportToPDF, type StickyNoteData, type CanvasExportData } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface OperatingModelCanvasProps {
  projectId?: string;
  toolId?: string;
  initialData?: Record<string, StickyNoteData[]>;
  onSave?: (data: Record<string, StickyNoteData[]>) => void;
}

const sections = [
  { id: "value-delivery", name: "Value Delivery", color: "bg-emerald-50 border-emerald-300", description: "How we create and deliver value to customers" },
  { id: "organization", name: "Organization", color: "bg-sky-50 border-sky-300", description: "Structure, roles, and governance" },
  { id: "information", name: "Information", color: "bg-violet-50 border-violet-300", description: "Data, analytics, and knowledge management" },
  { id: "suppliers", name: "Suppliers & Partners", color: "bg-amber-50 border-amber-300", description: "External relationships and sourcing" },
  { id: "locations", name: "Locations", color: "bg-rose-50 border-rose-300", description: "Geographic presence and facilities" },
  { id: "management-system", name: "Management System", color: "bg-cyan-50 border-cyan-300", description: "Planning, performance, and decision-making" },
];

export function OperatingModelCanvas({ projectId, toolId, initialData, onSave }: OperatingModelCanvasProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Record<string, StickyNoteData[]>>(initialData || {});
  const [saving, setSaving] = useState(false);

  const addNote = useCallback((sectionId: string) => {
    const colorIndex = Math.floor(Math.random() * stickyColors.length);
    const newNote: StickyNoteData = {
      id: `note-${Date.now()}`,
      content: "",
      color: stickyColors[colorIndex],
      position: { x: 10 + Math.random() * 60, y: 50 + Math.random() * 40 },
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

  const handleSave = async () => {
    setSaving(true);
    try {
      if (projectId && toolId) {
        const { error } = await supabase
          .from("tool_data")
          .upsert({
            project_id: projectId,
            tool_id: toolId,
            content_json: notes,
          }, { onConflict: "project_id,tool_id" });
        
        if (error) throw error;
      }
      onSave?.(notes);
      toast({ title: "Saved", description: "Operating Model Canvas saved successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleExportPPT = async () => {
    const exportData: CanvasExportData = {
      title: "Operating Model Canvas",
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
      await exportToPDF("omc-canvas", "Operating Model Canvas");
      toast({ title: "Exported", description: "PDF file downloaded" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold">Operating Model Canvas</h2>
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

      <div id="omc-canvas" className="grid grid-cols-3 gap-2 bg-card border border-border rounded-xl p-2">
        {sections.map((section) => (
          <div
            key={section.id}
            className={cn(
              "relative border-2 rounded-lg p-3 min-h-[220px] overflow-hidden",
              section.color
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">{section.name}</h3>
                <p className="text-[10px] text-gray-600 leading-tight">{section.description}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => addNote(section.id)}
              >
                <Plus className="h-3 w-3" />
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
