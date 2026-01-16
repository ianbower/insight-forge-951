import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, RefreshCw, Copy, Download, Loader2 } from "lucide-react";

interface DimensionScore {
  dimension: string;
  score: number;
  maxScore: number;
  benchmark?: number;
  target?: number;
}

interface GapData {
  dimension: string;
  currentScore: number;
  targetScore: number;
  priority: string;
}

interface AIInsightsPanelProps {
  templateName: string;
  instanceName: string;
  dimensionScores: DimensionScore[];
  gapData: GapData[];
  responseCount: number;
  overallScore: number;
  industry?: string;
}

export function AIInsightsPanel({
  templateName,
  instanceName,
  dimensionScores,
  gapData,
  responseCount,
  overallScore,
  industry,
}: AIInsightsPanelProps) {
  const { toast } = useToast();
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("assessment-insights", {
        body: {
          templateName,
          instanceName,
          dimensionScores,
          gapData,
          responseCount,
          overallScore,
          industry,
        },
      });

      if (fnError) throw fnError;

      if (data?.error) {
        throw new Error(data.error);
      }

      setInsights(data.insights);
      toast({ title: "AI insights generated successfully" });
    } catch (err: any) {
      console.error("Error generating insights:", err);
      const errorMessage = err.message || "Failed to generate insights";
      setError(errorMessage);
      toast({ 
        title: "Error generating insights", 
        description: errorMessage,
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (insights) {
      navigator.clipboard.writeText(insights);
      toast({ title: "Copied to clipboard" });
    }
  };

  const downloadAsText = () => {
    if (insights) {
      const blob = new Blob([insights], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${instanceName}-insights.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          AI-Powered Insights
        </CardTitle>
        {insights && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={downloadAsText}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={generateInsights} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!insights && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Generate AI Insights</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Get AI-powered analysis of your assessment results with actionable recommendations and strategic insights.
            </p>
            <Button onClick={generateInsights} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        )}

        {loading && !insights && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Analyzing assessment data...</p>
          </div>
        )}

        {error && !insights && (
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={generateInsights}>
              Try Again
            </Button>
          </div>
        )}

        {insights && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {insights.split('\n').map((line, i) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <h4 key={i} className="font-semibold text-foreground mt-4 mb-2">{line.replace(/\*\*/g, '')}</h4>;
                }
                if (line.startsWith('- ') || line.startsWith('• ')) {
                  return <p key={i} className="text-muted-foreground ml-4 my-1">{line}</p>;
                }
                if (line.match(/^\d+\./)) {
                  return <p key={i} className="text-muted-foreground ml-4 my-1">{line}</p>;
                }
                if (line.trim() === '') {
                  return <br key={i} />;
                }
                return <p key={i} className="text-muted-foreground my-1">{line}</p>;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
