import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface WidgetLayout {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DashboardPreferences {
  layout: WidgetLayout[];
  hiddenWidgets: string[];
}

const DEFAULT_LAYOUT: WidgetLayout[] = [
  { id: "active-projects", x: 0, y: 0, w: 1, h: 1 },
  { id: "team-members", x: 1, y: 0, w: 1, h: 1 },
  { id: "assessments", x: 2, y: 0, w: 1, h: 1 },
  { id: "utilization", x: 3, y: 0, w: 1, h: 1 },
  { id: "projects-chart", x: 0, y: 1, w: 2, h: 2 },
  { id: "activity-feed", x: 2, y: 1, w: 2, h: 2 },
  { id: "project-progress", x: 0, y: 3, w: 2, h: 2 },
  { id: "risks-issues", x: 2, y: 3, w: 2, h: 2 },
  { id: "calendar", x: 0, y: 5, w: 1, h: 2 },
  { id: "quick-actions", x: 1, y: 5, w: 3, h: 2 },
];

export function useDashboardPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [layout, setLayout] = useState<WidgetLayout[]>(DEFAULT_LAYOUT);
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load preferences
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from("dashboard_preferences")
          .select("layout_json, hidden_widgets")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const layoutData = data.layout_json as unknown as WidgetLayout[] | null;
          if (layoutData && Array.isArray(layoutData) && layoutData.length > 0) {
            setLayout(layoutData);
          }
          setHiddenWidgets(data.hidden_widgets || []);
        }
      } catch (error) {
        console.error("Error loading dashboard preferences:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  // Save preferences
  const savePreferences = useCallback(
    async (newLayout: WidgetLayout[], newHiddenWidgets: string[]) => {
      if (!user) return;

      setSaving(true);
      try {
        // Check if preference exists first
        const { data: existing } = await supabase
          .from("dashboard_preferences")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        let error;
        if (existing) {
          // Update existing
          const result = await supabase
            .from("dashboard_preferences")
            .update({
              layout_json: newLayout as unknown as Json,
              hidden_widgets: newHiddenWidgets,
            })
            .eq("user_id", user.id);
          error = result.error;
        } else {
          // Insert new
          const result = await supabase
            .from("dashboard_preferences")
            .insert([{
              user_id: user.id,
              layout_json: newLayout as unknown as Json,
              hidden_widgets: newHiddenWidgets,
            }]);
          error = result.error;
        }

        if (error) throw error;
      } catch (error) {
        console.error("Error saving dashboard preferences:", error);
        toast({
          title: "Failed to save preferences",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    },
    [user, toast]
  );

  const updateLayout = useCallback(
    (newLayout: WidgetLayout[]) => {
      setLayout(newLayout);
      savePreferences(newLayout, hiddenWidgets);
    },
    [hiddenWidgets, savePreferences]
  );

  const toggleWidgetVisibility = useCallback(
    (widgetId: string) => {
      const newHidden = hiddenWidgets.includes(widgetId)
        ? hiddenWidgets.filter((id) => id !== widgetId)
        : [...hiddenWidgets, widgetId];
      setHiddenWidgets(newHidden);
      savePreferences(layout, newHidden);
    },
    [hiddenWidgets, layout, savePreferences]
  );

  const resetToDefault = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    setHiddenWidgets([]);
    savePreferences(DEFAULT_LAYOUT, []);
    toast({ title: "Dashboard reset to default" });
  }, [savePreferences, toast]);

  return {
    layout,
    hiddenWidgets,
    loading,
    saving,
    updateLayout,
    toggleWidgetVisibility,
    resetToDefault,
  };
}
