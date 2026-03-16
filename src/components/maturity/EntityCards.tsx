import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ExternalLink } from "lucide-react";

interface Entity {
  id: string;
  name: string;
  overall_score: number;
  tier: string | null;
  description: string | null;
  region: string | null;
  dimension_scores: Record<string, number>;
  tags: string[];
  tech_stack: any[];
  key_use_cases: string[];
  investment_level: string | null;
  ai_leader: string | null;
  sources: any[];
}

interface Capability {
  id: string;
  name: string;
}

interface Props {
  entities: Entity[];
  capabilities: Capability[];
}

const tierColors: Record<string, string> = {
  Pioneer: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Leader: "bg-blue-100 text-blue-700 border-blue-200",
  "Fast Follower": "bg-amber-100 text-amber-700 border-amber-200",
  Developer: "bg-orange-100 text-orange-700 border-orange-200",
  Experimenter: "bg-red-100 text-red-700 border-red-200",
};

function ScoreRing({ score, max = 100, size = 100 }: { score: number; max?: number; size?: number }) {
  const pct = Math.min((score / max) * 100, 100);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 80 ? "hsl(var(--primary))" : pct >= 60 ? "hsl(var(--accent))" : "hsl(var(--destructive))";

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={6} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        className="transform rotate-90 origin-center fill-foreground font-display text-xl"
        style={{ transformOrigin: `${size / 2}px ${size / 2}px` }}
      >
        {score.toFixed(0)}
      </text>
    </svg>
  );
}

export function EntityCards({ entities, capabilities }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? entities.find(e => e.id === selectedId) : null;

  const sorted = [...entities].sort((a, b) => Number(b.overall_score) - Number(a.overall_score));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((entity) => {
          const dimScores = entity.dimension_scores || {};
          return (
            <Card
              key={entity.id}
              className="enterprise-card rounded-[1.75rem] cursor-pointer hover:shadow-md transition-all group"
              onClick={() => setSelectedId(entity.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">{entity.name}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {entity.tier && (
                        <Badge variant="outline" className={`text-[10px] ${tierColors[entity.tier] || ""}`}>
                          {entity.tier}
                        </Badge>
                      )}
                      {entity.region && (
                        <span className="text-xs text-muted-foreground">{entity.region}</span>
                      )}
                    </div>
                  </div>
                  <ScoreRing score={Number(entity.overall_score)} />
                </div>

                {entity.description && (
                  <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{entity.description}</p>
                )}

                {/* Dimension bars */}
                <div className="mt-4 space-y-2">
                  {capabilities.slice(0, 4).map((cap) => {
                    const dimScore = dimScores[cap.id] || dimScores[cap.name] || 0;
                    return (
                      <div key={cap.id} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground truncate max-w-[70%]">{cap.name}</span>
                          <span className="text-[10px] font-medium text-foreground">{Number(dimScore).toFixed(1)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-primary/10">
                          <div
                            className="h-1.5 rounded-full bg-primary transition-all duration-700"
                            style={{ width: `${Math.min((Number(dimScore) / 5) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tags */}
                {entity.tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(entity.tags as string[]).slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={() => setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <ScoreRing score={Number(selected.overall_score)} size={64} />
                  <div>
                    <SheetTitle>{selected.name}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {selected.tier && <Badge variant="outline" className={tierColors[selected.tier] || ""}>{selected.tier}</Badge>}
                      {selected.region && <span className="text-xs text-muted-foreground">{selected.region}</span>}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {selected.description && (
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                )}

                {/* All dimensions */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Dimension Scores</h4>
                  <div className="space-y-3">
                    {capabilities.map((cap) => {
                      const dimScore = (selected.dimension_scores || {})[cap.id] || (selected.dimension_scores || {})[cap.name] || 0;
                      return (
                        <div key={cap.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">{cap.name}</span>
                            <span className="text-xs font-semibold text-foreground">{Number(dimScore).toFixed(1)}/5</span>
                          </div>
                          <div className="h-2 rounded-full bg-primary/10">
                            <div className="h-2 rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${Math.min((Number(dimScore) / 5) * 100, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selected.investment_level && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">Investment Level</h4>
                    <p className="text-sm text-muted-foreground">{selected.investment_level}</p>
                  </div>
                )}

                {selected.ai_leader && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">AI Leader</h4>
                    <p className="text-sm text-muted-foreground">{selected.ai_leader}</p>
                  </div>
                )}

                {(selected.key_use_cases as string[])?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Key Use Cases</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(selected.key_use_cases as string[]).map((uc, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{uc}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(selected.sources as any[])?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Sources</h4>
                    <div className="space-y-1.5">
                      {(selected.sources as any[]).map((src: any, i: number) => (
                        <a
                          key={i}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {src.label || src.url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
