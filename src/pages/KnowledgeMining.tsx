import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Search, Brain, FolderKanban, FileText, ClipboardList, Briefcase, Building2, Sparkles, Loader2 } from "lucide-react";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  excerpt: string | null;
  status?: string;
  category?: string;
  project_id?: string;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Search; label: string; color: string; route?: (r: SearchResult) => string }> = {
  project: { icon: FolderKanban, label: "Project", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", route: (r) => `/projects/${r.id}` },
  deliverable: { icon: FileText, label: "Deliverable", color: "bg-violet-500/10 text-violet-500 border-violet-500/20", route: (r) => r.project_id ? `/projects/${r.project_id}` : "#" },
  assessment: { icon: ClipboardList, label: "Assessment", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", route: () => "/assessments" },
  document: { icon: FileText, label: "Document", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", route: () => "/data-room" },
  tool: { icon: Briefcase, label: "Tool", color: "bg-primary/10 text-primary border-primary/20", route: () => "/tools" },
  client: { icon: Building2, label: "Client", color: "bg-pink-500/10 text-pink-500 border-pink-500/20" },
};

export default function KnowledgeMining() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("knowledge-search", {
        body: { query: query.trim() },
      });
      if (error) throw error;
      setResults(data.results || []);
      setAiSummary(data.aiSummary || null);
    } catch (e: any) {
      toast.error(e.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = filterType ? results.filter(r => r.type === filterType) : results;
  const typeCounts = results.reduce((acc, r) => { acc[r.type] = (acc[r.type] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" /> Knowledge Mining
        </h1>
        <p className="text-muted-foreground mt-1">Search across your entire firm's knowledge base — projects, deliverables, assessments, documents, and more</p>
      </div>

      <div className="flex gap-2 max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search everything — projects, deliverables, documents, clients..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} className="pl-10 h-11" />
        </div>
        <Button onClick={handleSearch} disabled={loading || !query.trim()} className="h-11">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}
          Search
        </Button>
      </div>

      {aiSummary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary mb-1">AI Insight</p>
              <p className="text-sm text-foreground">{aiSummary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Badge variant={filterType === null ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterType(null)}>All ({results.length})</Badge>
          {Object.entries(typeCounts).map(([type, count]) => {
            const config = TYPE_CONFIG[type];
            return (
              <Badge key={type} variant={filterType === type ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterType(filterType === type ? null : type)}>
                {config?.label || type} ({count})
              </Badge>
            );
          })}
        </div>
      )}

      {searched && !loading && filteredResults.length === 0 && (
        <Card><CardContent className="p-12 text-center"><Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" /><h3 className="text-lg font-medium mb-2">No results found</h3><p className="text-muted-foreground">Try different keywords or broaden your search.</p></CardContent></Card>
      )}

      {!searched && !loading && (
        <Card><CardContent className="p-12 text-center"><Brain className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" /><h3 className="text-lg font-medium mb-2">Your firm's second brain</h3><p className="text-muted-foreground">Search across projects, deliverables, assessments, documents, and clients to surface relevant insights.</p></CardContent></Card>
      )}

      <div className="grid gap-3">
        {filteredResults.map(result => {
          const config = TYPE_CONFIG[result.type] || { icon: Search, label: result.type, color: "bg-muted text-muted-foreground" };
          const Icon = config.icon;
          return (
            <Card key={`${result.type}-${result.id}`} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { const route = config.route?.(result); if (route && route !== "#") navigate(route); }}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border", config.color)}><Icon className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-sm truncate">{result.title}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">{config.label}</Badge>
                    {result.status && <Badge variant="secondary" className="text-[10px] shrink-0">{result.status}</Badge>}
                  </div>
                  {result.excerpt && <p className="text-xs text-muted-foreground line-clamp-2">{result.excerpt}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(result.created_at).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}