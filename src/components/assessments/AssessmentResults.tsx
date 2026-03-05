import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AssessmentRadarChart,
  AssessmentHeatMap,
  AssessmentGapAnalysis,
  AssessmentTrendChart,
  AssessmentScoreCard,
  BenchmarkComparison,
} from "./AssessmentVisualizations";
import { AssessmentInsights } from "./AssessmentInsights";
import { PrioritisationMatrix, type MatrixItem, type AssessmentContext } from "@/components/canvas/PrioritisationMatrix";
import { Users, BarChart3, Target, TrendingUp, Sparkles, Download, Filter, Database, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssessmentResultsProps {
  instanceId: string;
  instanceName: string;
  onClose?: () => void;
  embedded?: boolean; // When true, shows a simplified inline view
}

interface ResponseData {
  dimension_name: string;
  question_text: string;
  response_value: number;
  recipient_industry?: string;
  recipient_organization?: string;
}

interface BenchmarkData {
  id: string;
  benchmark_type: string;
  industry: string | null;
  dimension_id: string | null;
  score_average: number | null;
  score_percentile_25: number | null;
  score_percentile_50: number | null;
  score_percentile_75: number | null;
  source: string | null;
  sample_size: number | null;
}

export function AssessmentResults({ instanceId, instanceName, onClose, embedded = false }: AssessmentResultsProps) {
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [dimensions, setDimensions] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkData[]>([]);
  const [filterIndustry, setFilterIndustry] = useState<string>("all");
  const [filterOrg, setFilterOrg] = useState<string>("all");
  const [benchmarkFilter, setBenchmarkFilter] = useState<string>("all");
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [instanceId]);

  const fetchResults = async () => {
    setLoading(true);

    // Fetch instance details
    const { data: instanceData } = await supabase
      .from("assessment_instances")
      .select("*, assessment_template:assessment_templates(*)")
      .eq("id", instanceId)
      .single();

    if (!instanceData) {
      setLoading(false);
      return;
    }

    const templateId = instanceData.assessment_template_id;

    // Fetch dimensions
    const { data: dimensionsData } = await supabase
      .from("assessment_dimensions")
      .select("*")
      .eq("assessment_template_id", templateId)
      .order("order_index");

    setDimensions(dimensionsData || []);

    // Fetch questions
    const { data: questionsData } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_template_id", templateId)
      .order("order_index");

    setQuestions(questionsData || []);

    // Fetch recipients
    const { data: recipientsData } = await supabase
      .from("assessment_recipients")
      .select("*")
      .eq("assessment_instance_id", instanceId);

    setRecipients(recipientsData || []);

    // Fetch benchmarks for this template
    const { data: benchmarksData } = await supabase
      .from("assessment_benchmarks")
      .select("*")
      .eq("assessment_template_id", templateId);

    setBenchmarks(benchmarksData || []);

    // Fetch responses with recipient info
    const { data: responsesData } = await supabase
      .from("assessment_responses")
      .select(`
        *,
        recipient:assessment_recipients(industry, organization)
      `)
      .eq("assessment_instance_id", instanceId);

    // Transform responses
    const transformedResponses: ResponseData[] = (responsesData || []).map((r) => {
      const question = questionsData?.find((q) => q.id === r.question_id);
      const dimension = dimensionsData?.find((d) => d.id === question?.dimension_id);
      return {
        dimension_name: dimension?.name || "General",
        question_text: question?.question_text || "",
        response_value: typeof r.response_value === "number" ? r.response_value : Number(r.response_value) || 0,
        recipient_industry: r.recipient?.industry,
        recipient_organization: r.recipient?.organization,
      };
    });

    setResponses(transformedResponses);
    setLoading(false);
  };

  // Filter options
  const industries = useMemo(() => {
    const unique = new Set(recipients.map((r) => r.industry).filter(Boolean));
    return ["all", ...Array.from(unique)];
  }, [recipients]);

  const organizations = useMemo(() => {
    const unique = new Set(recipients.map((r) => r.organization).filter(Boolean));
    return ["all", ...Array.from(unique)];
  }, [recipients]);

  // Benchmark type options
  const benchmarkTypes = useMemo(() => {
    const unique = new Set(benchmarks.map((b) => b.benchmark_type));
    return ["all", ...Array.from(unique)];
  }, [benchmarks]);

  // Filtered responses
  const filteredResponses = useMemo(() => {
    return responses.filter((r) => {
      if (filterIndustry !== "all" && r.recipient_industry !== filterIndustry) return false;
      if (filterOrg !== "all" && r.recipient_organization !== filterOrg) return false;
      return true;
    });
  }, [responses, filterIndustry, filterOrg]);

  // Get benchmark for a dimension
  const getBenchmarkForDimension = (dimensionId: string | null) => {
    const filtered = benchmarks.filter((b) => {
      if (benchmarkFilter !== "all" && b.benchmark_type !== benchmarkFilter) return false;
      return b.dimension_id === dimensionId || b.dimension_id === null;
    });
    // Prefer dimension-specific benchmark
    const specific = filtered.find((b) => b.dimension_id === dimensionId);
    return specific || filtered[0];
  };

  // Calculate dimension scores with benchmarks
  const dimensionScores = useMemo(() => {
    const scoresByDimension: Record<string, { scores: number[]; id: string }> = {};

    filteredResponses.forEach((r) => {
      const dim = dimensions.find((d) => d.name === r.dimension_name);
      const dimKey = r.dimension_name;
      if (!scoresByDimension[dimKey]) {
        scoresByDimension[dimKey] = { scores: [], id: dim?.id || "" };
      }
      if (!isNaN(r.response_value)) {
        scoresByDimension[dimKey].scores.push(r.response_value);
      }
    });

    return Object.entries(scoresByDimension).map(([name, data]) => {
      const benchmark = getBenchmarkForDimension(data.id);
      return {
        name,
        score: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0,
        target: 4, // Default target
        benchmark: benchmark?.score_average || 3.5,
        benchmarkP25: benchmark?.score_percentile_25,
        benchmarkP75: benchmark?.score_percentile_75,
        benchmarkSource: benchmark?.source,
        benchmarkType: benchmark?.benchmark_type,
        responseCount: data.scores.length,
      };
    });
  }, [filteredResponses, dimensions, benchmarks, benchmarkFilter]);

  // Calculate overall score
  const overallScore = useMemo(() => {
    if (dimensionScores.length === 0) return 0;
    return dimensionScores.reduce((sum, d) => sum + d.score, 0) / dimensionScores.length;
  }, [dimensionScores]);

  // Generate matrix items from dimension scores for prioritisation
  const matrixItems: MatrixItem[] = useMemo(() => {
    return dimensionScores.map((dim, idx) => {
      const gapFromTarget = dim.target - dim.score;
      const category = dim.score >= 4 ? "Strength" : dim.score < 3 ? "Gap" : "Neutral";
      return {
        id: `dim-${idx}`,
        title: dim.name,
        description: `Initial dimension placeholder — click "AI Recommend" to generate specific, actionable initiatives.`,
        effort: 30 + (idx % 3) * 25 + Math.random() * 10,
        impact: Math.min(95, Math.max(5, (gapFromTarget / 4) * 80 + 20)),
        category,
        priorityScore: Math.round(Math.min(5, Math.max(1, gapFromTarget * 2 + 2))),
      };
    });
  }, [dimensionScores]);

  // Build rich assessment context for AI
  const assessmentCtx: AssessmentContext = useMemo(() => {
    const dimContexts = dimensionScores.map(dim => {
      const dimObj = dimensions.find(d => d.name === dim.name);
      const dimQuestions = questions.filter(q => q.dimension_id === dimObj?.id);
      const questionScores = dimQuestions.map(q => {
        const qResponses = filteredResponses.filter(r => r.question_text === q.question_text);
        const avgScore = qResponses.length > 0
          ? qResponses.reduce((sum, r) => sum + r.response_value, 0) / qResponses.length
          : 0;
        return { question: q.question_text, score: avgScore, target: dim.target };
      });
      return { name: dim.name, score: dim.score, target: dim.target, questionScores };
    });
    return {
      dimensions: dimContexts,
      projectName: instanceName,
    };
  }, [dimensionScores, dimensions, questions, filteredResponses, instanceName]);

  // Heat map data
  const heatMapData = useMemo(() => {
    const byDimension: Record<string, Record<string, number[]>> = {};

    filteredResponses.forEach((r) => {
      if (!byDimension[r.dimension_name]) {
        byDimension[r.dimension_name] = {};
      }
      if (!byDimension[r.dimension_name][r.question_text]) {
        byDimension[r.dimension_name][r.question_text] = [];
      }
      if (!isNaN(r.response_value)) {
        byDimension[r.dimension_name][r.question_text].push(r.response_value);
      }
    });

    return Object.entries(byDimension).map(([dimName, questions]) => ({
      name: dimName,
      questions: Object.entries(questions).map(([text, scores]) => ({
        text,
        score: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      })),
    }));
  }, [filteredResponses]);

  // Mock trend data (would come from historical assessments)
  const trendData = [
    { period: "Q1 2024", score: 2.8 },
    { period: "Q2 2024", score: 3.1 },
    { period: "Q3 2024", score: 3.4 },
    { period: "Q4 2024", score: overallScore },
  ];

  const completedCount = recipients.filter((r) => r.status === "completed").length;
  const responseRate = recipients.length > 0 ? (completedCount / recipients.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading results...</p>
      </div>
    );
  }

  // Embedded mode - simplified inline view
  if (embedded) {
    if (responses.length === 0) {
      return (
        <div className="py-6 text-center">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No responses yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold text-primary">{overallScore.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Overall Score</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Responses</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold">{dimensionScores.length}</p>
            <p className="text-xs text-muted-foreground">Dimensions</p>
          </div>
        </div>

        {/* Radar chart */}
        <AssessmentRadarChart data={dimensionScores} />

        {/* Quick dimension breakdown */}
        <div className="space-y-2">
          {dimensionScores.slice(0, 5).map((dim) => (
            <div key={dim.name} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate flex-1">{dim.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${(dim.score / 5) * 100}%` }}
                  />
                </div>
                <span className="font-medium w-8 text-right">{dim.score.toFixed(1)}</span>
              </div>
            </div>
          ))}
          {dimensionScores.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">
              +{dimensionScores.length - 5} more dimensions
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{instanceName}</h2>
          <p className="text-sm text-muted-foreground">
            {completedCount} of {recipients.length} responses ({responseRate.toFixed(0)}% completion)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setShowInsights(true)}
          >
            <Sparkles className="h-4 w-4" />
            AI Insights
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* AI Insights Dialog */}
      <Dialog open={showInsights} onOpenChange={setShowInsights}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI-Powered Insights</DialogTitle>
          </DialogHeader>
          <AssessmentInsights instanceId={instanceId} instanceName={instanceName} />
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by:</span>
        </div>
        <Select value={filterIndustry} onValueChange={setFilterIndustry}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            {industries.map((ind) => (
              <SelectItem key={ind} value={ind}>
                {ind === "all" ? "All Industries" : ind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterOrg} onValueChange={setFilterOrg}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Organization" />
          </SelectTrigger>
          <SelectContent>
            {organizations.map((org) => (
              <SelectItem key={org} value={org}>
                {org === "all" ? "All Organizations" : org}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {responses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">No responses yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Results will appear here once recipients complete the assessment
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Target className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="benchmarks" className="gap-2">
              <Database className="h-4 w-4" />
              Benchmarks
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="gaps" className="gap-2">
              <Target className="h-4 w-4" />
              Gap Analysis
            </TabsTrigger>
            <TabsTrigger value="prioritisation" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Prioritisation
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <AssessmentScoreCard
                score={overallScore}
                label="Overall Maturity"
                sublabel="Weighted average across dimensions"
              />
              <Card className="border-border">
                <CardContent className="pt-6 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-3xl font-bold">{completedCount}</p>
                  <p className="text-sm text-muted-foreground">Responses</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-3xl font-bold">{dimensionScores.length}</p>
                  <p className="text-sm text-muted-foreground">Dimensions</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6 text-center">
                  <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-3xl font-bold">{questions.length}</p>
                  <p className="text-sm text-muted-foreground">Questions</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AssessmentRadarChart data={dimensionScores} />
              <AssessmentTrendChart data={trendData} />
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details">
            <AssessmentHeatMap dimensions={heatMapData} />
          </TabsContent>

          {/* Benchmarks Tab */}
          <TabsContent value="benchmarks" className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm text-muted-foreground">Compare against:</span>
              <Select value={benchmarkFilter} onValueChange={setBenchmarkFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {benchmarkTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === "all" ? "All Benchmarks" : type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {benchmarks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium text-muted-foreground">No benchmark data available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add benchmarks to compare your results against industry standards
                  </p>
                </CardContent>
              </Card>
            ) : (
              <BenchmarkComparison 
                data={dimensionScores} 
                benchmarkLabel={benchmarkFilter === "all" ? "Combined Benchmark" : benchmarkFilter}
              />
            )}
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AssessmentTrendChart data={trendData} title="Overall Maturity Trend" />
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Dimension Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dimensionScores.map((dim) => (
                      <div key={dim.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{dim.name}</span>
                          <span className="font-medium">{dim.score.toFixed(2)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              dim.score >= 4 ? "bg-emerald-500" :
                              dim.score >= 3 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${(dim.score / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Gap Analysis Tab */}
          <TabsContent value="gaps">
            <AssessmentGapAnalysis data={dimensionScores} />
          </TabsContent>

          {/* Prioritisation Matrix Tab */}
          <TabsContent value="prioritisation">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  Prioritisation Matrix
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Dimensions are pre-plotted based on gap analysis. Drag items to reposition, or click "AI Recommend" for intelligent placement.
                </p>
              </CardHeader>
              <CardContent>
                <PrioritisationMatrix
                  defaultItems={matrixItems}
                  maxItems={10}
                  compact
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
