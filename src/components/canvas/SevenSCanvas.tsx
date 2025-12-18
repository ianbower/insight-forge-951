import { useState, useCallback } from "react";
import { Plus, Download, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyNote, stickyColors } from "./StickyNote";
import { exportToPPT, exportToPDF, type StickyNoteData, type CanvasExportData } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SevenSCanvasProps {
  projectId?: string;
  toolId?: string;
  initialData?: Record<string, StickyNoteData[]>;
  onSave?: (data: Record<string, StickyNoteData[]>) => void;
}

const sections = [
  { id: "strategy", name: "Strategy", color: "bg-blue-100 border-blue-300", description: "Plan to build competitive advantage" },
  { id: "structure", name: "Structure", color: "bg-green-100 border-green-300", description: "Organization hierarchy and coordination" },
  { id: "systems", name: "Systems", color: "bg-purple-100 border-purple-300", description: "Daily procedures and processes" },
  { id: "shared-values", name: "Shared Values", color: "bg-yellow-100 border-yellow-300", description: "Core beliefs and attitudes (center)" },
  { id: "style", name: "Style", color: "bg-pink-100 border-pink-300", description: "Leadership approach and culture" },
  { id: "staff", name: "Staff", color: "bg-orange-100 border-orange-300", description: "Employees and their capabilities" },
  { id: "skills", name: "Skills", color: "bg-teal-100 border-teal-300", description: "Competencies of the organization" },
];

export function SevenSCanvas({ projectId, toolId, initialData, onSave }: SevenSCanvasProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Record<string, StickyNoteData[]>>(initialData || {});
  const [saving, setSaving] = useState(false);

  const addNote = useCallback((sectionId: string) => {
    const colorIndex = Math.floor(Math.random() * stickyColors.length);
    const newNote: StickyNoteData = {
      id: `note-${Date.now()}`,
      content: "",
      color: stickyColors[colorIndex],
      position: { x: 10 + Math.random() * 40, y: 50 + Math.random() * 30 },
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
            content_json: JSON.parse(JSON.stringify(notes)),
          }, { onConflict: "project_id,tool_id" });
        
        if (error) throw error;
      }
      onSave?.(notes);
      toast({ title: "Saved", description: "7S Framework saved successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleExportPPT = async () => {
    const exportData: CanvasExportData = {
      title: "McKinsey 7S Framework",
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
      await exportToPDF("7s-canvas", "McKinsey 7S Framework");
      toast({ title: "Exported", description: "PDF file downloaded" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export", variant: "destructive" });
    }
  };

  // Honeycomb-style layout
  const gridSections = [
    { ...sections[0], row: 0, col: 1 },  // Strategy top
    { ...sections[1], row: 1, col: 0 },  // Structure left
    { ...sections[2], row: 1, col: 2 },  // Systems right
    { ...sections[3], row: 1, col: 1 },  // Shared Values center
    { ...sections[4], row: 2, col: 0 },  // Style left
    { ...sections[5], row: 2, col: 2 },  // Staff right
    { ...sections[6], row: 2, col: 1 },  // Skills bottom
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold">McKinsey 7S Framework</h2>
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

      <div id="7s-canvas" className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-3 gap-3 max-w-4xl mx-auto">
          {gridSections.map((section) => (
            <div
              key={section.id}
              className={cn(
                "relative border-2 rounded-xl p-3 min-h-[200px] overflow-hidden transition-all",
                section.color,
                section.id === "shared-values" && "ring-2 ring-primary/30"
              )}
            >
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{section.name}</h3>
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
              <div className="relative h-[calc(100%-45px)]">
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
    </div>
  );
}
