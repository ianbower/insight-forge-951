import { Company, scoreColor, tierBadgeStyle, TECH_CAT_STYLES } from "@/data/automotiveAIData";

interface Props {
  companies: Company[];
  onSelectCompany: (id: string) => void;
}

const TIER_ORDER = ['Pioneer', 'Leader', 'Fast Follower', 'Developer', 'Experimenter'];
const TIER_DESCS: Record<string, string> = {
  'Pioneer': 'Building bespoke AI infrastructure. Custom silicon, in-house training clusters, vertically integrated AI stack.',
  'Leader': 'Deep AI partnerships with tier-1 cloud providers. Multi-agent systems in production. Clear AI org structure.',
  'Fast Follower': 'Significant AI investment. Production deployments across multiple domains. Multiple cloud + hardware partnerships.',
  'Developer': 'Active AI programs scaling from pilot to production. Foundation laid for broader rollout.',
  'Experimenter': 'Early exploration phase. Initial pilots and partnerships being established.',
};

export function TechStackView({ companies, onSelectCompany }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-primary">Technology Stack Breakdown</h2>
        <p className="text-sm text-muted-foreground mt-1">AI platforms, cloud providers, and strategic partnerships per OEM</p>
      </div>

      {TIER_ORDER.map(tier => {
        const cos = companies.filter(c => c.tier === tier);
        if (!cos.length) return null;
        const ts = tierBadgeStyle(tier);

        return (
          <div key={tier} className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full" style={{ background: ts.bg, color: ts.text }}>
                {tier}
              </span>
              <span className="text-sm text-muted-foreground">{TIER_DESCS[tier]}</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cos.map(c => (
                <div
                  key={c.id}
                  className="enterprise-card rounded-[1.5rem] p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 border border-border/60"
                  onClick={() => onSelectCompany(c.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.region} · Score: {c.overallScore}/100</p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: scoreColor(c.overallScore) }}>{c.overallScore}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {c.techStack.map(t => {
                      const style = TECH_CAT_STYLES[t.cat] || { bg: 'hsl(var(--muted))', text: 'hsl(var(--muted-foreground))' };
                      return (
                        <span
                          key={t.name}
                          className="text-[9px] font-bold px-2 py-1 rounded-full"
                          style={{ background: style.bg, color: style.text }}
                          title={t.desc}
                        >
                          {t.name}
                        </span>
                      );
                    })}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
