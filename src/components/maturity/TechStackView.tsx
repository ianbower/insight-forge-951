import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Entity {
  id: string;
  name: string;
  overall_score: number;
  tier: string | null;
  region: string | null;
  description: string | null;
  tech_stack: any[];
}

interface Props {
  entities: Entity[];
  onSelectEntity: (id: string) => void;
}

const scoreColor = (score: number) => {
  if (score >= 85) return "#10b981";
  if (score >= 75) return "#3b82f6";
  if (score >= 65) return "#f59e0b";
  return "#ef4444";
};

const tierStyle: Record<string, string> = {
  Pioneer: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Leader: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  "Fast Follower": "bg-amber-500/15 text-amber-500 border-amber-500/30",
  Developer: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  Experimenter: "bg-red-500/15 text-red-500 border-red-500/30",
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

const TIERS = ["Pioneer", "Leader", "Fast Follower", "Developer", "Experimenter"];
const TIER_DESCS: Record<string, string> = {
  Pioneer: "Building bespoke AI infrastructure. Custom silicon, in-house training clusters, vertically integrated AI stack.",
  Leader: "Deep AI partnerships with tier-1 cloud providers. Multi-agent systems in production. Clear AI org structure.",
  "Fast Follower": "Significant AI investment. Production deployments across multiple domains. Multiple cloud + hardware partnerships.",
  Developer: "Active AI programs scaling from pilot to production. Foundation laid for broader rollout.",
  Experimenter: "Early-stage AI exploration. Pilot programs and proof-of-concept initiatives.",
};

export function TechStackView({ entities, onSelectEntity }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl text-primary">Technology Stack Breakdown</h2>
        <p className="text-sm text-muted-foreground mt-1">AI platforms, cloud providers, and strategic partnerships per entity</p>
      </div>

      {TIERS.map(tier => {
        const tierEntities = entities.filter(e => e.tier === tier);
        if (!tierEntities.length) return null;
        return (
          <div key={tier} className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={`border text-xs ${tierStyle[tier] || ""}`}>{tier}</Badge>
              <span className="text-xs text-muted-foreground">{TIER_DESCS[tier]}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tierEntities.map(e => (
                <Card key={e.id} className="enterprise-card rounded-[1.75rem] cursor-pointer hover:shadow-md transition-all"
                  onClick={() => onSelectEntity(e.id)}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">{e.name}</h4>
                        <p className="text-xs text-muted-foreground">{e.region} · Score: {Number(e.overall_score).toFixed(0)}/100</p>
                      </div>
                      <span className="text-sm font-bold" style={{ color: scoreColor(Number(e.overall_score)) }}>
                        {Number(e.overall_score).toFixed(0)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {((e.tech_stack as any[]) || []).map((t: any, i: number) => (
                        <Badge key={i} variant="outline"
                          className={`text-[9px] border ${techCatClass[t.cat] || techCatClass["tp-custom"]}`}
                          title={t.desc}>
                          {t.name}
                        </Badge>
                      ))}
                    </div>
                    {e.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{e.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
