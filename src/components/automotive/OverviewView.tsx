import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { Company, DIM_KEYS, DIM_NAMES, scoreColor, tierBadgeStyle, DashboardContent } from "@/data/automotiveAIData";
import { CarFront, TrendingUp, Users, Cpu, Trophy, Handshake } from "lucide-react";

interface Props {
  companies: Company[];
  useCasesCount: number;
  domainsCount: number;
  content: DashboardContent;
  onSwitchView: (view: string) => void;
}

export function OverviewView({ companies, useCasesCount, domainsCount, content, onSwitchView }: Props) {
  const sorted = useMemo(() => [...companies].sort((a, b) => b.overallScore - a.overallScore), [companies]);
  const avgScore = useMemo(() => companies.length ? Math.round(companies.reduce((s, c) => s + c.overallScore, 0) / companies.length) : 0, [companies]);
  const topCompany = sorted[0];
  const techCount = useMemo(() => companies.reduce((s, c) => s + (c.techStack?.length || 0), 0), [companies]);
  const top3 = sorted.slice(0, 3);

  const radarData = useMemo(() => {
    const labels = ['Autonomy', 'Manufacturing', 'Software Dev', 'Supply Chain', 'Customer Exp', 'Sustainability'];
    return labels.map((label, i) => {
      const key = DIM_KEYS[i];
      const point: Record<string, any> = { dim: label };
      top3.forEach(c => { point[c.name] = c.dims[key]; });
      return point;
    });
  }, [top3]);

  const barData = useMemo(() => {
    return DIM_KEYS.map((key, i) => {
      const point: Record<string, any> = { dim: Object.values(DIM_NAMES)[i] };
      companies.forEach(c => { point[c.name] = c.dims[key]; });
      return point;
    });
  }, [companies]);

  const barColors = ['#FFC400', '#19A3FC', '#0072BC', '#8b5cf6', '#06b6d4', '#84cc16', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="navy-panel relative overflow-hidden rounded-[2rem] px-6 py-10 text-white sm:px-10">
        <div className="hero-grid absolute inset-0 opacity-20" />
        <div className="relative max-w-3xl space-y-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/60">{content.heroEyebrow}</p>
          <h2 className="font-display text-3xl text-white sm:text-4xl leading-tight">{content.heroTitle}</h2>
          <p className="text-sm text-white/70 sm:text-base leading-relaxed max-w-2xl">{content.heroCopy}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={() => onSwitchView('maturity')} className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-[#E6B600] transition-colors">
              Explore profiles
            </button>
            <button onClick={() => onSwitchView('usecases')} className="rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
              View use cases
            </button>
          </div>
          <div className="flex flex-wrap gap-6 pt-3 text-xs text-white/50 font-medium uppercase tracking-wider">
            <span>{content.heroStat1}</span>
            <span>{content.heroStat2}</span>
            <span>{content.heroStat3}</span>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'OEMs Tracked', value: `${companies.length}`, sub: 'Global automotive leaders', icon: Users, color: 'hsl(var(--accent))' },
          { label: 'Avg AI Maturity Score', value: `${avgScore}`, valueSuffix: '/100', sub: 'Portfolio average', icon: TrendingUp, color: '#14b8a6' },
          { label: 'AI Use Cases Mapped', value: `${useCasesCount}`, sub: `Across ${domainsCount} domains`, icon: Cpu, color: '#f59e0b' },
          { label: 'Top Maturity Leader', value: topCompany?.name || 'N/A', sub: topCompany ? `Score: ${topCompany.overallScore}/100` : '', icon: Trophy, color: '#22c55e' },
          { label: 'Active AI Partnerships', value: `${techCount}+`, sub: 'Platform & partner entries', icon: Handshake, color: '#8b5cf6' },
        ].map(kpi => (
          <Card key={kpi.label} className="enterprise-card rounded-[1.5rem]">
            <CardContent className="p-5">
              <kpi.icon className="h-5 w-5" style={{ color: kpi.color }} />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 font-display text-2xl" style={{ color: kpi.color }}>
                {kpi.value}
                {kpi.valueSuffix && <span className="text-sm opacity-60">{kpi.valueSuffix}</span>}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leaderboard + Radar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="enterprise-card rounded-[1.75rem]">
          <CardHeader className="pb-3">
            <CardTitle className="text-primary text-lg">AI Maturity Leaderboard</CardTitle>
            <p className="text-xs text-muted-foreground">Overall scores across six capability dimensions</p>
          </CardHeader>
          <CardContent className="space-y-1">
            {sorted.map((c, i) => {
              const ts = tierBadgeStyle(c.tier);
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0 cursor-pointer hover:bg-muted/30 rounded-lg px-2 transition-colors"
                  onClick={() => onSwitchView('maturity')}
                >
                  <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                  <span className="flex-1 text-sm font-semibold">{c.name}</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: ts.bg, color: ts.text }}
                  >
                    {c.tier}
                  </span>
                  <div className="flex items-center gap-2 w-28">
                    <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.overallScore}%`, background: scoreColor(c.overallScore) }} />
                    </div>
                    <span className="text-xs font-bold tabular-nums w-7 text-right" style={{ color: scoreColor(c.overallScore) }}>{c.overallScore}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="enterprise-card rounded-[1.75rem]">
          <CardHeader className="pb-3">
            <CardTitle className="text-primary text-lg">Dimension Radar — Top 3 OEMs</CardTitle>
            <p className="text-xs text-muted-foreground">{top3.map(c => c.name).join(' · ')}</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <PolarRadiusAxis angle={30} domain={[40, 100]} tick={{ fontSize: 10 }} />
                {top3.map((c, i) => (
                  <Radar
                    key={c.id}
                    name={c.name}
                    dataKey={c.name}
                    stroke={['#FFC400', '#19A3FC', '#8b5cf6'][i]}
                    fill={['#FFC400', '#19A3FC', '#8b5cf6'][i]}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card className="enterprise-card rounded-[1.75rem]">
        <CardHeader className="pb-3">
          <CardTitle className="text-primary text-lg">Maturity by Dimension — All OEMs</CardTitle>
          <p className="text-xs text-muted-foreground">Comparative breakdown across six AI capability pillars</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dim" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[40, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              {companies.map((c, i) => (
                <Bar key={c.id} dataKey={c.name} fill={barColors[i % barColors.length]} radius={[2, 2, 0, 0]} opacity={0.85} />
              ))}
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
