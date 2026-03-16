import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UseCase, DOMAINS, agenticBadge, getCompanyColor, TECH_CAT_STYLES } from "@/data/automotiveAIData";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

interface Props {
  useCases: UseCase[];
}

const DOMAIN_COLORS: Record<string, string> = {
  Autonomous: '#22c55e', Manufacturing: '#f59e0b', Customer: '#14b8a6',
  'Supply Chain': '#f97316', Software: '#8b5cf6', Sustainability: '#fb923c', 'R&D': '#ef4444',
};

export function UseCasesView({ useCases }: Props) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'id' | 'title' | 'value' | 'complexity'>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let data = [...useCases];
    if (filter !== 'all') data = data.filter(u => u.domain.includes(filter));
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(u => u.title.toLowerCase().includes(q) || u.domain.toLowerCase().includes(q) || u.description.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return data;
  }, [useCases, filter, search, sortKey, sortDir]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const ScoreDots = ({ value, max = 5 }: { value: number; max?: number }) => (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className="w-2 h-2 rounded-full" style={{ background: i < value ? 'hsl(var(--accent))' : 'hsl(var(--border))' }} />
      ))}
      <span className="text-[10px] font-semibold text-muted-foreground ml-1">{value}/{max}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-primary">AI Use Case Registry</h2>
        <p className="text-sm text-muted-foreground mt-1">{useCases.length} confirmed use cases across {new Set(useCases.map(u => u.domain)).size} domains · Click any row to expand detail</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Domain:</span>
        {['all', ...DOMAINS].map(d => (
          <button
            key={d}
            onClick={() => setFilter(d)}
            className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
              filter === d
                ? 'bg-accent border-accent text-accent-foreground'
                : 'bg-card border-border text-muted-foreground hover:border-accent hover:text-accent'
            }`}
          >
            {d === 'all' ? 'All' : d}
          </button>
        ))}
        <div className="relative ml-auto max-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search use cases..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs rounded-full"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="enterprise-card rounded-[1.75rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                {[
                  { key: 'id' as const, label: 'ID' },
                  { key: 'title' as const, label: 'Use Case' },
                  { key: null, label: 'Domain' },
                  { key: null, label: 'Agentic Level' },
                  { key: null, label: 'Adopters' },
                  { key: 'value' as const, label: 'Value' },
                  { key: 'complexity' as const, label: 'Complexity' },
                  { key: null, label: '' },
                ].map((col, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap ${col.key ? 'cursor-pointer hover:text-foreground' : ''}`}
                    onClick={() => col.key && handleSort(col.key)}
                  >
                    {col.label}
                    {col.key && <span className="ml-1 opacity-40">↕</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No use cases match the current filters.</td></tr>
              )}
              {filtered.map(uc => {
                const ab = agenticBadge(uc.agenticLevel);
                const dc = DOMAIN_COLORS[uc.domain] || 'hsl(var(--muted-foreground))';
                const isExpanded = expandedId === uc.id;

                return (
                  <tbody key={uc.id}>
                    <tr
                      className={`border-b border-border/40 cursor-pointer transition-colors ${isExpanded ? 'bg-muted/30' : 'hover:bg-muted/20'}`}
                      onClick={() => setExpandedId(isExpanded ? null : uc.id)}
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">{uc.id}</td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">{uc.title}</td>
                      <td className="px-4 py-3"><span className="text-xs font-semibold" style={{ color: dc }}>{uc.domain}</span></td>
                      <td className="px-4 py-3"><Badge variant={ab.variant} className="text-[10px]">{ab.label}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {uc.adopters.map(a => (
                            <span key={a} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${getCompanyColor(a)}22`, color: getCompanyColor(a) }}>
                              {a.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3"><ScoreDots value={uc.value} /></td>
                      <td className="px-4 py-3"><ScoreDots value={uc.complexity} /></td>
                      <td className="px-4 py-3">{isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-border">
                        <td colSpan={8} className="p-0">
                          <div className="bg-muted/20 p-6 grid gap-6 md:grid-cols-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Challenge & Solution</p>
                              <p className="text-xs text-foreground mb-2"><strong>Challenge:</strong> {uc.challenge}</p>
                              <p className="text-xs text-foreground mb-2"><strong>Solution:</strong> {uc.solution}</p>
                              <p className="text-xs text-foreground"><strong>Benefits:</strong> {uc.benefits}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Key AI Tasks</p>
                              <p className="text-xs text-foreground mb-3">{uc.keyAiTasks}</p>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Example</p>
                              <p className="text-xs text-foreground italic">{uc.example}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Technology Stack</p>
                              <div className="flex flex-wrap gap-1">
                                {uc.techStack.map(t => (
                                  <span key={t} className="text-[9px] font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">{t}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
