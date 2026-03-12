import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from "recharts";
import { Sparkles, Search, Loader2, BookOpen, Database } from "lucide-react";

interface Benchmark {
  name: string; description: string; source: string; industry: string; framework: string;
  score_average: number; score_percentile_25: number; score_percentile_50: number; score_percentile_75: number;
  sample_size: number; data_year: string; relevance_notes: string; dimension_match?: string;
}

export default function SmartBenchmarking() {
  const [topic, setTopic] = useState("");
  const [industry, setIndustry] = useState("");
  const [searching, setSearching] = useState(false);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [searchNotes, setSearchNotes] = useState("");

  const { data: savedBenchmarks } = useQuery({
    queryKey: ["saved-benchmarks"],
    queryFn: async () => {
      const { data } = await supabase.from("assessment_benchmarks").select("*, assessment_templates(name)").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const handleSearch = async () => {
    if (!topic.trim()) { toast.error("Enter a topic to search"); return; }
    setSearching(true);
    try {
      const res = await supabase.functions.invoke("benchmark-discovery", { body: { topic, industry: industry || undefined } });
      if (res.error) throw res.error;
      setBenchmarks(res.data.benchmarks || []);
      setSearchNotes(res.data.search_notes || "");
      if (res.data.benchmarks?.length) toast.success(`Found ${res.data.benchmarks.length} benchmarks`);
      else toast.info("No benchmarks found. Try a different topic.");
    } catch (err: any) { toast.error(err.message || "Search failed"); } finally { setSearching(false); }
  };

  const saveBenchmark = async (b: Benchmark) => {
    try {
      await supabase.from("assessment_benchmarks").insert({
        benchmark_type: "ai_discovered", source: b.source, industry: b.industry, framework: b.framework,
        score_average: b.score_average, score_percentile_25: b.score_percentile_25, score_percentile_50: b.score_percentile_50, score_percentile_75: b.score_percentile_75,
        sample_size: b.sample_size, data_date: b.data_year ? `${b.data_year}-01-01` : null,
        metadata: { name: b.name, description: b.description, relevance_notes: b.relevance_notes } as any,
      });
      toast.success("Benchmark saved");
    } catch { toast.error("Failed to save"); }
  };

  const chartData = benchmarks.map(b => ({ name: b.name.length > 20 ? b.name.slice(0, 20) + "…" : b.name, "25th": b.score_percentile_25, "Average": b.score_average, "75th": b.score_percentile_75 }));
  const radarData = benchmarks.slice(0, 6).map(b => ({ dimension: b.dimension_match || b.name.slice(0, 15), score: b.score_average, top: b.score_percentile_75 }));
  const INDUSTRIES = ["Technology", "Financial Services", "Healthcare", "Manufacturing", "Retail", "Energy", "Telecommunications", "Government", "Education", "Cross-industry"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Smart Benchmarking</h1>
          <p className="text-muted-foreground mt-1">AI-powered industry benchmarks and competitive intelligence</p>
        </div>
        <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> AI-Powered</Badge>
      </div>

      <Tabs defaultValue="discover">
        <TabsList>
          <TabsTrigger value="discover"><Search className="h-4 w-4 mr-1" /> Discover</TabsTrigger>
          <TabsTrigger value="saved"><Database className="h-4 w-4 mr-1" /> Saved ({savedBenchmarks?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <Label>Topic or Assessment Area</Label>
                  <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Digital Maturity, Cloud Adoption, Data Governance" onKeyDown={e => e.key === "Enter" && handleSearch()} />
                </div>
                <div className="w-48 space-y-1">
                  <Label>Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger><SelectValue placeholder="All industries" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All industries</SelectItem>
                      {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSearch} disabled={searching}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-1" /> Search</>}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {benchmarks.length > 0 && (
            <>
              {searchNotes && <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground italic">{searchNotes}</p></CardContent></Card>}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Score Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Bar dataKey="25th" fill="hsl(var(--muted-foreground))" opacity={0.4} />
                        <Bar dataKey="Average" fill="hsl(var(--primary))" />
                        <Bar dataKey="75th" fill="hsl(var(--chart-2))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Radar View</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid className="stroke-border" />
                        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis domain={[0, 5]} />
                        <Radar name="Average" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                        <Radar name="Top Quartile" dataKey="top" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.15} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {benchmarks.map((b, i) => (
                  <Card key={i} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between"><CardTitle className="text-sm leading-tight">{b.name}</CardTitle><Badge variant="outline" className="text-[10px] shrink-0 ml-2">{b.industry}</Badge></div>
                      <CardDescription className="text-xs">{b.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="text-center"><p className="text-2xl font-bold text-primary">{b.score_average.toFixed(1)}</p><p className="text-[10px] text-muted-foreground">Average</p></div>
                        <div className="flex-1">
                          <Progress value={(b.score_average / 5) * 100} className="h-2" />
                          <div className="flex justify-between mt-1"><span className="text-[10px] text-muted-foreground">P25: {b.score_percentile_25}</span><span className="text-[10px] text-muted-foreground">P75: {b.score_percentile_75}</span></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{b.source}</span><span>n={b.sample_size}</span>
                      </div>
                      {b.framework && <Badge variant="secondary" className="text-[10px]">{b.framework}</Badge>}
                      <Button variant="outline" size="sm" className="w-full" onClick={() => saveBenchmark(b)}>Save Benchmark</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="saved">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {savedBenchmarks?.map((b: any) => (
              <Card key={b.id}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{(b.metadata as any)?.name || b.benchmark_type}</CardTitle><CardDescription className="text-xs">{(b.metadata as any)?.description || b.source}</CardDescription></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3"><p className="text-xl font-bold text-primary">{b.score_average?.toFixed(1) || "—"}</p><div className="flex-1"><Progress value={((b.score_average || 0) / 5) * 100} className="h-2" /></div></div>
                  <div className="flex gap-2 mt-2">{b.industry && <Badge variant="outline" className="text-[10px]">{b.industry}</Badge>}{b.framework && <Badge variant="secondary" className="text-[10px]">{b.framework}</Badge>}</div>
                </CardContent>
              </Card>
            ))}
            {!savedBenchmarks?.length && (
              <div className="col-span-full text-center py-12 text-muted-foreground"><Database className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No saved benchmarks yet. Discover and save benchmarks from the Discover tab.</p></div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}