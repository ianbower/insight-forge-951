import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Entity {
  id: string;
  name: string;
  overall_score: number;
  dimension_scores: Record<string, number>;
}

interface Capability {
  id: string;
  name: string;
}

interface Props {
  entities: Entity[];
  capabilities: Capability[];
}

function cellColor(score: number): string {
  if (score >= 4) return "bg-emerald-500/80 text-white";
  if (score >= 3) return "bg-emerald-400/60 text-foreground";
  if (score >= 2) return "bg-amber-400/50 text-foreground";
  if (score >= 1) return "bg-orange-400/50 text-foreground";
  if (score > 0) return "bg-red-400/40 text-foreground";
  return "bg-muted/30 text-muted-foreground";
}

export function DashboardHeatmap({ entities, capabilities }: Props) {
  if (!entities.length || !capabilities.length) {
    return (
      <Card className="enterprise-card rounded-[1.75rem]">
        <CardContent className="p-8 text-center text-muted-foreground">
          Add entities and dimensions to see the heatmap.
        </CardContent>
      </Card>
    );
  }

  const sorted = [...entities].sort((a, b) => Number(b.overall_score) - Number(a.overall_score));

  return (
    <Card className="enterprise-card rounded-[1.75rem]">
      <CardHeader className="pb-3">
        <CardTitle className="text-primary">Maturity Heatmap</CardTitle>
        <p className="text-sm text-muted-foreground">Entity scores across all dimensions</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <TooltipProvider>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-card z-10 text-left p-2 font-semibold text-muted-foreground min-w-[140px]">
                  Entity
                </th>
                {capabilities.map((cap) => (
                  <th key={cap.id} className="p-2 font-semibold text-muted-foreground text-center min-w-[80px]">
                    <span className="block truncate max-w-[100px]">{cap.name}</span>
                  </th>
                ))}
                <th className="p-2 font-semibold text-muted-foreground text-center min-w-[60px]">Overall</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entity) => {
                const dims = entity.dimension_scores || {};
                return (
                  <tr key={entity.id} className="border-t border-border/30">
                    <td className="sticky left-0 bg-card z-10 p-2 font-medium text-foreground">
                      {entity.name}
                    </td>
                    {capabilities.map((cap) => {
                      const score = dims[cap.id] || dims[cap.name] || 0;
                      return (
                        <td key={cap.id} className="p-1 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`mx-auto flex h-9 w-14 items-center justify-center rounded-lg font-semibold transition-colors ${cellColor(Number(score))}`}>
                                {Number(score).toFixed(1)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{entity.name}</p>
                              <p className="text-xs">{cap.name}: {Number(score).toFixed(1)}/5</p>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                    <td className="p-1 text-center">
                      <div className="mx-auto flex h-9 w-14 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
                        {Number(entity.overall_score).toFixed(0)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
