import { useMemo } from "react";
import { Company, DIM_KEYS, DIM_NAMES, scoreColor, tierBadgeStyle } from "@/data/automotiveAIData";

interface Props {
  companies: Company[];
  onSelectCompany: (id: string) => void;
}

export function MaturityView({ companies, onSelectCompany }: Props) {
  const sorted = useMemo(() => [...companies].sort((a, b) => b.overallScore - a.overallScore), [companies]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-primary">AI Maturity Profiles</h2>
        <p className="text-sm text-muted-foreground mt-1">Click any company card to explore their full AI capability profile</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sorted.map(c => {
          const ts = tierBadgeStyle(c.tier);
          const pct = c.overallScore;
          const r = 24;
          const circ = 2 * Math.PI * r;
          const dash = (pct / 100) * circ;
          const color = scoreColor(c.overallScore);

          return (
            <div
              key={c.id}
              className="enterprise-card rounded-[1.5rem] p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 border border-border/60"
              onClick={() => onSelectCompany(c.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.region}</p>
                </div>
                <div className="relative w-14 h-14">
                  <svg viewBox="0 0 56 56" className="w-14 h-14">
                    <circle cx="28" cy="28" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
                    <circle
                      cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
                      strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                      transform="rotate(-90 28 28)"
                      style={{ transition: 'stroke-dasharray 0.8s ease' }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color }}>
                    {c.overallScore}
                  </span>
                </div>
              </div>

              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                style={{ background: ts.bg, color: ts.text }}
              >
                {c.tier === 'Pioneer' ? '★' : c.tier === 'Leader' ? '◆' : c.tier === 'Fast Follower' ? '▲' : '●'} {c.tier}
              </span>

              <div className="grid grid-cols-2 gap-2 mt-4">
                {DIM_KEYS.map(key => (
                  <div key={key}>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{DIM_NAMES[key]}</p>
                    <div className="h-1 rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.dims[key]}%`, background: scoreColor(c.dims[key]), transition: 'width 0.6s ease' }} />
                    </div>
                    <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 tabular-nums">{c.dims[key]}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-1 mt-3">
                {c.tags.slice(0, 4).map(tag => (
                  <span key={tag} className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
