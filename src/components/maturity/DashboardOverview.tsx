import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GaugeCircle, Users, Target, Trophy, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

interface Entity {
  id: string;
  name: string;
  overall_score: number;
  tier: string | null;
  dimension_scores: Record<string, number>;
  tech_stack: any[];
  [key: string]: any;
}

interface Props {
  dashboard: any;
  entities: Entity[];
  dimensions: string[];
  useCases: any[];
  onSwitchView: (view: string) => void;
}

const scoreColor = (score: number) => {
  if (score >= 85) return "hsl(var(--chart-2))";
  if (score >= 75) return "hsl(var(--primary))";
  if (score >= 65) return "hsl(var(--accent))";
  return "hsl(var(--destructive))";
};

const tierStyle = (tier: string) => {
  const map: Record<string, string> = {
    Pioneer: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    Leader: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    "Fast Follower": "bg-amber-500/15 text-amber-500 border-amber-500/30",
    Developer: "bg-orange-500/15 text-orange-500 border-orange-500/30",
    Experimenter: "bg-red-500/15 text-red-500 border-red-500/30",
  };
  return map[tier] || map.Experimenter;
};

export function DashboardOverview({ dashboard, entities, dimensions, useCases, onSwitchView }: Props) {
  const content = (dashboard.metadata as any)?.dashboard_content || {};
  const sorted = [...entities].sort((a, b) => Number(b.overall_score) - Number(a.overall_score));
  const avgScore = entities.length
    ? Math.round(entities.reduce((s, e) => s + Number(e.overall_score), 0) / entities.length)
    : 0;
  const top = sorted[0];
  const domains = new Set(useCases.map((u: any) => u.domain));
  const techCount = entities.reduce((s, e) => s + ((e.tech_stack as any[]) || []).length, 0);

  // Radar: top 3 entities
  const top3 = sorted.slice(0, 3);
  const COLORS = ["hsl(var(--accent))", "hsl(var(--primary))", "hsl(var(--muted-foreground))"];
  const radarData = dimensions.map((dim) => {
    const entry: any = { dimension: dim.length > 12 ? dim.slice(0, 10) + "…" : dim };
    top3.forEach((e, i) => {
      entry[e.name] = (e.dimension_scores || {})[dim] || 0;
    });
    return entry;
  });

  // Bar chart: all entities by dimension
  const barData = dimensions.map((dim) => {
    const entry: any = { dimension: dim.length > 12 ? dim.slice(0, 10) + "…" : dim };
    entities.forEach((e) => {
      entry[e.name] = (e.dimension_scores || {})[dim] || 0;
    });
    return entry;
  });
  const barColors = ["#FFC400", "#19A3FC", "#0072BC", "#CFD8FC", "#7fd1b9", "#E6B600", "#6f7fb7", "#2E404D", "#4d91d0", "#d45a52"];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="font-display text-2xl text-primary">
          {content.overviewTitle || dashboard.title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {content.overviewSubtitle || dashboard.subtitle || ""}
        </p>
      </div>

      {/* Hero Panel */}
      <section className="navy-panel relative overflow-hidden rounded-[2rem] px-6 py-10 text-white sm:px-10">
        <div className="hero-grid absolute inset-0 opacity-25" />
        <div className="relative max-w-3xl space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/50">
            {content.heroEyebrow || dashboard.industry}
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-white">
            {content.heroTitle || dashboard.title}
          </h2>
          <p className="text-sm text-white/70 max-w-2xl leading-relaxed">
            {content.heroCopy || dashboard.subtitle}
          </p>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => onSwitchView("entities")} size="sm">Explore profiles</Button>
            <Button variant="outline" onClick={() => onSwitchView("usecases")} size="sm"
              className="border-white/20 bg-white/5 text-white hover:bg-white hover:text-sidebar-background">
              View use cases
            </Button>
          </div>
          {(content.heroStat1 || content.heroStat2 || content.heroStat3) && (
            <div className="flex gap-6 pt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
              {content.heroStat1 && <span>{content.heroStat1}</span>}
              {content.heroStat2 && <span>{content.heroStat2}</span>}
              {content.heroStat3 && <span>{content.heroStat3}</span>}
            </div>
          )}
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="enterprise-card rounded-[1.75rem]">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Entities Tracked</p>
            <p className="mt-2 font-display text-3xl text-primary">{entities.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Assessed organizations</p>
          </CardContent>
        </Card>
        <Card className="enterprise-card rounded-[1.75rem]">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Avg Maturity Score</p>
            <p className="mt-2 font-display text-3xl text-primary">{avgScore}<span className="text-lg text-muted-foreground">/100</span></p>
            <p className="text-xs text-muted-foreground mt-1">Portfolio average</p>
          </CardContent>
        </Card>
        <Card className="enterprise-card rounded-[1.75rem]">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Use Cases Mapped</p>
            <p className="mt-2 font-display text-3xl text-accent">{useCases.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Across {domains.size} domains</p>
          </CardContent>
        </Card>
        <Card className="enterprise-card rounded-[1.75rem]">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Top Maturity Leader</p>
            <p className="mt-2 font-display text-2xl text-primary">{top?.name || "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">{top ? `Score: ${Number(top.overall_score).toFixed(0)}/100` : ""}</p>
          </CardContent>
        </Card>
        <Card className="enterprise-card rounded-[1.75rem]">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Active Partnerships</p>
            <p className="mt-2 font-display text-3xl text-primary">{techCount}+</p>
            <p className="text-xs text-muted-foreground mt-1">Platform & cloud alliances</p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard + Radar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="enterprise-card rounded-[1.75rem]">
          <CardContent className="p-5">
            <h3 className="font-semibold text-primary mb-1">AI Maturity Leaderboard</h3>
            <p className="text-xs text-muted-foreground mb-4">Overall scores across {dimensions.length} capability dimensions</p>
            <div className="space-y-1">
              {sorted.map((e, i) => (
                <div key={e.id} className="flex items-center gap-3 py-2.5 border-b border-border/30 cursor-pointer hover:bg-muted/30 rounded-lg px-2 transition-colors"
                  onClick={() => onSwitchView("entities")}>
                  <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                  <span className="flex-1 text-sm font-semibold text-foreground">{e.name}</span>
                  {e.tier && (
                    <Badge variant="outline" className={`text-[10px] border ${tierStyle(e.tier)}`}>
                      {e.tier}
                    </Badge>
                  )}
                  <div className="flex items-center gap-2 w-[130px]">
                    <div className="flex-1 h-1.5 rounded-full bg-primary/10">
                      <div className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${Number(e.overall_score)}%`, background: scoreColor(Number(e.overall_score)) }} />
                    </div>
                    <span className="text-xs font-bold text-foreground w-7 text-right">{Number(e.overall_score).toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {dimensions.length > 2 && top3.length > 0 && (
          <Card className="enterprise-card rounded-[1.75rem]">
            <CardContent className="p-5">
              <h3 className="font-semibold text-primary mb-1">Dimension Radar — Top 3</h3>
              <p className="text-xs text-muted-foreground mb-4">{top3.map(e => e.name).join(" · ")}</p>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis angle={30} domain={[40, 100]} tick={{ fontSize: 9 }} />
                  {top3.map((e, i) => (
                    <Radar key={e.name} name={e.name} dataKey={e.name}
                      stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
                  ))}
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bar Chart */}
      {entities.length > 0 && dimensions.length > 0 && (
        <Card className="enterprise-card rounded-[1.75rem]">
          <CardContent className="p-5">
            <h3 className="font-semibold text-primary mb-1">Maturity by Dimension — All Entities</h3>
            <p className="text-xs text-muted-foreground mb-4">Comparative breakdown across capability pillars</p>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dimension" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 10 }} />
                {entities.map((e, i) => (
                  <Bar key={e.name} dataKey={e.name} fill={barColors[i % barColors.length]}
                    radius={[3, 3, 0, 0]} opacity={0.8} />
                ))}
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
