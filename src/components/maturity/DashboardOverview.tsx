import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GaugeCircle, Factory, ShieldCheck, Users, ArrowUpRight } from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

interface Entity {
  id: string;
  name: string;
  overall_score: number;
  tier: string | null;
  dimension_scores: Record<string, number>;
}

interface Capability {
  id: string;
  name: string;
  score: number;
  target_score: number | null;
  source_type: string;
  source_detail: string | null;
  owner: string | null;
  summary: string | null;
}

interface Props {
  dashboard: any;
  capabilities: Capability[];
  entities: Entity[];
  onSwitchView: (view: string) => void;
}

const maturityBandFor = (score: number, max = 5) => {
  const pct = (score / max) * 100;
  if (pct >= 80) return "Leading";
  if (pct >= 60) return "Scaling";
  return "Foundational";
};

export function DashboardOverview({ dashboard, capabilities, entities, onSwitchView }: Props) {
  const hasEntities = entities.length > 0;
  const snapshotMetrics = (dashboard.snapshot_metrics as any) || {};
  const recommendedMoves = (dashboard.recommended_moves as string[]) || [];

  // Calculate avg score
  const avgScore = hasEntities
    ? (entities.reduce((s, e) => s + Number(e.overall_score), 0) / entities.length)
    : capabilities.length
      ? (capabilities.reduce((s, c) => s + Number(c.score), 0) / capabilities.length)
      : 0;

  const maxScore = hasEntities ? 100 : 5;
  const topEntity = hasEntities
    ? [...entities].sort((a, b) => Number(b.overall_score) - Number(a.overall_score))[0]
    : null;

  // Radar data from capabilities
  const radarData = capabilities.map((c) => ({
    name: c.name.length > 18 ? c.name.slice(0, 16) + "…" : c.name,
    score: Number(c.score),
    target: c.target_score ? Number(c.target_score) : undefined,
  }));

  // Leaderboard data from entities
  const leaderboard = [...entities]
    .sort((a, b) => Number(b.overall_score) - Number(a.overall_score))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="navy-panel relative overflow-hidden rounded-[2rem] px-6 py-8 text-white sm:px-8">
        <div className="hero-grid absolute inset-0 opacity-25" />
        <div className="relative max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
            <GaugeCircle className="h-3.5 w-3.5" />
            {dashboard.industry || "General"}
          </div>
          <h1 className="font-display text-3xl text-white sm:text-4xl">{dashboard.title}</h1>
          {dashboard.subtitle && (
            <p className="max-w-2xl text-base text-white/72">{dashboard.subtitle}</p>
          )}
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="enterprise-card rounded-[1.75rem]">
          <CardContent className="p-5">
            <GaugeCircle className="h-6 w-6 text-primary" />
            <p className="mt-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">Maturity Band</p>
            <p className="mt-2 font-display text-2xl text-primary">{maturityBandFor(avgScore, maxScore)}</p>
            <Badge className="mt-2 bg-primary text-primary-foreground hover:bg-primary">
              Avg {avgScore.toFixed(1)}/{maxScore}
            </Badge>
          </CardContent>
        </Card>

        {hasEntities && (
          <Card className="enterprise-card rounded-[1.75rem]">
            <CardContent className="p-5">
              <Users className="h-6 w-6 text-primary" />
              <p className="mt-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">Entities Assessed</p>
              <p className="mt-2 font-display text-2xl text-primary">{entities.length}</p>
            </CardContent>
          </Card>
        )}

        <Card className="enterprise-card rounded-[1.75rem]">
          <CardContent className="p-5">
            <Factory className="h-6 w-6 text-primary" />
            <p className="mt-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">
              {hasEntities ? "Top Entity" : "Priority Domain"}
            </p>
            <p className="mt-2 font-display text-xl text-primary">
              {hasEntities ? topEntity?.name : snapshotMetrics.priority_domain || "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="enterprise-card rounded-[1.75rem]">
          <CardContent className="p-5">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <p className="mt-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">
              {hasEntities ? "Dimensions" : "Strongest Signal"}
            </p>
            <p className="mt-2 font-display text-xl text-primary">
              {hasEntities ? capabilities.length : snapshotMetrics.strongest_signal || "—"}
            </p>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leaderboard or Capability list */}
        {hasEntities ? (
          <Card className="enterprise-card rounded-[1.75rem]">
            <CardHeader className="pb-3">
              <CardTitle className="text-primary">Maturity Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((e, i) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-[1.25rem] border border-border/50 bg-card p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{e.name}</p>
                      {e.tier && <Badge variant="outline" className="text-[10px]">{e.tier}</Badge>}
                    </div>
                    <span className="font-display text-xl text-primary">{Number(e.overall_score).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="enterprise-card rounded-[1.75rem]">
            <CardHeader className="pb-3">
              <CardTitle className="text-primary">Capability Scoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {capabilities.slice(0, 5).map((cap) => (
                <div key={cap.id} className="rounded-[1.25rem] border border-border/50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground text-sm">{cap.name}</p>
                    <span className="font-display text-xl text-primary">{Number(cap.score).toFixed(1)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-primary/10">
                    <div className="h-2 rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${(Number(cap.score) / 5) * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Radar chart */}
        {radarData.length > 2 && (
          <Card className="enterprise-card rounded-[1.75rem]">
            <CardHeader className="pb-3">
              <CardTitle className="text-primary">Maturity Radar</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
                  <Radar name="Current" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                  {radarData.some(d => d.target) && (
                    <Radar name="Target" dataKey="target" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.15} strokeDasharray="4 4" />
                  )}
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recommended Moves */}
      {recommendedMoves.length > 0 && (
        <Card className="enterprise-card rounded-[1.75rem]">
          <CardHeader className="pb-3">
            <CardTitle className="text-primary">Recommended Next Moves</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {recommendedMoves.map((move, i) => (
              <div key={i} className="flex gap-3 rounded-[1.25rem] bg-primary/5 p-4">
                <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm text-foreground">{move}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
