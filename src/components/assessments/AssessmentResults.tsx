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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Users, BarChart3, Target, TrendingUp, Sparkles, Download, Filter, Database, LayoutGrid, ListChecks } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AssessmentResultsProps {
  instanceId: string;
  instanceName: string;
  onClose?: () => void;
  embedded?: boolean;
}

interface ResponseData {
  dimension_name: string;
  question_text: string;
  response_value: number;
  target_value: number | null;
  recipient_industry?: string;
  recipient_organization?: string;
  item_id?: string | null;
  item_title?: string | null;
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

interface AssessmentItemData {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
}

export function AssessmentResults({ instanceId, instanceName, onClose, embedded = false }: AssessmentResultsProps) {
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [dimensions, setDimensions] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkData[]>([]);
  const [assessmentItems, setAssessmentItems] = useState<AssessmentItemData[]>([]);
  const [assessmentType, setAssessmentType] = useState("standard");
  const [filterIndustry, setFilterIndustry] = useState<string>("all");
  const [filterOrg, setFilterOrg] = useState<string>("all");
  const [benchmarkFilter, setBenchmarkFilter] = useState<string>("all");
  const [showInsights, setShowInsights] = useState(false);
  const [matrixXAxis, setMatrixXAxis] = useState<string>("");
  const [matrixYAxis, setMatrixYAxis] = useState<string>("");

  const isItemBased = ["use_case", "comparative", "process"].includes(assessmentType);

  useEffect(() => {
    fetchResults();
  }, [instanceId]);

  const fetchResults = async () => {
    setLoading(true);

    try {
      const { data: instanceData } = await supabase
        .from("assessment_instances")
        .select("*, assessment_template:assessment_templates(*)")
        .eq("id", instanceId)
        .single();

      if (!instanceData) {
        setResponses([]);
        setDimensions([]);
        setQuestions([]);
        setRecipients([]);
        setBenchmarks([]);
        setAssessmentItems([]);
        return;
      }

      const templateId = instanceData.assessment_template_id;
      const template = instanceData.assessment_template as any;
      const aType = template?.assessment_type || "standard";
      setAssessmentType(aType);

      const isItemAssessment = ["use_case", "comparative", "process"].includes(aType);

      const [
        itemsResult,
        dimensionsResult,
        questionsResult,
        recipientsResult,
        benchmarksResult,
        responsesResult,
      ] = await Promise.all([
        isItemAssessment
          ? supabase
              .from("assessment_items" as any)
              .select("*")
              .eq("assessment_template_id", templateId)
              .order("order_index")
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from("assessment_dimensions")
          .select("*")
          .eq("assessment_template_id", templateId)
          .order("order_index"),
        supabase
          .from("assessment_questions")
          .select("*")
          .eq("assessment_template_id", templateId)
          .order("order_index"),
        supabase
          .from("assessment_recipients")
          .select("*")
          .eq("assessment_instance_id", instanceId),
        supabase
          .from("assessment_benchmarks")
          .select("*")
          .eq("assessment_template_id", templateId),
        supabase
          .from("assessment_responses")
          .select(`
            *,
            recipient:assessment_recipients(industry, organization)
          `)
          .eq("assessment_instance_id", instanceId),
      ]);

      const itemsData = (itemsResult.data as any[]) || [];
      const dimensionsData = dimensionsResult.data || [];
      const questionsData = questionsResult.data || [];
      const recipientsData = recipientsResult.data || [];
      const benchmarksData = benchmarksResult.data || [];
      const responsesData = responsesResult.data || [];

      setAssessmentItems(itemsData);
      setDimensions(dimensionsData);
      setQuestions(questionsData);
      setRecipients(recipientsData);
      setBenchmarks(benchmarksData);

      const finalResponses: ResponseData[] = responsesData.map((r) => {
        const question = questionsData.find((q) => q.id === r.question_id);
        const dimension = dimensionsData.find((d) => d.id === question?.dimension_id);
        const itemId = (r as any).item_id;
        const item = itemsData.find((i: any) => i.id === itemId);

        const rawVal = r.response_value as any;
        let asIsScore: number;
        let toBeScore: number | null = null;

        if (rawVal && typeof rawVal === "object" && "asIs" in rawVal) {
          asIsScore = typeof rawVal.asIs === "number" ? rawVal.asIs : Number(rawVal.asIs) || 0;
          toBeScore = rawVal.toBe != null ? (typeof rawVal.toBe === "number" ? rawVal.toBe : Number(rawVal.toBe) || null) : null;
        } else {
          asIsScore = typeof rawVal === "number" ? rawVal : Number(rawVal) || 0;
        }

        return {
          dimension_name: dimension?.name || "General",
          question_text: question?.question_text || "",
          response_value: asIsScore,
          target_value: toBeScore,
          recipient_industry: r.recipient?.industry,
          recipient_organization: r.recipient?.organization,
          item_id: itemId || null,
          item_title: item?.title || null,
        };
      });

      setResponses(finalResponses);
    } catch (error) {
      console.error("Error loading assessment results:", error);
      setResponses([]);
    } finally {
      setLoading(false);
    }
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

  const benchmarkTypes = useMemo(() => {
    const unique = new Set(benchmarks.map((b) => b.benchmark_type));
    return ["all", ...Array.from(unique)];
  }, [benchmarks]);

  const filteredResponses = useMemo(() => {
    return responses.filter((r) => {
      if (filterIndustry !== "all" && r.recipient_industry !== filterIndustry) return false;
      if (filterOrg !== "all" && r.recipient_organization !== filterOrg) return false;
      return true;
    });
  }, [responses, filterIndustry, filterOrg]);

  const getBenchmarkForDimension = (dimensionId: string | null) => {
    const filtered = benchmarks.filter((b) => {
      if (benchmarkFilter !== "all" && b.benchmark_type !== benchmarkFilter) return false;
      return b.dimension_id === dimensionId || b.dimension_id === null;
    });
    const specific = filtered.find((b) => b.dimension_id === dimensionId);
    return specific || filtered[0];
  };

  // ===== STANDARD assessment scores =====
  const dimensionScores = useMemo(() => {
    if (isItemBased) return [];
    const scoresByDimension: Record<string, { scores: number[]; targets: number[]; id: string }> = {};

    filteredResponses.forEach((r) => {
      const dim = dimensions.find((d) => d.name === r.dimension_name);
      const dimKey = r.dimension_name;
      if (!scoresByDimension[dimKey]) {
        scoresByDimension[dimKey] = { scores: [], targets: [], id: dim?.id || "" };
      }
      if (!isNaN(r.response_value)) {
        scoresByDimension[dimKey].scores.push(r.response_value);
      }
      if (r.target_value != null && !isNaN(r.target_value)) {
        scoresByDimension[dimKey].targets.push(r.target_value);
      }
    });

    return Object.entries(scoresByDimension).map(([name, data]) => {
      const benchmark = getBenchmarkForDimension(data.id);
      const avgTarget = data.targets.length > 0
        ? data.targets.reduce((a, b) => a + b, 0) / data.targets.length
        : 4;
      return {
        name,
        score: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0,
        target: avgTarget,
        benchmark: benchmark?.score_average || 3.5,
        benchmarkP25: benchmark?.score_percentile_25,
        benchmarkP75: benchmark?.score_percentile_75,
        benchmarkSource: benchmark?.source,
        benchmarkType: benchmark?.benchmark_type,
        responseCount: data.scores.length,
      };
    });
  }, [filteredResponses, dimensions, benchmarks, benchmarkFilter, isItemBased]);

  // ===== ITEM-BASED assessment scores =====
  const itemScores = useMemo(() => {
    if (!isItemBased) return [];
    
    return assessmentItems.map((item) => {
      const itemResponses = filteredResponses.filter((r) => r.item_id === item.id);
      const scores = itemResponses.filter((r) => !isNaN(r.response_value)).map((r) => r.response_value);
      const targets = itemResponses.filter((r) => r.target_value != null && !isNaN(r.target_value!)).map((r) => r.target_value!);
      
      // Per-question breakdown
      const questionBreakdown = questions.map((q) => {
        const qResponses = itemResponses.filter((r) => r.question_text === q.question_text);
        const qScores = qResponses.filter((r) => !isNaN(r.response_value)).map((r) => r.response_value);
        return {
          question: q.question_text,
          score: qScores.length > 0 ? qScores.reduce((a, b) => a + b, 0) / qScores.length : 0,
          weight: Number(q.weight) || 1,
          dimension_id: q.dimension_id,
        };
      });

      // Per-dimension scores
      const dimensionScoresMap: Record<string, number> = {};
      dimensions.forEach((dim) => {
        const dimQuestions = questionBreakdown.filter((q) => q.dimension_id === dim.id);
        if (dimQuestions.length > 0) {
          const totalWeight = dimQuestions.reduce((s, q) => s + q.weight, 0);
          const weightedSum = dimQuestions.reduce((s, q) => s + q.score * q.weight, 0);
          dimensionScoresMap[dim.id] = totalWeight > 0 ? weightedSum / totalWeight : 0;
        }
      });

      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const avgTarget = targets.length > 0 ? targets.reduce((a, b) => a + b, 0) / targets.length : 4;

      // Weighted composite score
      const totalWeight = questionBreakdown.reduce((s, q) => s + q.weight, 0);
      const weightedComposite = totalWeight > 0
        ? questionBreakdown.reduce((s, q) => s + q.score * q.weight, 0) / totalWeight
        : avgScore;

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        score: avgScore,
        target: avgTarget,
        gap: avgTarget - avgScore,
        responseCount: scores.length,
        questionBreakdown,
        dimensionScores: dimensionScoresMap,
        weightedComposite,
      };
    });
  }, [filteredResponses, assessmentItems, questions, dimensions, isItemBased]);

  // Overall score (works for both types)
  const overallScore = useMemo(() => {
    if (isItemBased) {
      if (itemScores.length === 0) return 0;
      return itemScores.reduce((sum, i) => sum + i.score, 0) / itemScores.length;
    }
    if (dimensionScores.length === 0) return 0;
    return dimensionScores.reduce((sum, d) => sum + d.score, 0) / dimensionScores.length;
  }, [dimensionScores, itemScores, isItemBased]);

  // Matrix items for item-based assessments with configurable axes
  const matrixItems: MatrixItem[] = useMemo(() => {
    if (isItemBased) {
      const hasCustomAxes = matrixXAxis && matrixYAxis && matrixXAxis !== matrixYAxis;
      const maxScale = 5;

      return itemScores
        .filter((item) => item.weightedComposite > 0)
        .map((item) => {
        if (hasCustomAxes) {
          const xScore = item.dimensionScores[matrixXAxis] || 0;
          const yScore = item.dimensionScores[matrixYAxis] || 0;
          // Bubble size from weighted composite (normalised 0-100)
          const bubbleSize = (item.weightedComposite / maxScale) * 100;
          return {
            id: item.id,
            title: item.title,
            description: item.description || `Composite: ${item.weightedComposite.toFixed(1)}`,
            effort: Math.max(5, Math.min(95, (xScore / maxScale) * 100)),
            impact: Math.max(5, Math.min(95, (yScore / maxScale) * 100)),
            category: item.weightedComposite >= 4 ? "High Value" : item.weightedComposite >= 3 ? "Medium" : "Needs Attention",
            priorityScore: Math.round(bubbleSize),
          };
        }
        // Default: score → impact, inverse → effort
        const valueScore = (item.score / maxScale) * 100;
        const effortScore = 100 - valueScore;
        return {
          id: item.id,
          title: item.title,
          description: item.description || `Score: ${item.score.toFixed(1)} / Gap: ${item.gap.toFixed(1)}`,
          effort: Math.max(5, Math.min(95, effortScore)),
          impact: Math.max(5, Math.min(95, valueScore)),
          category: item.score >= 4 ? "High Value" : item.score >= 3 ? "Medium" : "Needs Attention",
          priorityScore: Math.round(item.score),
        };
      });
    }
    // Standard assessment matrix items
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
  }, [dimensionScores, itemScores, isItemBased, matrixXAxis, matrixYAxis]);

  // Axis labels based on selected dimensions
  const matrixAxisLabels = useMemo(() => {
    if (!isItemBased || !matrixXAxis || !matrixYAxis || matrixXAxis === matrixYAxis) {
      return { xLabel: "Implementation Effort", yLabel: "Business Impact / Value" };
    }
    const xDim = dimensions.find((d) => d.id === matrixXAxis);
    const yDim = dimensions.find((d) => d.id === matrixYAxis);
    return {
      xLabel: xDim?.name || "X Axis",
      yLabel: yDim?.name || "Y Axis",
    };
  }, [dimensions, matrixXAxis, matrixYAxis, isItemBased]);

  // Build assessment context for AI
  const assessmentCtx: AssessmentContext = useMemo(() => {
    if (isItemBased) {
      const dimContexts = itemScores.map(item => ({
        name: item.title,
        score: item.score,
        target: item.target,
        questionScores: item.questionBreakdown.map(q => ({
          question: q.question,
          score: q.score,
          target: item.target,
        })),
      }));
      return { dimensions: dimContexts, projectName: instanceName };
    }
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
    return { dimensions: dimContexts, projectName: instanceName };
  }, [dimensionScores, itemScores, dimensions, questions, filteredResponses, instanceName, isItemBased]);

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

  // Embedded mode
  if (embedded) {
    if (responses.length === 0) {
      return (
        <div className="py-6 text-center">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No responses yet — results will appear here once recipients complete the assessment</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
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
            <p className="text-2xl font-bold">{isItemBased ? assessmentItems.length : dimensionScores.length}</p>
            <p className="text-xs text-muted-foreground">{isItemBased ? "Items" : "Dimensions"}</p>
          </div>
        </div>

        {!isItemBased && <AssessmentRadarChart data={dimensionScores} />}

        <div className="space-y-2">
          {(isItemBased ? itemScores.slice(0, 5).map(i => ({ name: i.title, score: i.score })) : dimensionScores.slice(0, 5)).map((dim) => (
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{instanceName}</h2>
            {isItemBased && (
              <Badge variant="secondary" className="capitalize">
                {assessmentType.replace("_", " ")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {completedCount} of {recipients.length} responses ({responseRate.toFixed(0)}% completion)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => {
            const priTab = document.querySelector('[value="prioritisation"]') as HTMLButtonElement;
            if (priTab) priTab.click();
          }}>
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

      {responses.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-base font-medium text-muted-foreground">No responses yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Results will populate once recipients complete the assessment
            </p>
          </CardContent>
        </Card>
      )}

      {(
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Target className="h-4 w-4" />
              Overview
            </TabsTrigger>
            {isItemBased && (
              <TabsTrigger value="items" className="gap-2">
                <ListChecks className="h-4 w-4" />
                {assessmentType === "use_case" ? "Use Cases" : assessmentType === "comparative" ? "Comparison" : "Processes"}
              </TabsTrigger>
            )}
            <TabsTrigger value="details" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Details
            </TabsTrigger>
            {!isItemBased && (
              <>
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
              </>
            )}
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
                label="Overall Score"
                sublabel={isItemBased ? "Average across all items" : "Weighted average across dimensions"}
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
                  {isItemBased ? (
                    <ListChecks className="h-8 w-8 mx-auto mb-2 text-primary" />
                  ) : (
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
                  )}
                  <p className="text-3xl font-bold">{isItemBased ? assessmentItems.length : dimensionScores.length}</p>
                  <p className="text-sm text-muted-foreground">{isItemBased ? "Items" : "Dimensions"}</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6 text-center">
                  <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-3xl font-bold">{questions.length}</p>
                  <p className="text-sm text-muted-foreground">{isItemBased ? "Criteria" : "Questions"}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {isItemBased ? (
                // Item scores ranking
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {assessmentType === "use_case" ? "Use Case Ranking" : assessmentType === "comparative" ? "Option Ranking" : "Process Ranking"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {itemScores
                        .sort((a, b) => b.score - a.score)
                        .map((item, idx) => (
                          <div key={item.id} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <span className="text-muted-foreground">{idx + 1}.</span>
                                {item.title}
                              </span>
                              <span className="font-medium">{item.score.toFixed(2)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  item.score >= 4 ? "bg-emerald-500" :
                                  item.score >= 3 ? "bg-amber-500" : "bg-red-500"
                                )}
                                style={{ width: `${(item.score / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <AssessmentRadarChart data={dimensionScores} />
              )}
              <AssessmentTrendChart data={trendData} />
            </div>
          </TabsContent>

          {/* Items Tab (item-based only) */}
          {isItemBased && (
            <TabsContent value="items" className="space-y-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Detailed Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">
                            {assessmentType === "use_case" ? "Use Case" : assessmentType === "comparative" ? "Option" : "Process"}
                          </TableHead>
                          {questions.slice(0, 6).map((q) => (
                            <TableHead key={q.id} className="min-w-[120px] text-center">
                              <span className="line-clamp-2 text-xs">{q.question_text}</span>
                            </TableHead>
                          ))}
                          <TableHead className="text-center font-bold">Average</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemScores
                          .sort((a, b) => b.score - a.score)
                          .map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.title}</TableCell>
                              {item.questionBreakdown.slice(0, 6).map((q, idx) => (
                                <TableCell key={idx} className="text-center">
                                  <span
                                    className={cn(
                                      "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                                      q.score >= 4 ? "bg-emerald-500/10 text-emerald-600" :
                                      q.score >= 3 ? "bg-amber-500/10 text-amber-600" :
                                      "bg-red-500/10 text-red-600"
                                    )}
                                  >
                                    {q.score.toFixed(1)}
                                  </span>
                                </TableCell>
                              ))}
                              <TableCell className="text-center">
                                <Badge
                                  variant={item.score >= 4 ? "default" : item.score >= 3 ? "secondary" : "destructive"}
                                >
                                  {item.score.toFixed(2)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Details Tab */}
          <TabsContent value="details">
            <AssessmentHeatMap dimensions={heatMapData} />
          </TabsContent>

          {/* Benchmarks Tab (standard only) */}
          {!isItemBased && (
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
          )}

          {/* Trends Tab (standard only) */}
          {!isItemBased && (
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
          )}

          {/* Gap Analysis Tab (standard only) */}
          {!isItemBased && (
            <TabsContent value="gaps">
              <AssessmentGapAnalysis data={dimensionScores} />
            </TabsContent>
          )}

          {/* Prioritisation Matrix Tab */}
          <TabsContent value="prioritisation">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  Prioritisation Matrix
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isItemBased
                    ? `${assessmentType === "use_case" ? "Use cases" : "Items"} are plotted based on their evaluation scores. Configure the axes below to map dimensions, with bubble size reflecting the weighted composite score.`
                    : 'Dimensions are pre-plotted based on gap analysis. Select a detail level and click "AI Recommend" to generate specific, actionable initiatives informed by your assessment data.'
                  }
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Axis Configuration for item-based assessments */}
                {isItemBased && dimensions.length >= 2 && (
                  <div className="flex flex-wrap items-end gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="space-y-1.5 flex-1 min-w-[180px]">
                      <Label className="text-xs font-medium text-muted-foreground">X Axis (Horizontal)</Label>
                      <Select value={matrixXAxis} onValueChange={setMatrixXAxis}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select dimension..." />
                        </SelectTrigger>
                        <SelectContent>
                          {dimensions.map((d) => (
                            <SelectItem key={d.id} value={d.id} disabled={d.id === matrixYAxis}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-[180px]">
                      <Label className="text-xs font-medium text-muted-foreground">Y Axis (Vertical)</Label>
                      <Select value={matrixYAxis} onValueChange={setMatrixYAxis}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select dimension..." />
                        </SelectTrigger>
                        <SelectContent>
                          {dimensions.map((d) => (
                            <SelectItem key={d.id} value={d.id} disabled={d.id === matrixXAxis}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Bubble Size</Label>
                      <div className="h-9 px-3 flex items-center rounded-md border bg-background text-sm text-muted-foreground">
                        Weighted Composite Score
                      </div>
                    </div>
                    {matrixXAxis && matrixYAxis && matrixXAxis !== matrixYAxis && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 text-xs"
                        onClick={() => { setMatrixXAxis(""); setMatrixYAxis(""); }}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                )}

                <PrioritisationMatrix
                  key={`${matrixXAxis}-${matrixYAxis}`}
                  defaultItems={matrixItems}
                  maxItems={isItemBased ? assessmentItems.length + 10 : 10}
                  assessmentContext={assessmentCtx}
                  storageKey={`matrix-${instanceId}-${matrixXAxis}-${matrixYAxis}`}
                  compact
                  initialData={{ items: matrixItems, axisLabels: matrixAxisLabels }}
                  bubbleMode={!!(matrixXAxis && matrixYAxis && matrixXAxis !== matrixYAxis)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
