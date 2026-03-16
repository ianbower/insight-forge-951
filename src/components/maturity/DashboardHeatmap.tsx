import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Entity {
  id: string;
  name: string;
  overall_score: number;
}

interface Props {
  entities: Entity[];
  useCases: any[];
  domains: string[];
}

export function DashboardHeatmap({ entities, useCases, domains }: Props) {
  if (!entities.length || !domains.length) {
    return (
      <Card className="enterprise-card rounded-[1.75rem]">
        <CardContent className="p-8 text-center text-muted-foreground">
          Add entities and use cases to see the heatmap.
        </CardContent>
      </Card>
    );
  }

  // Count use cases per entity-domain
  const grid: Record<string, Record<string, number>> = {};
  entities.forEach(e => {
    grid[e.name] = {};
    domains.forEach(d => (grid[e.name][d] = 0));
  });
  useCases.forEach((uc: any) => {
    (uc.adopters || []).forEach((a: string) => {
      if (grid[a] && grid[a][uc.domain] !== undefined) grid[a][uc.domain]++;
    });
  });

  const maxCount = Math.max(1, ...Object.values(grid).flatMap(d => Object.values(d)));

  const cellBg = (count: number) => {
    if (count === 0) return "bg-muted/30";
    const intensity = count / maxCount;
    if (intensity > 0.7) return "bg-primary/70 text-primary-foreground";
    if (intensity > 0.4) return "bg-primary/40 text-foreground";
    return "bg-primary/20 text-foreground";
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl text-primary">Adoption Coverage Heatmap</h2>
        <p className="text-sm text-muted-foreground mt-1">Which entities are adopting which use case domains</p>
      </div>

      <Card className="enterprise-card rounded-[1.75rem]">
        <CardContent className="p-5 overflow-x-auto">
          <TooltipProvider>
            <div className="min-w-[800px]"
              style={{
                display: "grid",
                gridTemplateColumns: `120px repeat(${entities.length}, minmax(80px, 1fr))`,
                gap: 3,
              }}>
              {/* Header row */}
              <div className="text-xs font-semibold text-muted-foreground flex items-center">Domain</div>
              {entities.map(e => (
                <div key={e.id} className="text-center text-[10px] font-bold text-muted-foreground py-2 truncate" title={e.name}>
                  {e.name.split(" ")[0]}
                </div>
              ))}

              {/* Data rows */}
              {domains.map(domain => (
                <>
                  <div key={`label-${domain}`} className="text-xs font-semibold text-muted-foreground flex items-center py-2">
                    {domain}
                  </div>
                  {entities.map(e => {
                    const count = grid[e.name]?.[domain] || 0;
                    return (
                      <Tooltip key={`${e.name}-${domain}`}>
                        <TooltipTrigger asChild>
                          <div className={`flex items-center justify-center rounded-lg h-10 text-xs font-bold transition-colors ${cellBg(count)}`}>
                            {count > 0 ? count : "—"}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{e.name}</p>
                          <p className="text-xs">{count} use case{count !== 1 ? "s" : ""} in {domain}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </>
              ))}
            </div>
          </TooltipProvider>

          {/* Legend */}
          <div className="mt-6 flex items-center gap-4">
            <span className="text-xs text-muted-foreground">Intensity:</span>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map(v => (
                <div key={v} className={`w-6 h-6 rounded border border-border ${cellBg(v * (maxCount / 3))}`} />
              ))}
              <span className="text-xs text-muted-foreground ml-2">0 → {maxCount} use cases</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
