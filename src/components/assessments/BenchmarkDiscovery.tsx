import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Search,
  Loader2,
  Plus,
  Check,
  Building2,
  Globe,
  TrendingUp,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface DiscoveredBenchmark {
  name: string;
  description: string;
  source: string;
  industry: string;
  framework?: string;
  score_average: number;
  score_percentile_25?: number;
  score_percentile_50: number;
  score_percentile_75?: number;
  sample_size?: number;
  data_year?: string;
  relevance_notes?: string;
  dimension_match?: string;
}

interface BenchmarkDiscoveryProps {
  templateId: string;
  templateName: string;
  dimensions: { id: string; name: string }[];
  onBenchmarkAdded: () => void;
}

const COMMON_INDUSTRIES = [
  "Technology",
  "Financial Services",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Government",
  "Education",
  "Energy",
  "Telecommunications",
  "Professional Services",
  "Cross-industry",
];

export function BenchmarkDiscovery({ 
  templateId, 
  templateName, 
  dimensions,
  onBenchmarkAdded 
}: BenchmarkDiscoveryProps) {
  const [searching, setSearching] = useState(false);
  const [topic, setTopic] = useState(templateName);
  const [industry, setIndustry] = useState("");
  const [context, setContext] = useState("");
  const [discoveredBenchmarks, setDiscoveredBenchmarks] = useState<DiscoveredBenchmark[]>([]);
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<Set<number>>(new Set());
  const [searchNotes, setSearchNotes] = useState("");
  const [importing, setImporting] = useState(false);

  const handleSearch = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic to search");
      return;
    }

    setSearching(true);
    setDiscoveredBenchmarks([]);
    setSelectedBenchmarks(new Set());
    setSearchNotes("");

    try {
      const { data, error } = await supabase.functions.invoke("benchmark-discovery", {
        body: {
          topic: topic.trim(),
          industry: industry || undefined,
          dimensions: dimensions.map(d => d.name),
          context: context.trim() || undefined,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setDiscoveredBenchmarks(data.benchmarks || []);
      setSearchNotes(data.search_notes || "");

      if (data.benchmarks?.length > 0) {
        toast.success(`Found ${data.benchmarks.length} relevant benchmarks`);
      } else {
        toast.info("No benchmarks found. Try adjusting your search criteria.");
      }
    } catch (error) {
      console.error("Benchmark discovery error:", error);
      toast.error("Failed to search for benchmarks");
    } finally {
      setSearching(false);
    }
  };

  const toggleBenchmark = (index: number) => {
    const newSelected = new Set(selectedBenchmarks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedBenchmarks(newSelected);
  };

  const selectAll = () => {
    setSelectedBenchmarks(new Set(discoveredBenchmarks.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedBenchmarks(new Set());
  };

  const importSelected = async () => {
    if (selectedBenchmarks.size === 0) {
      toast.error("Please select at least one benchmark to import");
      return;
    }

    setImporting(true);

    try {
      const benchmarksToInsert = Array.from(selectedBenchmarks).map((index) => {
        const b = discoveredBenchmarks[index];
        
        // Try to match dimension
        let dimensionId = null;
        if (b.dimension_match) {
          const matchedDim = dimensions.find(
            d => d.name.toLowerCase().includes(b.dimension_match!.toLowerCase()) ||
                 b.dimension_match!.toLowerCase().includes(d.name.toLowerCase())
          );
          if (matchedDim) dimensionId = matchedDim.id;
        }

        return {
          assessment_template_id: templateId,
          benchmark_type: b.industry === "Cross-industry" ? "global" : "industry",
          industry: b.industry === "Cross-industry" ? null : b.industry,
          framework: b.framework || null,
          source: `${b.source}${b.data_year ? ` (${b.data_year})` : ""}`,
          sample_size: b.sample_size || null,
          score_average: b.score_average,
          score_percentile_25: b.score_percentile_25 || null,
          score_percentile_50: b.score_percentile_50,
          score_percentile_75: b.score_percentile_75 || null,
          data_date: b.data_year ? `${b.data_year}-01-01` : null,
          dimension_id: dimensionId,
          metadata: {
            ai_discovered: true,
            name: b.name,
            description: b.description,
            relevance_notes: b.relevance_notes,
          },
        };
      });

      const { error } = await supabase
        .from("assessment_benchmarks")
        .insert(benchmarksToInsert);

      if (error) throw error;

      toast.success(`Imported ${benchmarksToInsert.length} benchmarks`);
      setSelectedBenchmarks(new Set());
      onBenchmarkAdded();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import benchmarks");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Benchmark Discovery
          </CardTitle>
          <CardDescription>
            Search for relevant public benchmarks based on your assessment topic and industry
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assessment Topic</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Digital Transformation Maturity"
              />
            </div>
            <div className="space-y-2">
              <Label>Industry Focus (Optional)</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Industry</SelectItem>
                  {COMMON_INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Additional Context (Optional)</Label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Any specific frameworks, standards, or aspects you want to focus on..."
              rows={2}
            />
          </div>

          <Button onClick={handleSearch} disabled={searching} className="w-full gap-2">
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching for benchmarks...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Discover Benchmarks
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Search Notes */}
      {searchNotes && (
        <Card className="bg-muted/50">
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground">{searchNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {discoveredBenchmarks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Discovered Benchmarks ({discoveredBenchmarks.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {discoveredBenchmarks.map((benchmark, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-colors ${
                      selectedBenchmarks.has(index) 
                        ? "border-primary bg-primary/5" 
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => toggleBenchmark(index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedBenchmarks.has(index)}
                          onCheckedChange={() => toggleBenchmark(index)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-medium">{benchmark.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {benchmark.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="gap-1">
                              <Building2 className="h-3 w-3" />
                              {benchmark.industry}
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              <BookOpen className="h-3 w-3" />
                              {benchmark.source}
                            </Badge>
                            {benchmark.framework && (
                              <Badge variant="outline" className="gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {benchmark.framework}
                              </Badge>
                            )}
                            {benchmark.data_year && (
                              <Badge variant="secondary">
                                {benchmark.data_year}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-4 gap-2 pt-2 text-sm">
                            {benchmark.score_percentile_25 && (
                              <div className="text-center p-2 bg-muted rounded">
                                <div className="text-xs text-muted-foreground">P25</div>
                                <div className="font-medium">{benchmark.score_percentile_25.toFixed(1)}</div>
                              </div>
                            )}
                            <div className="text-center p-2 bg-muted rounded">
                              <div className="text-xs text-muted-foreground">Median</div>
                              <div className="font-medium">{benchmark.score_percentile_50.toFixed(1)}</div>
                            </div>
                            <div className="text-center p-2 bg-primary/10 rounded">
                              <div className="text-xs text-muted-foreground">Avg</div>
                              <div className="font-medium text-primary">{benchmark.score_average.toFixed(1)}</div>
                            </div>
                            {benchmark.score_percentile_75 && (
                              <div className="text-center p-2 bg-muted rounded">
                                <div className="text-xs text-muted-foreground">P75</div>
                                <div className="font-medium">{benchmark.score_percentile_75.toFixed(1)}</div>
                              </div>
                            )}
                          </div>

                          {benchmark.relevance_notes && (
                            <p className="text-xs text-muted-foreground italic pt-1">
                              {benchmark.relevance_notes}
                            </p>
                          )}

                          {benchmark.dimension_match && (
                            <Badge variant="secondary" className="mt-1">
                              Matches: {benchmark.dimension_match}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {selectedBenchmarks.size > 0 && (
              <div className="pt-4 border-t mt-4">
                <Button 
                  onClick={importSelected} 
                  disabled={importing}
                  className="w-full gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Import {selectedBenchmarks.size} Selected Benchmark{selectedBenchmarks.size > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
