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
  metadata: any;
}

interface Props {
  entities: Entity[];
  dimensions: string[];
  useCases: any[];
}

const tierStyle: Record<string, { badge: string; icon: string }> = {
  Pioneer: { badge: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: "★" },
  Leader: { badge: "bg-blue-500/15 text-blue-500 border-blue-500/30", icon: "◆" },
  "Fast Follower": { badge: "bg-amber-500/15 text-amber-500 border-amber-500/30", icon: "▲" },
  Developer: { badge: "bg-orange-500/15 text-orange-500 border-orange-500/30", icon: "●" },
  Experimenter: { badge: "bg-red-500/15 text-red-500 border-red-500/30", icon: "○" },
};

const scoreColor = (score: number) => {
  if (score >= 85) return "#10b981";
  if (score >= 75) return "#3b82f6";
  if (score >= 65) return "#f59e0b";
  if (score >= 55) return "#f97316";
  return "#ef4444";
};

const techCatClass: Record<string, string> = {
  "tp-azure": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "tp-aws": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "tp-gcp": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "tp-nvidia": "bg-lime-500/15 text-lime-400 border-lime-500/30",
  "tp-openai": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "tp-alibaba": "bg-red-500/15 text-red-400 border-red-500/30",
  "tp-custom": "bg-muted text-muted-foreground border-border",
};

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score / 100, 1);
  const dash = pct * circ;
  const color = scoreColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display font-bold" style={{ color, fontSize: size > 50 ? 16 : 12 }}>
          {score.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

export function EntityCards({ entities, dimensions, useCases }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? entities.find(e => e.id === selectedId) : null;
  const sorted = [...entities].sort((a, b) => Number(b.overall_score) - Number(a.overall_score));

  const getEntityUseCases = (entityName: string) =>
    useCases.filter((uc: any) => uc.adopters?.includes(entityName));

  return (
    <>
      <div>
        <h2 className="font-display text-2xl text-primary">AI Maturity Profiles</h2>
        <p className="text-sm text-muted-foreground mt-1">Click any company card to explore their full AI capability profile</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sorted.map((entity) => {
          const dims = entity.dimension_scores || {};
          const ts = tierStyle[entity.tier || ""] || tierStyle.Experimenter;
          return (
            <Card key={entity.id}
              className="enterprise-card rounded-[1.75rem] cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all"
              onClick={() => setSelectedId(entity.id)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{entity.name}</h3>
                    <p className="text-xs text-muted-foreground">{entity.region}</p>
                  </div>
                  <ScoreRing score={Number(entity.overall_score)} />
                </div>

                <div className="mt-2">
                  <Badge variant="outline" className={`text-[10px] border ${ts.badge}`}>
                    {ts.icon} {entity.tier}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2">
                  {dimensions.map((dim) => {
                    const score = Number(dims[dim] || 0);
                    return (
                      <div key={dim} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground truncate max-w-[60%]">{dim}</span>
                          <span className="text-[10px] font-bold" style={{ color: scoreColor(score) }}>{score}</span>
                        </div>
                        <div className="h-1 rounded-full bg-primary/10">
                          <div className="h-1 rounded-full transition-all duration-700"
                            style={{ width: `${score}%`, background: scoreColor(score) }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(entity.tags as string[])?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(entity.tags as string[]).slice(0, 4).map((tag, i) => (
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
          {selected && (() => {
            const ts = tierStyle[selected.tier || ""] || tierStyle.Experimenter;
            const companyUCs = getEntityUseCases(selected.name);
            return (
              <>
                <SheetHeader>
                  <div className="flex items-center gap-4">
                    <ScoreRing score={Number(selected.overall_score)} size={72} />
                    <div>
                      <SheetTitle>{selected.name}</SheetTitle>
                      <p className="text-xs text-muted-foreground">{selected.region} · {selected.tier}</p>
                      <Badge variant="outline" className={`mt-1 text-[10px] border ${ts.badge}`}>
                        {selected.tier}
                      </Badge>
                    </div>
                  </div>
                </SheetHeader>
                <div className="mt-4 space-y-6">
                  {selected.investment_level && (
                    <p className="text-xs text-muted-foreground">{selected.investment_level}</p>
                  )}
                  {selected.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>
                  )}

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Capability Dimensions</h4>
                    <div className="space-y-3">
                      {dimensions.map((dim) => {
                        const score = Number((selected.dimension_scores || {})[dim] || 0);
                        return (
                          <div key={dim}>
                            <div className="flex justify-between mb-1">
                              <span className="text-xs font-semibold text-muted-foreground">{dim}</span>
                              <span className="text-xs font-bold" style={{ color: scoreColor(score) }}>{score}</span>
                            </div>
                            <div className="h-2 rounded-full bg-primary/10">
                              <div className="h-2 rounded-full" style={{ width: `${score}%`, background: scoreColor(score) }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {(selected.tech_stack as any[])?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Technology Stack</h4>
                      <div className="space-y-2">
                        {(selected.tech_stack as any[]).map((t: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/30">
                            <Badge variant="outline" className={`text-[9px] shrink-0 border ${techCatClass[t.cat] || techCatClass["tp-custom"]}`}>
                              {t.name}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{t.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {companyUCs.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                        Active AI Use Cases ({companyUCs.length})
                      </h4>
                      <div className="space-y-1.5">
                        {companyUCs.map((uc: any) => (
                          <div key={uc.id} className="p-2.5 rounded-xl bg-muted/30">
                            <p className="text-[10px] font-bold text-primary">{uc.domain}</p>
                            <p className="text-xs font-semibold text-foreground">{uc.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(selected.sources as any[])?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Sources</h4>
                      {(selected.sources as any[]).map((s: any, i: number) => (
                        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline mb-1.5">
                          <ExternalLink className="h-3 w-3" /> {s.label} ↗
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </>
  );
}
