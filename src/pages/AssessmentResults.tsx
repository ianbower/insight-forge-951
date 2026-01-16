import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Download,
  Share2,
  Users,
  CheckCircle2,
  Clock,
  BarChart3,
  Target,
  TrendingUp,
  Filter,
  Sparkles,
} from "lucide-react";
import { AssessmentRadarChart } from "@/components/assessments/AssessmentRadarChart";
import { AssessmentHeatMap } from "@/components/assessments/AssessmentHeatMap";
import { GapAnalysisChart } from "@/components/assessments/GapAnalysisChart";
import { AssessmentTrendChart } from "@/components/assessments/AssessmentTrendChart";
import { AIInsightsPanel } from "@/components/assessments/AIInsightsPanel";

interface Dimension {
  id: string;
  name: string;
  weight: number;
}

interface Question {
  id: string;
  dimension_id: string | null;
  question_text: string;
  weight: number;
  scale_config: {
    max: number;
  } | null;
}

interface Response {
  question_id: string;
  recipient_id: string;
  response_value: number;
}

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  organization: string | null;
  industry: string | null;
  status: string;
}

export default function AssessmentResults() {
  const { assessmentId, instanceId } = useParams<{ assessmentId: string; instanceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [instanceName, setInstanceName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  const [filterIndustry, setFilterIndustry] = useState<string>("all");
  const [filterOrg, setFilterOrg] = useState<string>("all");

  useEffect(() => {
    fetchResults();
  }, [instanceId]);

  const fetchResults = async () => {
    setLoading(true);

    // Fetch instance
    const { data: instanceData } = await supabase
      .from("assessment_instances")
      .select("*, assessment_templates(*)")
      .eq("id", instanceId)
      .single();

    if (instanceData) {
      setInstanceName(instanceData.name);
      setTemplateName((instanceData.assessment_templates as any)?.name || "");

      const templateId = instanceData.assessment_template_id;

      // Fetch dimensions
      const { data: dimensionsData } = await supabase
        .from("assessment_dimensions")
        .select("*")
        .eq("assessment_template_id", templateId)
        .order("order_index");

      setDimensions(
        (dimensionsData || []).map((d: any) => ({
          ...d,
          weight: Number(d.weight),
        }))
      );

      // Fetch questions
      const { data: questionsData } = await supabase
        .from("assessment_questions")
        .select("*")
        .eq("assessment_template_id", templateId)
        .order("order_index");

      setQuestions(
        (questionsData || []).map((q: any) => ({
          ...q,
          weight: Number(q.weight),
          scale_config: q.scale_config as Question["scale_config"],
        }))
      );

      // Fetch responses
      const { data: responsesData } = await supabase
        .from("assessment_responses")
        .select("*")
        .eq("assessment_instance_id", instanceId);

      setResponses(
        (responsesData || []).map((r: any) => ({
          ...r,
          response_value: typeof r.response_value === "number" ? r.response_value : Number(r.response_value),
        }))
      );

      // Fetch recipients
      const { data: recipientsData } = await supabase
        .from("assessment_recipients")
        .select("*")
        .eq("assessment_instance_id", instanceId);

      setRecipients(recipientsData || []);
    }

    setLoading(false);
  };

  // Filter responses based on selected filters
  const filteredResponses = useMemo(() => {
    let filteredRecipientIds = recipients.map((r) => r.id);

    if (filterIndustry !== "all") {
      filteredRecipientIds = recipients
        .filter((r) => r.industry === filterIndustry)
        .map((r) => r.id);
    }

    if (filterOrg !== "all") {
      filteredRecipientIds = filteredRecipientIds.filter((id) => {
        const recipient = recipients.find((r) => r.id === id);
        return recipient?.organization === filterOrg;
      });
    }

    return responses.filter((r) => filteredRecipientIds.includes(r.recipient_id));
  }, [responses, recipients, filterIndustry, filterOrg]);

  // Calculate dimension scores for radar chart
  const dimensionScores = useMemo(() => {
    return dimensions.map((dim) => {
      const dimQuestions = questions.filter((q) => q.dimension_id === dim.id);
      const dimResponses = filteredResponses.filter((r) =>
        dimQuestions.some((q) => q.id === r.question_id)
      );

      const totalScore = dimResponses.reduce((sum, r) => sum + r.response_value, 0);
      const maxPossible = dimQuestions.length * 5 * (dimResponses.length / dimQuestions.length || 1);
      const avgScore = dimResponses.length > 0 ? totalScore / dimResponses.length : 0;

      return {
        dimension: dim.name,
        score: avgScore,
        maxScore: 5,
        benchmark: 3.5, // Mock benchmark
        target: 4.5, // Mock target
      };
    });
  }, [dimensions, questions, filteredResponses]);

  // Calculate heat map data
  const heatMapData = useMemo(() => {
    return questions.map((q) => {
      const questionResponses = filteredResponses.filter((r) => r.question_id === q.id);
      const avgScore =
        questionResponses.length > 0
          ? questionResponses.reduce((sum, r) => sum + r.response_value, 0) / questionResponses.length
          : 0;

      const dimension = dimensions.find((d) => d.id === q.dimension_id);

      return {
        dimension: dimension?.name || "General",
        question: q.question_text,
        questionId: q.id,
        score: avgScore,
        maxScore: 5,
        responseCount: questionResponses.length,
      };
    });
  }, [questions, dimensions, filteredResponses]);

  // Calculate gap analysis data
  const gapData = useMemo(() => {
    return dimensions.map((dim, index) => {
      const dimScore = dimensionScores.find((d) => d.dimension === dim.name);
      return {
        dimension: dim.name,
        currentScore: dimScore?.score || 0,
        targetScore: 4.5,
        maxScore: 5,
        priority: index < 2 ? "high" : index < 4 ? "medium" : "low",
      } as const;
    });
  }, [dimensions, dimensionScores]);

  // Mock trend data
  const trendData = [
    { period: "Q1 2024", score: 45, benchmark: 55, target: 80 },
    { period: "Q2 2024", score: 52, benchmark: 56, target: 80 },
    { period: "Q3 2024", score: 58, benchmark: 57, target: 80 },
    { period: "Q4 2024", score: dimensionScores.length > 0 
      ? Math.round(dimensionScores.reduce((s, d) => s + (d.score / d.maxScore) * 100, 0) / dimensionScores.length)
      : 65, benchmark: 58, target: 80 },
  ];

  // Get unique industries and orgs for filters
  const industries = [...new Set(recipients.map((r) => r.industry).filter(Boolean))];
  const organizations = [...new Set(recipients.map((r) => r.organization).filter(Boolean))];

  const completedCount = recipients.filter((r) => r.status === "completed").length;
  const overallScore = dimensionScores.length > 0
    ? Math.round(dimensionScores.reduce((s, d) => s + (d.score / d.maxScore) * 100, 0) / dimensionScores.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading results...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/assessments/${assessmentId}/launch/${instanceId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">{instanceName}</h1>
            <p className="text-sm text-muted-foreground">{templateName} • Results</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Insights
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallScore}%</p>
                <p className="text-sm text-muted-foreground">Overall Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Responses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dimensions.length}</p>
                <p className="text-sm text-muted-foreground">Dimensions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">+{trendData[trendData.length - 1].score - trendData[0].score}</p>
                <p className="text-sm text-muted-foreground">Trend</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
            <SelectItem value="all">All Industries</SelectItem>
            {industries.map((ind) => (
              <SelectItem key={ind} value={ind!}>
                {ind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterOrg} onValueChange={setFilterOrg}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organizations</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org} value={org!}>
                {org}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Visualizations */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="details">Detailed Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="gaps">Gap Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AssessmentRadarChart
              data={dimensionScores}
              title="Dimension Scores"
              showBenchmark
              showTarget
            />
            <AssessmentHeatMap data={heatMapData} title="Question Scores" />
          </div>
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AIInsightsPanel
              templateName={templateName}
              instanceName={instanceName}
              dimensionScores={dimensionScores}
              gapData={gapData}
              responseCount={completedCount}
              overallScore={overallScore}
              industry={filterIndustry !== "all" ? filterIndustry : undefined}
            />
            <div className="space-y-6">
              <AssessmentRadarChart
                data={dimensionScores}
                title="Current Maturity"
                showBenchmark
                showTarget
              />
              <GapAnalysisChart data={gapData} title="Priority Gaps" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            <AssessmentHeatMap data={heatMapData} title="All Questions by Dimension" />
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AssessmentTrendChart
              data={trendData}
              title="Maturity Progression"
              showBenchmark
              showTarget
            />
            <AssessmentRadarChart
              data={dimensionScores}
              title="Current State"
              showBenchmark
            />
          </div>
        </TabsContent>

        <TabsContent value="gaps" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GapAnalysisChart data={gapData} title="Gap to Target" />
            <AssessmentRadarChart
              data={dimensionScores}
              title="Current vs Target"
              showTarget
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
