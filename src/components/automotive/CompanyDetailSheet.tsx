import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Company, UseCase, DIM_KEYS, DIM_NAMES, scoreColor, tierBadgeStyle, agenticBadge, TECH_CAT_STYLES } from "@/data/automotiveAIData";
import { ExternalLink } from "lucide-react";

interface Props {
  company: Company | null;
  useCases: UseCase[];
  open: boolean;
  onClose: () => void;
}

const DOMAIN_COLORS: Record<string, string> = {
  Autonomous: '#22c55e', Manufacturing: '#f59e0b', Customer: '#14b8a6',
  'Supply Chain': '#f97316', Software: '#8b5cf6', Sustainability: '#fb923c', 'R&D': '#ef4444',
};

export function CompanyDetailSheet({ company, useCases, open, onClose }: Props) {
  if (!company) return null;

  const c = company;
  const ts = tierBadgeStyle(c.tier);
  const color = scoreColor(c.overallScore);
  const companyUCs = useCases.filter(uc => uc.adopters.includes(c.name));

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{c.name}</SheetTitle>
          <p className="text-sm text-muted-foreground">{c.region} · {c.tier}</p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Score & Tier */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-bold" style={{ color }}>{c.overallScore}</p>
              <p className="text-xs text-muted-foreground">Overall Score</p>
            </div>
            <div>
              <span className="inline-flex items-center text-xs font-bold px-3 py-1 rounded-full" style={{ background: ts.bg, color: ts.text }}>
                {c.tier}
              </span>
              <p className="text-xs text-muted-foreground mt-1">{c.investmentLevel}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>

          {/* Dimensions */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Capability Dimensions</p>
            {DIM_KEYS.map(key => (
              <div key={key} className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-semibold text-muted-foreground">{DIM_NAMES[key]}</span>
                  <span className="text-xs font-bold" style={{ color: scoreColor(c.dims[key]) }}>{c.dims[key]}</span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.dims[key]}%`, background: scoreColor(c.dims[key]) }} />
                </div>
              </div>
            ))}
          </div>

          {/* Tech Stack */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Technology Stack</p>
            <div className="space-y-2">
              {c.techStack.map(t => {
                const style = TECH_CAT_STYLES[t.cat] || { bg: 'hsl(var(--muted))', text: 'hsl(var(--muted-foreground))' };
                return (
                  <div key={t.name} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                    <span className="text-[9px] font-bold px-2 py-1 rounded-full shrink-0" style={{ background: style.bg, color: style.text }}>
                      {t.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{t.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Use Cases */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Active AI Use Cases ({companyUCs.length})</p>
            <div className="space-y-2">
              {companyUCs.map(uc => {
                const ab = agenticBadge(uc.agenticLevel);
                const dc = DOMAIN_COLORS[uc.domain] || 'hsl(var(--muted-foreground))';
                return (
                  <div key={uc.id} className="p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold" style={{ color: dc }}>{uc.domain}</span>
                      <Badge variant={ab.variant} className="text-[8px] px-1.5 py-0">{ab.label}</Badge>
                    </div>
                    <p className="text-sm font-semibold">{uc.title}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sources */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Sources</p>
            {c.sources.map(s => (
              <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-accent hover:underline mb-2">
                {s.label} <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
