import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

interface UseCase {
  id: string;
  title: string;
  domain: string;
  agenticLevel: number;
  description: string;
  challenge: string;
  solution: string;
  benefits: string;
  keyAiTasks: string;
  adopters: string[];
  value: number;
  complexity: number;
  techStack: string[];
  example?: string;
}

interface Props {
  useCases: UseCase[];
}

const DOMAINS = ["All", "Autonomous", "Manufacturing", "Customer", "Supply Chain", "Software", "Sustainability", "R&D"];

const domainColor: Record<string, string> = {
  Autonomous: "text-emerald-500",
  Manufacturing: "text-blue-500",
  Customer: "text-cyan-500",
  "Supply Chain": "text-amber-500",
  Software: "text-purple-500",
  Sustainability: "text-orange-500",
  "R&D": "text-red-500",
};

const agenticBadge = (level: number) => {
  const map: Record<number, { label: string; class: string }> = {
    1: { label: "L1 Reactive", class: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    2: { label: "L2 Tool-Using", class: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
    3: { label: "L3 Planning", class: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    4: { label: "L4 Autonomous", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  };
  return map[level] || map[1];
};

function ScoreDots({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${i < value ? "bg-primary" : "bg-border"}`} />
      ))}
      <span className="text-[10px] text-muted-foreground ml-1">{value}/{max}</span>
    </div>
  );
}

const techPillClass = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("aws") || lower.includes("amazon")) return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  if (lower.includes("azure") || lower.includes("microsoft")) return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (lower.includes("google") || lower.includes("vertex") || lower.includes("gemini")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (lower.includes("nvidia")) return "bg-lime-500/15 text-lime-400 border-lime-500/30";
  if (lower.includes("openai") || lower.includes("chatgpt")) return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  return "bg-muted text-muted-foreground border-border";
};

export function UseCasesView({ useCases }: Props) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useCases
    .filter(uc => filter === "All" || uc.domain === filter)
    .filter(uc => {
      if (!search) return true;
      const q = search.toLowerCase();
      return uc.title.toLowerCase().includes(q) || uc.domain.toLowerCase().includes(q) || uc.description.toLowerCase().includes(q);
    })
    .sort((a: any, b: any) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl text-primary">AI Use Case Registry</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {useCases.length} confirmed use cases across {new Set(useCases.map(u => u.domain)).size} domains · Click any row to expand detail
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground">Domain:</span>
        {DOMAINS.map(d => (
          <button key={d} onClick={() => setFilter(d)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              filter === d ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}>
            {d === "Software" ? "Software Dev" : d}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search use cases..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs w-[200px]" />
        </div>
      </div>

      {/* Table */}
      <Card className="enterprise-card rounded-[1.75rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("id")}>ID</th>
                <th className="text-left p-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("title")}>Use Case</th>
                <th className="text-left p-3 font-semibold text-muted-foreground">Domain</th>
                <th className="text-left p-3 font-semibold text-muted-foreground">Agentic Level</th>
                <th className="text-left p-3 font-semibold text-muted-foreground">Adopters</th>
                <th className="text-left p-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("value")}>Value</th>
                <th className="text-left p-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("complexity")}>Complexity</th>
                <th className="p-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center p-8 text-muted-foreground">No use cases match the current filters.</td></tr>
              )}
              {filtered.map((uc) => {
                const ab = agenticBadge(uc.agenticLevel);
                const isExpanded = expandedId === uc.id;
                return (
                  <tr key={uc.id} className="group" >
                    <td colSpan={8} className="p-0">
                      <div className={`cursor-pointer hover:bg-muted/30 transition-colors ${isExpanded ? "bg-muted/20" : ""}`}
                        onClick={() => setExpandedId(isExpanded ? null : uc.id)}>
                        <div className="flex items-center p-3">
                          <span className="w-[50px] text-muted-foreground font-mono">{uc.id}</span>
                          <span className="flex-1 font-semibold text-foreground min-w-[180px]">{uc.title}</span>
                          <span className={`w-[90px] font-semibold ${domainColor[uc.domain] || "text-muted-foreground"}`}>{uc.domain}</span>
                          <span className="w-[110px]">
                            <Badge variant="outline" className={`text-[9px] border ${ab.class}`}>{ab.label}</Badge>
                          </span>
                          <span className="w-[180px]">
                            <div className="flex flex-wrap gap-1">
                              {uc.adopters.slice(0, 3).map((a, i) => (
                                <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">{a.split(" ")[0]}</Badge>
                              ))}
                              {uc.adopters.length > 3 && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">+{uc.adopters.length - 3}</Badge>}
                            </div>
                          </span>
                          <span className="w-[80px]"><ScoreDots value={uc.value} /></span>
                          <span className="w-[80px]"><ScoreDots value={uc.complexity} /></span>
                          <span className="w-8 text-center text-muted-foreground">
                            {isExpanded ? <ChevronUp className="h-3 w-3 inline" /> : <ChevronDown className="h-3 w-3 inline" />}
                          </span>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-6 pb-5 pt-2 bg-muted/10 border-t border-border/30">
                          <div className="grid gap-6 md:grid-cols-3">
                            <div>
                              <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Challenge & Solution</h5>
                              <ul className="space-y-1.5 text-xs text-muted-foreground">
                                <li><strong className="text-foreground">Challenge:</strong> {uc.challenge}</li>
                                <li><strong className="text-foreground">Solution:</strong> {uc.solution}</li>
                                <li><strong className="text-foreground">Benefits:</strong> {uc.benefits}</li>
                                {uc.example && <li><strong className="text-foreground">Example:</strong> <em>{uc.example}</em></li>}
                              </ul>
                            </div>
                            <div>
                              <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">AI Capabilities</h5>
                              <ul className="space-y-1.5 text-xs text-muted-foreground">
                                <li><strong className="text-foreground">Key AI Tasks:</strong> {uc.keyAiTasks}</li>
                                <li><strong className="text-foreground">Domain:</strong> <span className={domainColor[uc.domain]}>{uc.domain}</span></li>
                                <li><strong className="text-foreground">Value:</strong> {uc.value}/5 · <strong className="text-foreground">Complexity:</strong> {uc.complexity}/5</li>
                              </ul>
                              <div className="mt-3">
                                <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Technology Stack</h5>
                                <div className="flex flex-wrap gap-1.5">
                                  {uc.techStack.map((t, i) => (
                                    <Badge key={i} variant="outline" className={`text-[9px] border ${techPillClass(t)}`}>{t}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div>
                              <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Adopted By</h5>
                              <ul className="space-y-1 text-xs">
                                {uc.adopters.map((a, i) => (
                                  <li key={i} className="font-semibold text-primary">{a}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
