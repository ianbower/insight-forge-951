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
  AssessmentRadarChart,
  AssessmentHeatMap,
  AssessmentGapAnalysis,
  AssessmentTrendChart,
  AssessmentScoreCard,
} from "./AssessmentVisualizations";
import { Users, BarChart3, Target, TrendingUp, Sparkles, Download, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssessmentResultsProps {
  instanceId: string;
  instanceName: string;
  onClose: () => void;
}

interface ResponseData {
  dimension_name: string;
  question_text: string;
  response_value: number;
  recipient_industry?: string;
  recipient_organization?: string;
}

export function AssessmentResults({ instanceId, instanceName, onClose }: AssessmentResultsProps) {
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [dimensions, setDimensions] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [filterIndustry, setFilterIndustry] = useState<string>("all");
  const [filterOrg, setFilterOrg] = useState<string>("all");

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

  // Filtered responses
  const filteredResponses = useMemo(() => {
    return responses.filter((r) => {
      if (filterIndustry !== "all" && r.recipient_industry !== filterIndustry) return false;
      if (filterOrg !== "all" && r.recipient_organization !== filterOrg) return false;
      return true;
    });
  }, [responses, filterIndustry, filterOrg]);

  // Calculate dimension scores
  const dimensionScores = useMemo(() => {
    const scoresByDimension: Record<string, number[]> = {};

    filteredResponses.forEach((r) => {
      if (!scoresByDimension[r.dimension_name]) {
        scoresByDimension[r.dimension_name] = [];
      }
      if (!isNaN(r.response_value)) {
        scoresByDimension[r.dimension_name].push(r.response_value);
      }
    });

    return Object.entries(scoresByDimension).map(([name, scores]) => ({
      name,
      score: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      target: 4, // Default target
      benchmark: 3.5, // Default benchmark
      responseCount: scores.length,
    }));
  }, [filteredResponses]);

  // Calculate overall score
  const overallScore = useMemo(() => {
    if (dimensionScores.length === 0) return 0;
    return dimensionScores.reduce((sum, d) => sum + d.score, 0) / dimensionScores.length;
  }, [dimensionScores]);

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
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Insights
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

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
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="gaps" className="gap-2">
              <Target className="h-4 w-4" />
              Gap Analysis
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
        </Tabs>
      )}
    </div>
  );
}
