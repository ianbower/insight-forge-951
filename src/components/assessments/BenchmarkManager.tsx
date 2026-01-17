import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
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
  Database, 
  Upload, 
  Plus, 
  Globe, 
  Building2, 
  TrendingUp,
  RefreshCw,
  Trash2,
  Edit,
  Check,
  X
} from "lucide-react";
import { toast } from "sonner";

interface BenchmarkManagerProps {
  templateId: string;
  templateName: string;
  onClose?: () => void;
}

interface Benchmark {
  id: string;
  benchmark_type: string;
  industry: string | null;
  framework: string | null;
  source: string | null;
  sample_size: number | null;
  score_average: number | null;
  score_percentile_25: number | null;
  score_percentile_50: number | null;
  score_percentile_75: number | null;
  data_date: string | null;
  dimension_id: string | null;
  dimension_name?: string;
}

interface Dimension {
  id: string;
  name: string;
}

const BENCHMARK_TYPES = [
  { value: "industry", label: "Industry Benchmark" },
  { value: "global", label: "Global Benchmark" },
  { value: "internal", label: "Internal Baseline" },
  { value: "best_practice", label: "Best Practice Standard" },
];

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
];

export function BenchmarkManager({ templateId, templateName, onClose }: BenchmarkManagerProps) {
  const [loading, setLoading] = useState(true);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    benchmark_type: "industry",
    industry: "",
    framework: "",
    source: "",
    sample_size: "",
    score_average: "",
    score_percentile_25: "",
    score_percentile_50: "",
    score_percentile_75: "",
    data_date: "",
    dimension_id: "all",
  });

  useEffect(() => {
    fetchData();
  }, [templateId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch dimensions
    const { data: dimensionsData } = await supabase
      .from("assessment_dimensions")
      .select("id, name")
      .eq("assessment_template_id", templateId)
      .order("order_index");

    setDimensions(dimensionsData || []);

    // Fetch benchmarks
    const { data: benchmarksData } = await supabase
      .from("assessment_benchmarks")
      .select("*")
      .eq("assessment_template_id", templateId)
      .order("created_at", { ascending: false });

    // Map dimension names
    const enrichedBenchmarks = (benchmarksData || []).map((b) => ({
      ...b,
      dimension_name: b.dimension_id 
        ? dimensionsData?.find((d) => d.id === b.dimension_id)?.name || "Unknown"
        : "All Dimensions",
    }));

    setBenchmarks(enrichedBenchmarks);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      benchmark_type: "industry",
      industry: "",
      framework: "",
      source: "",
      sample_size: "",
      score_average: "",
      score_percentile_25: "",
      score_percentile_50: "",
      score_percentile_75: "",
      data_date: "",
      dimension_id: "all",
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.score_average) {
      toast.error("Average score is required");
      return;
    }

    const benchmarkData = {
      assessment_template_id: templateId,
      benchmark_type: formData.benchmark_type,
      industry: formData.industry || null,
      framework: formData.framework || null,
      source: formData.source || null,
      sample_size: formData.sample_size ? parseInt(formData.sample_size) : null,
      score_average: parseFloat(formData.score_average),
      score_percentile_25: formData.score_percentile_25 ? parseFloat(formData.score_percentile_25) : null,
      score_percentile_50: formData.score_percentile_50 ? parseFloat(formData.score_percentile_50) : null,
      score_percentile_75: formData.score_percentile_75 ? parseFloat(formData.score_percentile_75) : null,
      data_date: formData.data_date || null,
      dimension_id: formData.dimension_id === "all" ? null : formData.dimension_id,
    };

    if (editingId) {
      const { error } = await supabase
        .from("assessment_benchmarks")
        .update(benchmarkData)
        .eq("id", editingId);

      if (error) {
        toast.error("Failed to update benchmark");
        return;
      }
      toast.success("Benchmark updated");
    } else {
      const { error } = await supabase
        .from("assessment_benchmarks")
        .insert(benchmarkData);

      if (error) {
        toast.error("Failed to add benchmark");
        return;
      }
      toast.success("Benchmark added");
    }

    resetForm();
    setShowAddDialog(false);
    fetchData();
  };

  const handleEdit = (benchmark: Benchmark) => {
    setFormData({
      benchmark_type: benchmark.benchmark_type,
      industry: benchmark.industry || "",
      framework: benchmark.framework || "",
      source: benchmark.source || "",
      sample_size: benchmark.sample_size?.toString() || "",
      score_average: benchmark.score_average?.toString() || "",
      score_percentile_25: benchmark.score_percentile_25?.toString() || "",
      score_percentile_50: benchmark.score_percentile_50?.toString() || "",
      score_percentile_75: benchmark.score_percentile_75?.toString() || "",
      data_date: benchmark.data_date || "",
      dimension_id: benchmark.dimension_id || "all",
    });
    setEditingId(benchmark.id);
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("assessment_benchmarks")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete benchmark");
      return;
    }

    toast.success("Benchmark deleted");
    fetchData();
  };

  const importFromAssessments = async () => {
    // Fetch all completed instances for this template
    const { data: instances } = await supabase
      .from("assessment_instances")
      .select("id")
      .eq("assessment_template_id", templateId);

    if (!instances?.length) {
      toast.error("No assessment data available to import");
      return;
    }

    const instanceIds = instances.map((i) => i.id);

    // Get all responses for these instances
    const { data: responses } = await supabase
      .from("assessment_responses")
      .select(`
        response_value,
        question:assessment_questions(dimension_id)
      `)
      .in("assessment_instance_id", instanceIds);

    if (!responses?.length) {
      toast.error("No response data found");
      return;
    }

    // Calculate scores by dimension
    const scoresByDimension: Record<string, number[]> = { all: [] };
    
    responses.forEach((r) => {
      const value = typeof r.response_value === "number" 
        ? r.response_value 
        : Number(r.response_value) || 0;
      
      scoresByDimension.all.push(value);
      
      const dimId = (r.question as any)?.dimension_id;
      if (dimId) {
        if (!scoresByDimension[dimId]) {
          scoresByDimension[dimId] = [];
        }
        scoresByDimension[dimId].push(value);
      }
    });

    // Create benchmark entries
    const calculateStats = (scores: number[]) => {
      if (scores.length === 0) return null;
      const sorted = [...scores].sort((a, b) => a - b);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const p25 = sorted[Math.floor(sorted.length * 0.25)];
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p75 = sorted[Math.floor(sorted.length * 0.75)];
      return { avg, p25, p50, p75, count: scores.length };
    };

    const benchmarksToInsert = [];

    // Overall benchmark
    const overallStats = calculateStats(scoresByDimension.all);
    if (overallStats) {
      benchmarksToInsert.push({
        assessment_template_id: templateId,
        benchmark_type: "internal",
        source: "Aggregated from assessment responses",
        sample_size: overallStats.count,
        score_average: overallStats.avg,
        score_percentile_25: overallStats.p25,
        score_percentile_50: overallStats.p50,
        score_percentile_75: overallStats.p75,
        data_date: new Date().toISOString().split("T")[0],
      });
    }

    // Per-dimension benchmarks
    for (const [dimId, scores] of Object.entries(scoresByDimension)) {
      if (dimId === "all") continue;
      const stats = calculateStats(scores);
      if (stats) {
        benchmarksToInsert.push({
          assessment_template_id: templateId,
          benchmark_type: "internal",
          dimension_id: dimId,
          source: "Aggregated from assessment responses",
          sample_size: stats.count,
          score_average: stats.avg,
          score_percentile_25: stats.p25,
          score_percentile_50: stats.p50,
          score_percentile_75: stats.p75,
          data_date: new Date().toISOString().split("T")[0],
        });
      }
    }

    if (benchmarksToInsert.length === 0) {
      toast.error("No valid data to create benchmarks");
      return;
    }

    const { error } = await supabase
      .from("assessment_benchmarks")
      .insert(benchmarksToInsert);

    if (error) {
      toast.error("Failed to import benchmarks");
      return;
    }

    toast.success(`Imported ${benchmarksToInsert.length} benchmarks from responses`);
    fetchData();
  };

  const getBenchmarkTypeIcon = (type: string) => {
    switch (type) {
      case "industry": return <Building2 className="h-4 w-4" />;
      case "global": return <Globe className="h-4 w-4" />;
      case "internal": return <Database className="h-4 w-4" />;
      case "best_practice": return <TrendingUp className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getBenchmarkTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      industry: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      global: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      internal: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      best_practice: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Benchmark Data</h2>
          <p className="text-sm text-muted-foreground">
            Manage benchmark data for {templateName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={importFromAssessments} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Import from Responses
          </Button>
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Benchmark
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Benchmark" : "Add Benchmark Data"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Benchmark Type</Label>
                    <Select
                      value={formData.benchmark_type}
                      onValueChange={(v) => setFormData({ ...formData, benchmark_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BENCHMARK_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Apply To</Label>
                    <Select
                      value={formData.dimension_id}
                      onValueChange={(v) => setFormData({ ...formData, dimension_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Dimensions</SelectItem>
                        {dimensions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.benchmark_type === "industry" && (
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select
                      value={formData.industry}
                      onValueChange={(v) => setFormData({ ...formData, industry: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_INDUSTRIES.map((ind) => (
                          <SelectItem key={ind} value={ind}>
                            {ind}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Framework/Standard</Label>
                    <Input
                      value={formData.framework}
                      onChange={(e) => setFormData({ ...formData, framework: e.target.value })}
                      placeholder="e.g., CMMI, ISO 27001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Source</Label>
                    <Input
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      placeholder="e.g., Gartner 2024"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sample Size</Label>
                    <Input
                      type="number"
                      value={formData.sample_size}
                      onChange={(e) => setFormData({ ...formData, sample_size: e.target.value })}
                      placeholder="Number of responses"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Date</Label>
                    <Input
                      type="date"
                      value={formData.data_date}
                      onChange={(e) => setFormData({ ...formData, data_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Average Score (1-5) *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={formData.score_average}
                    onChange={(e) => setFormData({ ...formData, score_average: e.target.value })}
                    placeholder="Required"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>25th Percentile</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={formData.score_percentile_25}
                      onChange={(e) => setFormData({ ...formData, score_percentile_25: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Median (50th)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={formData.score_percentile_50}
                      onChange={(e) => setFormData({ ...formData, score_percentile_50: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>75th Percentile</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={formData.score_percentile_75}
                      onChange={(e) => setFormData({ ...formData, score_percentile_75: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => {
                    setShowAddDialog(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingId ? "Update" : "Add"} Benchmark
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Benchmarks Table */}
      {benchmarks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">No benchmark data</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add external benchmarks or import from your assessment responses
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Dimension</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-center">Avg</TableHead>
                <TableHead className="text-center">P25</TableHead>
                <TableHead className="text-center">P50</TableHead>
                <TableHead className="text-center">P75</TableHead>
                <TableHead className="text-center">N</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {benchmarks.map((benchmark) => (
                <TableRow key={benchmark.id}>
                  <TableCell>
                    <Badge variant="outline" className={getBenchmarkTypeBadge(benchmark.benchmark_type)}>
                      <span className="flex items-center gap-1.5">
                        {getBenchmarkTypeIcon(benchmark.benchmark_type)}
                        {BENCHMARK_TYPES.find((t) => t.value === benchmark.benchmark_type)?.label}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{benchmark.dimension_name}</TableCell>
                  <TableCell>{benchmark.industry || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{benchmark.source || "-"}</TableCell>
                  <TableCell className="text-center font-medium">{benchmark.score_average?.toFixed(2)}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{benchmark.score_percentile_25?.toFixed(2) || "-"}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{benchmark.score_percentile_50?.toFixed(2) || "-"}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{benchmark.score_percentile_75?.toFixed(2) || "-"}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{benchmark.sample_size || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(benchmark)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(benchmark.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Close button */}
      {onClose && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
