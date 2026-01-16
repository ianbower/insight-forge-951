import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Save,
  Play,
  Settings,
  GripVertical,
  Trash2,
  Copy,
  Edit,
  ChevronDown,
  ChevronRight,
  Layers,
  HelpCircle,
  Target,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AssessmentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  industry: string | null;
  framework_type: string | null;
}

interface Dimension {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  order_index: number;
  isExpanded?: boolean;
}

interface Question {
  id: string;
  dimension_id: string | null;
  question_text: string;
  question_type: string;
  weight: number;
  order_index: number;
  scale_config: {
    min: number;
    max: number;
    labels: Record<string, string>;
    descriptions: Record<string, string>;
  } | null;
  options: string[] | null;
  required: boolean;
}

const defaultScaleConfig = {
  min: 1,
  max: 5,
  labels: {
    "1": "Initial",
    "2": "Developing",
    "3": "Defined",
    "4": "Managed",
    "5": "Optimizing",
  },
  descriptions: {
    "1": "Ad-hoc processes, limited documentation",
    "2": "Basic processes in place, some consistency",
    "3": "Standardized and documented processes",
    "4": "Measured and controlled with metrics",
    "5": "Continuous improvement and optimization",
  },
};

export default function AssessmentBuilder() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [template, setTemplate] = useState<AssessmentTemplate | null>(null);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [showDimensionDialog, setShowDimensionDialog] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingDimension, setEditingDimension] = useState<Dimension | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedDimensionId, setSelectedDimensionId] = useState<string | null>(null);

  const [newDimension, setNewDimension] = useState({
    name: "",
    description: "",
    weight: 1,
  });

  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    question_text: "",
    question_type: "likert",
    weight: 1,
    required: true,
    scale_config: defaultScaleConfig,
    options: [],
  });

  useEffect(() => {
    if (assessmentId) {
      fetchAssessment();
    }
  }, [assessmentId]);

  const fetchAssessment = async () => {
    setLoading(true);

    // Fetch template
    const { data: templateData } = await supabase
      .from("assessment_templates")
      .select("*")
      .eq("id", assessmentId)
      .single();

    if (templateData) setTemplate(templateData);

    // Fetch dimensions
    const { data: dimensionsData } = await supabase
      .from("assessment_dimensions")
      .select("*")
      .eq("assessment_template_id", assessmentId)
      .order("order_index");

    setDimensions(
      (dimensionsData || []).map((d: any) => ({
        ...d,
        weight: Number(d.weight) || 1,
        isExpanded: true,
      }))
    );

    // Fetch questions
    const { data: questionsData } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_template_id", assessmentId)
      .order("order_index");

    setQuestions(
      (questionsData || []).map((q: any) => ({
        ...q,
        weight: Number(q.weight) || 1,
        scale_config: q.scale_config || defaultScaleConfig,
        options: q.options || [],
      }))
    );

    setLoading(false);
  };

  const handleAddDimension = async () => {
    if (!newDimension.name.trim()) return;

    const { data, error } = await supabase
      .from("assessment_dimensions")
      .insert({
        assessment_template_id: assessmentId,
        name: newDimension.name,
        description: newDimension.description || null,
        weight: newDimension.weight,
        order_index: dimensions.length,
      })
      .select()
      .single();

    if (!error && data) {
      setDimensions([...dimensions, { ...data, weight: Number(data.weight), isExpanded: true }]);
      setShowDimensionDialog(false);
      setNewDimension({ name: "", description: "", weight: 1 });
      toast({ title: "Dimension added" });
    }
  };

  const handleUpdateDimension = async () => {
    if (!editingDimension) return;

    const { error } = await supabase
      .from("assessment_dimensions")
      .update({
        name: editingDimension.name,
        description: editingDimension.description,
        weight: editingDimension.weight,
      })
      .eq("id", editingDimension.id);

    if (!error) {
      setDimensions(dimensions.map((d) => (d.id === editingDimension.id ? editingDimension : d)));
      setShowDimensionDialog(false);
      setEditingDimension(null);
      toast({ title: "Dimension updated" });
    }
  };

  const handleDeleteDimension = async (id: string) => {
    const { error } = await supabase.from("assessment_dimensions").delete().eq("id", id);
    if (!error) {
      setDimensions(dimensions.filter((d) => d.id !== id));
      setQuestions(questions.filter((q) => q.dimension_id !== id));
      toast({ title: "Dimension deleted" });
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.question_text?.trim()) return;

    const { data, error } = await supabase
      .from("assessment_questions")
      .insert({
        assessment_template_id: assessmentId,
        dimension_id: selectedDimensionId,
        question_text: newQuestion.question_text,
        question_type: newQuestion.question_type,
        weight: newQuestion.weight,
        order_index: questions.filter((q) => q.dimension_id === selectedDimensionId).length,
        scale_config: newQuestion.scale_config,
        options: newQuestion.options,
        required: newQuestion.required,
      })
      .select()
      .single();

    if (!error && data) {
      const scaleConfig = data.scale_config as { min: number; max: number; labels: Record<string, string>; descriptions: Record<string, string> } | null;
      const opts = data.options as string[] | null;
      setQuestions([
        ...questions,
        {
          ...data,
          weight: Number(data.weight),
          scale_config: scaleConfig || defaultScaleConfig,
          options: opts || [],
        } as Question,
      ]);
      setShowQuestionDialog(false);
      setNewQuestion({
        question_text: "",
        question_type: "likert",
        weight: 1,
        required: true,
        scale_config: defaultScaleConfig,
        options: [],
      });
      toast({ title: "Question added" });
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;

    const { error } = await supabase
      .from("assessment_questions")
      .update({
        question_text: editingQuestion.question_text,
        question_type: editingQuestion.question_type,
        weight: editingQuestion.weight,
        scale_config: editingQuestion.scale_config,
        options: editingQuestion.options,
        required: editingQuestion.required,
      })
      .eq("id", editingQuestion.id);

    if (!error) {
      setQuestions(questions.map((q) => (q.id === editingQuestion.id ? editingQuestion : q)));
      setShowQuestionDialog(false);
      setEditingQuestion(null);
      toast({ title: "Question updated" });
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    const { error } = await supabase.from("assessment_questions").delete().eq("id", id);
    if (!error) {
      setQuestions(questions.filter((q) => q.id !== id));
      toast({ title: "Question deleted" });
    }
  };

  const toggleDimension = (id: string) => {
    setDimensions(dimensions.map((d) => (d.id === id ? { ...d, isExpanded: !d.isExpanded } : d)));
  };

  const getQuestionsForDimension = (dimensionId: string | null) => {
    return questions.filter((q) => q.dimension_id === dimensionId);
  };

  const uncategorizedQuestions = getQuestionsForDimension(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading assessment...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Assessment not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/assessments")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">{template.name}</h1>
            <p className="text-sm text-muted-foreground">
              {template.category} • {template.framework_type || "Custom Framework"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button className="gap-2" onClick={() => navigate(`/assessments/${assessmentId}/launch`)}>
            <Play className="h-4 w-4" />
            Launch Assessment
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Layers className="h-4 w-4" />
          {dimensions.length} Dimensions
        </span>
        <span className="flex items-center gap-1">
          <HelpCircle className="h-4 w-4" />
          {questions.length} Questions
        </span>
        <span className="flex items-center gap-1">
          <Scale className="h-4 w-4" />
          Weighted Scoring
        </span>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Dimensions */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Dimensions</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingDimension(null);
                setShowDimensionDialog(true);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {dimensions.map((dimension) => (
              <Card
                key={dimension.id}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedDimensionId === dimension.id && "border-primary"
                )}
                onClick={() => setSelectedDimensionId(dimension.id)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{dimension.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {getQuestionsForDimension(dimension.id).length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Weight: {dimension.weight}x
                  </p>
                </CardContent>
              </Card>
            ))}

            {dimensions.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Add dimensions to organize your questions
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Main - Questions */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">
              {selectedDimensionId
                ? `Questions - ${dimensions.find((d) => d.id === selectedDimensionId)?.name}`
                : "All Questions"}
            </h2>
            <Button
              size="sm"
              onClick={() => {
                setEditingQuestion(null);
                setShowQuestionDialog(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </div>

          <div className="space-y-3">
            {(selectedDimensionId
              ? getQuestionsForDimension(selectedDimensionId)
              : questions
            ).map((question, index) => (
              <Card key={question.id} className="group">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-4 w-4 cursor-grab" />
                      <span className="text-sm font-medium w-6">{index + 1}.</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{question.question_text}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {question.question_type === "likert" ? "Likert Scale" : question.question_type}
                        </Badge>
                        <span>Weight: {question.weight}x</span>
                        {question.required && <span className="text-primary">Required</span>}
                      </div>
                      {question.question_type === "likert" && question.scale_config && (
                        <div className="mt-3 flex gap-2">
                          {Object.entries(question.scale_config.labels).map(([key, label]) => (
                            <div
                              key={key}
                              className="flex-1 text-center p-2 rounded bg-muted/50 text-xs"
                            >
                              <div className="font-medium">{key}</div>
                              <div className="text-muted-foreground">{label as string}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingQuestion(question);
                          setShowQuestionDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteQuestion(question.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(selectedDimensionId
              ? getQuestionsForDimension(selectedDimensionId)
              : questions
            ).length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No questions yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Add questions to build your assessment
                  </p>
                  <Button
                    onClick={() => {
                      setEditingQuestion(null);
                      setShowQuestionDialog(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Question
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dimension Dialog */}
      <Dialog open={showDimensionDialog} onOpenChange={setShowDimensionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDimension ? "Edit Dimension" : "Add Dimension"}</DialogTitle>
            <DialogDescription>
              Dimensions help organize questions into logical groups
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Dimension Name *</Label>
              <Input
                value={editingDimension?.name || newDimension.name}
                onChange={(e) =>
                  editingDimension
                    ? setEditingDimension({ ...editingDimension, name: e.target.value })
                    : setNewDimension({ ...newDimension, name: e.target.value })
                }
                placeholder="e.g., Technology & Infrastructure"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editingDimension?.description || newDimension.description}
                onChange={(e) =>
                  editingDimension
                    ? setEditingDimension({ ...editingDimension, description: e.target.value })
                    : setNewDimension({ ...newDimension, description: e.target.value })
                }
                placeholder="Describe what this dimension covers..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Weight (1-5)</Label>
              <Slider
                value={[editingDimension?.weight || newDimension.weight]}
                onValueChange={([value]) =>
                  editingDimension
                    ? setEditingDimension({ ...editingDimension, weight: value })
                    : setNewDimension({ ...newDimension, weight: value })
                }
                min={0.5}
                max={5}
                step={0.5}
              />
              <p className="text-sm text-muted-foreground">
                Current weight: {editingDimension?.weight || newDimension.weight}x
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDimensionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={editingDimension ? handleUpdateDimension : handleAddDimension}>
              {editingDimension ? "Save Changes" : "Add Dimension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
            <DialogDescription>
              Configure the question and its rating scale
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Question Text *</Label>
              <Textarea
                value={editingQuestion?.question_text || newQuestion.question_text}
                onChange={(e) =>
                  editingQuestion
                    ? setEditingQuestion({ ...editingQuestion, question_text: e.target.value })
                    : setNewQuestion({ ...newQuestion, question_text: e.target.value })
                }
                placeholder="Enter your question..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={editingQuestion?.question_type || newQuestion.question_type}
                  onValueChange={(value) =>
                    editingQuestion
                      ? setEditingQuestion({ ...editingQuestion, question_type: value })
                      : setNewQuestion({ ...newQuestion, question_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="likert">Likert Scale (1-5)</SelectItem>
                    <SelectItem value="text">Free Text</SelectItem>
                    <SelectItem value="numeric">Numeric</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dimension</Label>
                <Select
                  value={editingQuestion?.dimension_id || selectedDimensionId || "none"}
                  onValueChange={(value) => {
                    const dimId = value === "none" ? null : value;
                    if (editingQuestion) {
                      setEditingQuestion({ ...editingQuestion, dimension_id: dimId });
                    } else {
                      setSelectedDimensionId(dimId);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dimension" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Dimension</SelectItem>
                    {dimensions.map((dim) => (
                      <SelectItem key={dim.id} value={dim.id}>
                        {dim.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Required</Label>
                <p className="text-sm text-muted-foreground">Must be answered to complete</p>
              </div>
              <Switch
                checked={editingQuestion?.required ?? newQuestion.required}
                onCheckedChange={(checked) =>
                  editingQuestion
                    ? setEditingQuestion({ ...editingQuestion, required: checked })
                    : setNewQuestion({ ...newQuestion, required: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Weight (1-5)</Label>
              <Slider
                value={[editingQuestion?.weight || newQuestion.weight || 1]}
                onValueChange={([value]) =>
                  editingQuestion
                    ? setEditingQuestion({ ...editingQuestion, weight: value })
                    : setNewQuestion({ ...newQuestion, weight: value })
                }
                min={0.5}
                max={5}
                step={0.5}
              />
              <p className="text-sm text-muted-foreground">
                Current weight: {editingQuestion?.weight || newQuestion.weight}x
              </p>
            </div>

            {(editingQuestion?.question_type || newQuestion.question_type) === "likert" && (
              <div className="space-y-4 border rounded-lg p-4">
                <h4 className="font-medium">Scale Configuration</h4>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const config = editingQuestion?.scale_config || newQuestion.scale_config || defaultScaleConfig;
                    return (
                      <div key={level} className="grid grid-cols-3 gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{level}</Badge>
                        </div>
                        <Input
                          placeholder="Label"
                          value={config.labels?.[level.toString()] || ""}
                          onChange={(e) => {
                            const newConfig = {
                              ...config,
                              labels: { ...config.labels, [level.toString()]: e.target.value },
                            };
                            if (editingQuestion) {
                              setEditingQuestion({ ...editingQuestion, scale_config: newConfig });
                            } else {
                              setNewQuestion({ ...newQuestion, scale_config: newConfig });
                            }
                          }}
                        />
                        <Input
                          placeholder="Description"
                          value={config.descriptions?.[level.toString()] || ""}
                          onChange={(e) => {
                            const newConfig = {
                              ...config,
                              descriptions: { ...config.descriptions, [level.toString()]: e.target.value },
                            };
                            if (editingQuestion) {
                              setEditingQuestion({ ...editingQuestion, scale_config: newConfig });
                            } else {
                              setNewQuestion({ ...newQuestion, scale_config: newConfig });
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={editingQuestion ? handleUpdateQuestion : handleAddQuestion}>
              {editingQuestion ? "Save Changes" : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
