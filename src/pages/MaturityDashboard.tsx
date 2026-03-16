import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowUpRight, Download, GaugeCircle, Loader2, Share2,
  ShieldCheck, Factory, ArrowLeft, Globe, Lock, Blend,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportToPDF } from "@/lib/exportUtils";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";

type SourceType = "proprietary" | "ai_research" | "blended";

const sourceConfig: Record<SourceType, { label: string; icon: any; className: string }> = {
  proprietary: { label: "Proprietary", icon: Lock, className: "bg-purple-100 text-purple-700 border-purple-200" },
  ai_research: { label: "Public Research", icon: Globe, className: "bg-blue-100 text-blue-700 border-blue-200" },
  blended: { label: "Blended", icon: Blend, className: "bg-amber-100 text-amber-700 border-amber-200" },
};

const maturityBandFor = (score: number) => {
  if (score >= 4) return "Leading";
  if (score >= 3) return "Scaling";
  return "Foundational";
};

const scoreWidth = (score: number) => `${(score / 5) * 100}%`;

function SourceBadge({ type }: { type: SourceType }) {
  const config = sourceConfig[type] || sourceConfig.ai_research;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export default function MaturityDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["maturity-dashboard", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maturity_dashboards")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: capabilities } = useQuery({
    queryKey: ["maturity-capabilities", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maturity_dashboard_capabilities")
        .select("*")
        .eq("dashboard_id", id!)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-muted-foreground">Dashboard not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/maturity-dashboards")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to dashboards
        </Button>
      </div>
    );
  }

  const caps = capabilities || [];
  const avgScore = caps.length ? (caps.reduce((s, c) => s + Number(c.score), 0) / caps.length).toFixed(1) : "0.0";
  const recommendedMoves = (dashboard.recommended_moves as string[]) || [];
  const snapshotMetrics = (dashboard.snapshot_metrics as any) || {};

  const radarData = caps.map((c) => ({
    name: c.name.length > 20 ? c.name.slice(0, 18) + "…" : c.name,
    score: Number(c.score),
    target: c.target_score ? Number(c.target_score) : undefined,
  }));

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToPDF("maturity-dashboard-content", dashboard.title);
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: dashboard.title, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="navy-panel relative overflow-hidden rounded-[2rem] px-6 py-8 text-white sm:px-8">
        <div className="hero-grid absolute inset-0 opacity-25" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <button
              onClick={() => navigate("/maturity-dashboards")}
              className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white/90 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> All dashboards
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
              <GaugeCircle className="h-3.5 w-3.5" />
              {dashboard.industry}
            </div>
            <div>
              <h1 className="font-display text-4xl text-white sm:text-5xl">{dashboard.title}</h1>
              {dashboard.subtitle && (
                <p className="mt-3 max-w-2xl text-base text-white/72 sm:text-lg">{dashboard.subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4" />
              {exporting ? "Exporting…" : "Export PDF"}
            </Button>
            <Button variant="outline" onClick={handleShare} className="border-white/20 bg-white/5 text-white hover:bg-white hover:text-sidebar-background">
              <Share2 className="h-4 w-4" /> Share link
            </Button>
          </div>
        </div>
      </section>

      <div id="maturity-dashboard-content" className="space-y-6">
        {/* Snapshot KPIs */}
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="enterprise-card rounded-[1.75rem]">
            <CardContent className="p-5">
              <GaugeCircle className="h-6 w-6 text-primary" />
              <p className="mt-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">Maturity band</p>
              <p className="mt-2 font-display text-3xl text-primary">{maturityBandFor(Number(avgScore))}</p>
              <Badge className="mt-2 bg-primary text-primary-foreground hover:bg-primary">Average {avgScore}/5</Badge>
            </CardContent>
          </Card>
          <Card className="enterprise-card rounded-[1.75rem]">
            <CardContent className="p-5">
              <Factory className="h-6 w-6 text-primary" />
              <p className="mt-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">Priority domain</p>
              <p className="mt-2 font-display text-3xl text-primary">{snapshotMetrics.priority_domain || "—"}</p>
            </CardContent>
          </Card>
          <Card className="enterprise-card rounded-[1.75rem]">
            <CardContent className="p-5">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <p className="mt-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">Strongest signal</p>
              <p className="mt-2 font-display text-3xl text-primary">{snapshotMetrics.strongest_signal || "—"}</p>
            </CardContent>
          </Card>
        </section>

        {/* Capabilities + Radar */}
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="enterprise-card rounded-[1.75rem]">
            <CardHeader className="pb-3">
              <CardTitle className="text-primary">Capability scoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {caps.map((cap) => (
                <div key={cap.id} className="rounded-[1.5rem] border border-border/70 bg-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{cap.name}</p>
                        <Badge variant="outline">{maturityBandFor(Number(cap.score))}</Badge>
                        <SourceBadge type={cap.source_type as SourceType} />
                      </div>
                      <p className="text-sm text-muted-foreground">{cap.summary}</p>
                      {cap.source_detail && (
                        <p className="text-xs text-muted-foreground/70 italic">{cap.source_detail}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="font-display text-3xl text-primary">{Number(cap.score).toFixed(1)}</p>
                      {cap.owner && (
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{cap.owner}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 h-3 rounded-full bg-primary/10">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: scoreWidth(Number(cap.score)) }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Radar chart */}
            {radarData.length > 2 && (
              <Card className="enterprise-card rounded-[1.75rem]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-primary">Maturity radar</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
                      <Radar name="Current" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                      {radarData.some((d) => d.target) && (
                        <Radar name="Target" dataKey="target" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.15} strokeDasharray="4 4" />
                      )}
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Recommended moves */}
            <Card className="enterprise-card rounded-[1.75rem]">
              <CardHeader className="pb-3">
                <CardTitle className="text-primary">Recommended next moves</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendedMoves.map((move, i) => (
                  <div key={i} className="flex gap-3 rounded-[1.25rem] bg-primary/5 p-4">
                    <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm text-foreground">{move}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
