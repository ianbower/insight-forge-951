import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Company, UseCase, DOMAINS } from "@/data/automotiveAIData";

interface Props {
  companies: Company[];
  useCases: UseCase[];
}

export function HeatmapView({ companies, useCases }: Props) {
  const { grid, maxCount } = useMemo(() => {
    const g: Record<string, Record<string, number>> = {};
    companies.forEach(c => {
      g[c.name] = {};
      DOMAINS.forEach(d => { g[c.name][d] = 0; });
    });
    useCases.forEach(uc => {
      uc.adopters.forEach(a => {
        if (g[a] && g[a][uc.domain] !== undefined) g[a][uc.domain]++;
      });
    });
    const max = Math.max(...Object.values(g).flatMap(d => Object.values(d)), 1);
    return { grid: g, maxCount: max };
  }, [companies, useCases]);

  const cellColor = (count: number) => {
    if (count === 0) return 'hsl(var(--muted))';
    const intensity = count / maxCount;
    const alpha = 0.15 + intensity * 0.65;
    return `rgba(59, 130, 246, ${alpha})`;
  };

  const textColor = (count: number) => {
    if (count === 0) return 'hsl(var(--muted-foreground))';
    return count > maxCount / 2 ? '#fff' : 'hsl(var(--foreground))';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-primary">Adoption Coverage Heatmap</h2>
        <p className="text-sm text-muted-foreground mt-1">Which OEMs are adopting which use case domains</p>
      </div>
      <Card className="enterprise-card rounded-[1.75rem]">
        <CardContent className="p-6 overflow-x-auto">
          <div
            className="grid gap-[3px] min-w-[900px]"
            style={{ gridTemplateColumns: `120px repeat(${companies.length}, minmax(80px, 1fr))` }}
          >
            {/* Header row */}
            <div className="flex items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Domain</div>
            {companies.map(c => (
              <div key={c.id} className="text-center text-[10px] font-bold text-muted-foreground py-2 whitespace-nowrap overflow-hidden text-ellipsis" title={c.name}>
                {c.name.split(' ')[0]}
              </div>
            ))}

            {/* Data rows */}
            {DOMAINS.map(domain => (
              <>
                <div key={`label-${domain}`} className="flex items-center text-xs font-semibold text-muted-foreground py-1">
                  {domain}
                </div>
                {companies.map(c => {
                  const count = grid[c.name]?.[domain] || 0;
                  return (
                    <div
                      key={`${c.id}-${domain}`}
                      className="flex items-center justify-center h-9 rounded-lg text-[10px] font-bold transition-transform hover:scale-105"
                      style={{ background: cellColor(count), color: textColor(count) }}
                      title={`${c.name}: ${count} use case${count !== 1 ? 's' : ''} in ${domain}`}
                    >
                      {count > 0 ? count : '—'}
                    </div>
                  );
                })}
              </>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-6">
            <span className="text-[10px] text-muted-foreground">Intensity:</span>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map(v => (
                <div key={v} className="w-6 h-6 rounded border border-border" style={{ background: cellColor(v) }} />
              ))}
              <span className="text-[10px] text-muted-foreground ml-2">0 → {maxCount} use cases</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
