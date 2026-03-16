import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Download, Share2, Loader2,
  LayoutDashboard, Users, Grid3X3, FileSpreadsheet, CheckSquare, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToPDF } from "@/lib/exportUtils";
import { toast } from "sonner";
import { DashboardOverview } from "@/components/maturity/DashboardOverview";
import { EntityCards } from "@/components/maturity/EntityCards";
import { UseCasesView } from "@/components/maturity/UseCasesView";
import { DashboardHeatmap } from "@/components/maturity/DashboardHeatmap";
import { TechStackView } from "@/components/maturity/TechStackView";
import { DashboardDataTab } from "@/components/maturity/DashboardDataTab";

type ViewId = "overview" | "entities" | "usecases" | "heatmap" | "techstack" | "data";

export default function MaturityDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<ViewId>("overview");
  const [exporting, setExporting] = useState(false);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["maturity-dashboard", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("maturity_dashboards").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: capabilities } = useQuery({
    queryKey: ["maturity-capabilities", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("maturity_dashboard_capabilities").select("*").eq("dashboard_id", id!).order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: entities } = useQuery({
    queryKey: ["maturity-entities", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("maturity_dashboard_entities").select("*").eq("dashboard_id", id!).order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!dashboard) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-muted-foreground">Dashboard not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/maturity-dashboards")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const caps = capabilities || [];
  const ents = entities || [];
  const hasEntities = ents.length > 0;
  const meta = (dashboard.metadata as any) || {};
  const useCases: any[] = meta.use_cases || [];
  const hasUseCases = useCases.length > 0;

  // Derive dimension names from capabilities
  const dimensions = caps.map(c => c.name);
  // Derive use case domains
  const ucDomains = [...new Set(useCases.map((u: any) => u.domain))];

  const views: { id: ViewId; label: string; icon: any; show: boolean }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, show: true },
    { id: "entities", label: "AI Maturity", icon: Users, show: hasEntities },
    { id: "usecases", label: "Use Cases", icon: CheckSquare, show: hasUseCases },
    { id: "heatmap", label: "Heatmap", icon: Grid3X3, show: hasEntities && hasUseCases },
    { id: "techstack", label: "Tech Stacks", icon: Layers, show: hasEntities },
    { id: "data", label: "Data", icon: FileSpreadsheet, show: true },
  ];

  const handleExport = async () => {
    setExporting(true);
    try { await exportToPDF("maturity-dashboard-content", dashboard.title); } finally { setExporting(false); }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: dashboard.title, url });
    else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
  };

  const handleImport = async (newEntities: any[], newUseCases: any[]) => {
    // Update entities
    if (newEntities.length > 0) {
      await supabase.from("maturity_dashboard_entities" as any).delete().eq("dashboard_id", id!);
      const entsToInsert = newEntities.map((e: any, i: number) => ({
        dashboard_id: id!, name: e.name, region: e.region, overall_score: e.overall_score || 0,
        tier: e.tier, description: e.description, dimension_scores: e.dimension_scores || {},
        tags: e.tags || [], tech_stack: e.tech_stack || [], key_use_cases: e.key_use_cases || [],
        investment_level: e.investment_level, ai_leader: e.ai_leader,
        sources: e.sources || [], order_index: i,
      }));
      const { error } = await supabase.from("maturity_dashboard_entities" as any).insert(entsToInsert);
      if (error) throw error;
    }

    // Update capabilities (derive dimensions from entity dimension_scores keys)
    if (newEntities.length > 0) {
      const allDimKeys = new Set<string>();
      newEntities.forEach(e => Object.keys(e.dimension_scores || {}).forEach(k => allDimKeys.add(k)));
      if (allDimKeys.size > 0) {
        await supabase.from("maturity_dashboard_capabilities").delete().eq("dashboard_id", id!);
        const capsToInsert = [...allDimKeys].map((name, i) => ({
          dashboard_id: id!, name, score: 0, source_type: "ai_research", order_index: i,
        }));
        await supabase.from("maturity_dashboard_capabilities").insert(capsToInsert);
      }
    }

    // Update use cases in metadata
    if (newUseCases.length > 0) {
      await supabase.from("maturity_dashboards").update({
        metadata: { ...meta, use_cases: newUseCases },
      }).eq("id", id!);
    }

    queryClient.invalidateQueries({ queryKey: ["maturity-capabilities", id] });
    queryClient.invalidateQueries({ queryKey: ["maturity-entities", id] });
    queryClient.invalidateQueries({ queryKey: ["maturity-dashboard", id] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/maturity-dashboards")}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> All dashboards
          </button>
          <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1 overflow-x-auto">
            {views.filter(v => v.show).map(v => (
              <button key={v.id} onClick={() => setCurrentView(v.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  currentView === v.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}>
                <v.icon className="h-3.5 w-3.5" /> {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            <Download className="h-3.5 w-3.5" /> {exporting ? "Exporting…" : "PDF"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleShare}>
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
        </div>
      </div>

      <div id="maturity-dashboard-content">
        {currentView === "overview" && (
          <DashboardOverview dashboard={dashboard} entities={ents} dimensions={dimensions}
            useCases={useCases} onSwitchView={(v) => setCurrentView(v as ViewId)} />
        )}
        {currentView === "entities" && (
          <EntityCards entities={ents} dimensions={dimensions} useCases={useCases} />
        )}
        {currentView === "usecases" && (
          <UseCasesView useCases={useCases} />
        )}
        {currentView === "heatmap" && (
          <DashboardHeatmap entities={ents} useCases={useCases} domains={ucDomains} />
        )}
        {currentView === "techstack" && (
          <TechStackView entities={ents} onSelectEntity={(entityId) => setCurrentView("entities")} />
        )}
        {currentView === "data" && (
          <DashboardDataTab dashboard={dashboard} entities={ents} dimensions={dimensions}
            useCases={useCases} onImport={handleImport} />
        )}
      </div>
    </div>
  );
}
