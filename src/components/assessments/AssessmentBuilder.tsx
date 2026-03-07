import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImportItemsDialog } from "./ImportItemsDialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Plus,
  Trash2,
  GripVertical,
  Settings2,
  Save,
  Layers,
  HelpCircle,
  ListChecks,
  Upload,
  CheckSquare,
  XSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ScaleConfig {
  min: number;
  max: number;
  labels: Record<number, string>;
  descriptions: Record<number, string>;
}

interface Question {
  id?: string;
  question_text: string;
  question_type: "likert" | "multiple_choice" | "text" | "numeric";
  weight: number;
  order_index: number;
  scale_config?: ScaleConfig;
  options?: string[];
  required: boolean;
  dimension_id?: string | null;
}

interface Dimension {
  id?: string;
  name: string;
  description: string;
  weight: number;
  order_index: number;
  questions: Question[];
}

interface AssessmentItem {
  id?: string;
  title: string;
  description: string;
  order_index: number;
  metadata_json?: any;
}

interface AssessmentBuilderProps {
  templateId: string;
  templateName: string;
  assessmentType?: string;
  onClose: () => void;
}

const defaultScaleConfig: ScaleConfig = {
  min: 1,
  max: 5,
  labels: {
    1: "Initial",
    2: "Developing",
    3: "Defined",
    4: "Managed",
    5: "Optimizing",
  },
  descriptions: {
    1: "Ad-hoc processes with little documentation or standardization",
    2: "Basic processes established but inconsistently applied",
    3: "Standardized processes with clear documentation",
    4: "Processes measured and controlled with data-driven decisions",
    5: "Continuous improvement with innovation and optimization",
  },
};

const assessmentTypeInfo: Record<string, { itemLabel: string; itemLabelPlural: string; description: string }> = {
  use_case: { itemLabel: "Use Case", itemLabelPlural: "Use Cases", description: "Each use case will be evaluated against all dimensions defined below." },
  comparative: { itemLabel: "Option", itemLabelPlural: "Options", description: "Each option (vendor/solution) will be scored against the evaluation dimensions below." },
  process: { itemLabel: "Process", itemLabelPlural: "Processes", description: "Each business process will be evaluated against the assessment dimensions below." },
};

export function AssessmentBuilder({ templateId, templateName, assessmentType = "standard", onClose }: AssessmentBuilderProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [items, setItems] = useState<AssessmentItem[]>([]);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [dimensionDialogOpen, setDimensionDialogOpen] = useState(false);
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedDimensionIndex, setSelectedDimensionIndex] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingDimension, setEditingDimension] = useState<Dimension | null>(null);

  const isItemBased = ["use_case", "comparative", "process"].includes(assessmentType);
  const typeInfo = assessmentTypeInfo[assessmentType];

  // New question form state
  const [newQuestion, setNewQuestion] = useState<Question>({
    question_text: "",
    question_type: "likert",
    weight: 1,
    order_index: 0,
    scale_config: { ...defaultScaleConfig },
    required: true,
  });

  // New dimension form state
  const [newDimension, setNewDimension] = useState({
    name: "",
    description: "",
    weight: 1,
  });

  // New item form state
  const [newItem, setNewItem] = useState({ title: "", description: "" });

  // Scale config for item-based dimension dialog
  const [dimensionScaleConfig, setDimensionScaleConfig] = useState<ScaleConfig>({ ...defaultScaleConfig });

  useEffect(() => {
    fetchDimensions();
    if (isItemBased) fetchItems();
  }, [templateId]);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("assessment_items" as any)
      .select("*")
      .eq("assessment_template_id", templateId)
      .order("order_index");
    setItems((data as any[]) || []);
  };

  const fetchDimensions = async () => {
    setLoading(true);

    const { data: dimensionsData } = await supabase
      .from("assessment_dimensions")
      .select("*")
      .eq("assessment_template_id", templateId)
      .order("order_index");

    const { data: questionsData } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_template_id", templateId)
      .order("order_index");

    const dims: Dimension[] = (dimensionsData || []).map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description || "",
      weight: Number(d.weight) || 1,
      order_index: d.order_index,
      questions: (questionsData || [])
        .filter((q) => q.dimension_id === d.id)
        .map((q) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type as Question["question_type"],
          weight: Number(q.weight) || 1,
          order_index: q.order_index,
          scale_config: q.scale_config as unknown as ScaleConfig | undefined,
          options: q.options as unknown as string[] | undefined,
          required: q.required,
          dimension_id: q.dimension_id,
        })),
    }));

    // For item-based assessments, auto-sync: ensure each dimension has at least one question
    if (isItemBased) {
      for (const dim of dims) {
        if (dim.id && dim.questions.length === 0) {
          await autoCreateDimensionQuestion(dim.id, dim.name);
        }
      }
      // Re-fetch if we created any
      const needsRefetch = dims.some((d) => d.id && d.questions.length === 0);
      if (needsRefetch) {
        const { data: updatedQuestions } = await supabase
          .from("assessment_questions")
          .select("*")
          .eq("assessment_template_id", templateId)
          .order("order_index");
        for (const dim of dims) {
          if (dim.id) {
            dim.questions = (updatedQuestions || [])
              .filter((q) => q.dimension_id === dim.id)
              .map((q) => ({
                id: q.id,
                question_text: q.question_text,
                question_type: q.question_type as Question["question_type"],
                weight: Number(q.weight) || 1,
                order_index: q.order_index,
                scale_config: q.scale_config as unknown as ScaleConfig | undefined,
                options: q.options as unknown as string[] | undefined,
                required: q.required,
                dimension_id: q.dimension_id,
              }));
          }
        }
      }
    }

    if (!isItemBased) {
      const uncategorizedQuestions = (questionsData || [])
        .filter((q) => !q.dimension_id)
        .map((q) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type as Question["question_type"],
          weight: Number(q.weight) || 1,
          order_index: q.order_index,
          scale_config: q.scale_config as unknown as ScaleConfig | undefined,
          options: q.options as unknown as string[] | undefined,
          required: q.required,
          dimension_id: null,
        }));

      if (uncategorizedQuestions.length > 0) {
        dims.unshift({
          name: "General Questions",
          description: "Questions not assigned to a specific dimension",
          weight: 1,
          order_index: -1,
          questions: uncategorizedQuestions,
        });
      }
    }

    setDimensions(dims);
    setLoading(false);
  };

  // Auto-create a single likert question for a dimension (item-based assessments)
  const autoCreateDimensionQuestion = async (dimensionId: string, dimensionName: string, scaleConfig?: ScaleConfig) => {
    await supabase.from("assessment_questions").insert({
      assessment_template_id: templateId,
      dimension_id: dimensionId,
      question_text: `Rate this item on: ${dimensionName}`,
      question_type: "likert",
      weight: 1,
      order_index: 0,
      scale_config: JSON.parse(JSON.stringify(scaleConfig || defaultScaleConfig)),
      required: true,
    });
  };

  const handleAddDimension = async () => {
    const { data, error } = await supabase
      .from("assessment_dimensions")
      .insert({
        assessment_template_id: templateId,
        name: newDimension.name,
        description: newDimension.description || null,
        weight: newDimension.weight,
        order_index: dimensions.length,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // For item-based assessments, auto-create the likert question for this dimension
    if (isItemBased && data) {
      await autoCreateDimensionQuestion(data.id, newDimension.name, dimensionScaleConfig);
    }

    toast({ title: "Dimension added" });
    setDimensionDialogOpen(false);
    setNewDimension({ name: "", description: "", weight: 1 });
    setDimensionScaleConfig({ ...defaultScaleConfig });
    fetchDimensions();
  };

  const handleAddQuestion = async () => {
    if (selectedDimensionIndex === null) return;

    const dimension = dimensions[selectedDimensionIndex];
    const dimensionId = dimension.id;

    const { error } = await supabase.from("assessment_questions").insert([{
      assessment_template_id: templateId,
      dimension_id: dimensionId || null,
      question_text: newQuestion.question_text,
      question_type: newQuestion.question_type,
      weight: newQuestion.weight,
      order_index: dimension.questions.length,
      scale_config: newQuestion.question_type === "likert" ? JSON.parse(JSON.stringify(newQuestion.scale_config)) : null,
      options: newQuestion.question_type === "multiple_choice" ? JSON.parse(JSON.stringify(newQuestion.options)) : null,
      required: newQuestion.required,
    }]);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Question added" });
      setQuestionDialogOpen(false);
      setNewQuestion({
        question_text: "",
        question_type: "likert",
        weight: 1,
        order_index: 0,
        scale_config: { ...defaultScaleConfig },
        required: true,
      });
      fetchDimensions();
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    const { error } = await supabase
      .from("assessment_questions")
      .delete()
      .eq("id", questionId);

    if (!error) {
      toast({ title: "Question deleted" });
      fetchDimensions();
    }
  };

  const handleDeleteDimension = async (dimensionId: string) => {
    // For item-based, also delete the auto-generated question(s)
    if (isItemBased) {
      await supabase
        .from("assessment_questions")
        .delete()
        .eq("dimension_id", dimensionId);
    }

    const { error } = await supabase
      .from("assessment_dimensions")
      .delete()
      .eq("id", dimensionId);

    if (!error) {
      toast({ title: "Dimension deleted" });
      fetchDimensions();
    }
  };

  const handleAddItem = async () => {
    const { error } = await supabase
      .from("assessment_items" as any)
      .insert({
        assessment_template_id: templateId,
        title: newItem.title,
        description: newItem.description || null,
        order_index: items.length,
      } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${typeInfo?.itemLabel || "Item"} added` });
      setItemDialogOpen(false);
      setNewItem({ title: "", description: "" });
      fetchItems();
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from("assessment_items" as any)
      .delete()
      .eq("id", itemId);

    if (!error) {
      toast({ title: `${typeInfo?.itemLabel || "Item"} deleted` });
      fetchItems();
    }
  };

  const handleToggleItemScope = async (itemId: string, inScope: boolean) => {
    const item = items.find((i) => i.id === itemId);
    const currentMeta = (item?.metadata_json as Record<string, any>) || {};
    const { error } = await supabase
      .from("assessment_items" as any)
      .update({ metadata_json: { ...currentMeta, in_scope: inScope } } as any)
      .eq("id", itemId);

    if (!error) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, metadata_json: { ...((i.metadata_json as Record<string, any>) || {}), in_scope: inScope } }
            : i
        )
      );
    }
  };

  const handleSelectAllItems = async (inScope: boolean) => {
    const ids = items.map((i) => i.id).filter(Boolean) as string[];
    if (ids.length === 0) return;
    for (const item of items) {
      if (!item.id) continue;
      const currentMeta = (item.metadata_json as Record<string, any>) || {};
      await supabase
        .from("assessment_items" as any)
        .update({ metadata_json: { ...currentMeta, in_scope: inScope } } as any)
        .eq("id", item.id);
    }
    setItems((prev) =>
      prev.map((i) => ({
        ...i,
        metadata_json: { ...((i.metadata_json as Record<string, any>) || {}), in_scope: inScope },
      }))
    );
  };

  const updateScaleLabel = (level: number, value: string) => {
    setNewQuestion((prev) => ({
      ...prev,
      scale_config: {
        ...prev.scale_config!,
        labels: { ...prev.scale_config!.labels, [level]: value },
      },
    }));
  };

  const updateScaleDescription = (level: number, value: string) => {
    setNewQuestion((prev) => ({
      ...prev,
      scale_config: {
        ...prev.scale_config!,
        descriptions: { ...prev.scale_config!.descriptions, [level]: value },
      },
    }));
  };

  const updateDimensionScaleLabel = (level: number, value: string) => {
    setDimensionScaleConfig((prev) => ({
      ...prev,
      labels: { ...prev.labels, [level]: value },
    }));
  };

  const updateDimensionScaleDescription = (level: number, value: string) => {
    setDimensionScaleConfig((prev) => ({
      ...prev,
      descriptions: { ...prev.descriptions, [level]: value },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading assessment builder...</p>
      </div>
    );
  }

  const totalQuestions = dimensions.reduce((sum, d) => sum + d.questions.length, 0);
  const namedDimensions = dimensions.filter((d) => d.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{templateName}</h2>
            {assessmentType !== "standard" && (
              <Badge variant="secondary" className="capitalize">
                {assessmentType.replace("_", " ")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isItemBased
              ? `${items.length} ${typeInfo?.itemLabelPlural?.toLowerCase() || "items"} • ${namedDimensions.length} evaluation dimensions`
              : `${totalQuestions} questions across ${namedDimensions.length} dimensions`
            }
          </p>
        </div>
        <div className="flex gap-2">
          {isItemBased && (
            <>
              <Button
                variant="outline"
                onClick={() => setImportDialogOpen(true)}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => setItemDialogOpen(true)}
                className="gap-2"
              >
                <ListChecks className="h-4 w-4" />
                Add {typeInfo?.itemLabel || "Item"}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setDimensionScaleConfig({ ...defaultScaleConfig });
              setDimensionDialogOpen(true);
            }}
            className="gap-2"
          >
            <Layers className="h-4 w-4" />
            Add Dimension
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Items Section (for item-based assessments) */}
      {isItemBased && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              {typeInfo?.itemLabelPlural || "Items"} to Evaluate
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {typeInfo?.description || "Each item will be evaluated against the dimensions below."}
            </p>
          </CardHeader>
          <CardContent>
            {items.length > 0 ? (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => item.id && handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center border border-dashed rounded-lg">
                <ListChecks className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No {typeInfo?.itemLabelPlural?.toLowerCase() || "items"} defined yet
                </p>
                <div className="flex gap-2 justify-center mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setItemDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add {typeInfo?.itemLabel || "Item"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setImportDialogOpen(true)}
                  >
                    <Upload className="h-4 w-4" />
                    Import CSV
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dimensions Section Title */}
      {isItemBased && (
        <div>
          <h3 className="text-base font-medium">Evaluation Dimensions</h3>
          <p className="text-sm text-muted-foreground">
            Each {typeInfo?.itemLabel?.toLowerCase() || "item"} will be scored against these dimensions using a maturity scale. All respondents will evaluate the same {typeInfo?.itemLabelPlural?.toLowerCase() || "items"} on the same dimensions.
          </p>
        </div>
      )}

      {/* Dimensions */}
      {isItemBased ? (
        // Item-based: simplified dimension display (no individual question management)
        <div className="space-y-3">
          {namedDimensions.map((dimension) => {
            const scaleConfig = dimension.questions[0]?.scale_config;
            const scaleRange = scaleConfig
              ? `${scaleConfig.min}–${scaleConfig.max} scale`
              : "1–5 scale";

            return (
              <Card key={dimension.id} className="border-border">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{dimension.name}</span>
                          <Badge variant="secondary" className="text-xs">{scaleRange}</Badge>
                          {dimension.weight !== 1 && (
                            <Badge variant="outline" className="text-xs">
                              Weight: {dimension.weight}x
                            </Badge>
                          )}
                        </div>
                        {dimension.description && (
                          <p className="text-sm text-muted-foreground mt-1">{dimension.description}</p>
                        )}
                        {scaleConfig && (
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {Array.from(
                              { length: scaleConfig.max - scaleConfig.min + 1 },
                              (_, i) => scaleConfig.min + i
                            ).map((level) => (
                              <div
                                key={level}
                                className="text-xs px-2 py-1 rounded bg-muted"
                                title={scaleConfig.descriptions?.[level]}
                              >
                                {level}: {scaleConfig.labels?.[level] || `Level ${level}`}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => dimension.id && handleDeleteDimension(dimension.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {namedDimensions.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">No dimensions yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add dimensions to define the evaluation criteria for each {typeInfo?.itemLabel?.toLowerCase() || "item"}
                </p>
                <Button
                  onClick={() => {
                    setDimensionScaleConfig({ ...defaultScaleConfig });
                    setDimensionDialogOpen(true);
                  }}
                  variant="outline"
                  className="mt-4 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add First Dimension
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Standard: full question management inside dimensions
        <Accordion type="multiple" className="space-y-4">
          {dimensions.map((dimension, dimIndex) => (
            <AccordionItem
              key={dimension.id || `dim-${dimIndex}`}
              value={dimension.id || `dim-${dimIndex}`}
              className="border rounded-lg bg-card"
            >
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{dimension.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {dimension.questions.length} questions
                      </Badge>
                      {dimension.weight !== 1 && (
                        <Badge variant="outline" className="text-xs">
                          Weight: {dimension.weight}x
                        </Badge>
                      )}
                    </div>
                    {dimension.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {dimension.description}
                      </p>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3">
                  {dimension.questions.map((question, qIndex) => (
                    <Card
                      key={question.id || `q-${qIndex}`}
                      className="border-border/50 bg-background"
                    >
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs capitalize">
                                {question.question_type.replace("_", " ")}
                              </Badge>
                              {question.weight !== 1 && (
                                <Badge variant="secondary" className="text-xs">
                                  {question.weight}x
                                </Badge>
                              )}
                              {question.required && (
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm">{question.question_text}</p>
                            {question.question_type === "likert" && question.scale_config && (
                              <div className="flex gap-2 mt-2">
                                {Array.from(
                                  { length: question.scale_config.max - question.scale_config.min + 1 },
                                  (_, i) => question.scale_config!.min + i
                                ).map((level) => (
                                  <div
                                    key={level}
                                    className="text-xs text-center px-2 py-1 rounded bg-muted"
                                    title={question.scale_config!.descriptions?.[level]}
                                  >
                                    {level}: {question.scale_config!.labels?.[level] || `Level ${level}`}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => question.id && handleDeleteQuestion(question.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => {
                      setSelectedDimensionIndex(dimIndex);
                      setQuestionDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add Question
                  </Button>
                </div>

                {dimension.id && (
                  <div className="flex justify-end mt-4 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive gap-2"
                      onClick={() => dimension.id && handleDeleteDimension(dimension.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Dimension
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}

          {dimensions.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">No dimensions yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add dimensions to organize your assessment questions
                </p>
                <Button
                  onClick={() => setDimensionDialogOpen(true)}
                  variant="outline"
                  className="mt-4 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add First Dimension
                </Button>
              </CardContent>
            </Card>
          )}
        </Accordion>
      )}

      {/* Add Dimension Dialog */}
      <Dialog open={dimensionDialogOpen} onOpenChange={setDimensionDialogOpen}>
        <DialogContent className={isItemBased ? "max-w-2xl max-h-[90vh] overflow-y-auto" : ""}>
          <DialogHeader>
            <DialogTitle>{isItemBased ? "Add Evaluation Dimension" : "Add Dimension"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Dimension Name</Label>
              <Input
                placeholder={isItemBased ? "e.g., Business Value, Implementation Effort" : "e.g., Technology Infrastructure"}
                value={newDimension.name}
                onChange={(e) => setNewDimension({ ...newDimension, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what this dimension measures..."
                value={newDimension.description}
                onChange={(e) => setNewDimension({ ...newDimension, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Weight (for scoring)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[newDimension.weight]}
                  onValueChange={([value]) => setNewDimension({ ...newDimension, weight: value })}
                  min={0.5}
                  max={3}
                  step={0.25}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12">{newDimension.weight}x</span>
              </div>
            </div>

            {/* Scale config for item-based assessments */}
            {isItemBased && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <Label className="text-base font-medium">Rating Scale</Label>
                <p className="text-sm text-muted-foreground">
                  Configure the scale respondents will use to rate each {typeInfo?.itemLabel?.toLowerCase() || "item"} on this dimension.
                </p>
                <div className="space-y-3">
                  {Array.from(
                    { length: dimensionScaleConfig.max - dimensionScaleConfig.min + 1 },
                    (_, i) => dimensionScaleConfig.min + i
                  ).map((level) => (
                    <div key={level} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-1 flex items-center justify-center h-9 rounded bg-primary/10 text-primary font-medium">
                        {level}
                      </div>
                      <div className="col-span-3">
                        <Input
                          placeholder="Label"
                          value={dimensionScaleConfig.labels?.[level] || ""}
                          onChange={(e) => updateDimensionScaleLabel(level, e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="col-span-8">
                        <Input
                          placeholder="Description for this level..."
                          value={dimensionScaleConfig.descriptions?.[level] || ""}
                          onChange={(e) => updateDimensionScaleDescription(level, e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDimensionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDimension} disabled={!newDimension.name}>
              Add Dimension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      {isItemBased && (
        <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add {typeInfo?.itemLabel || "Item"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{typeInfo?.itemLabel || "Item"} Name</Label>
                <Input
                  placeholder={assessmentType === "use_case" ? "e.g., Automated Invoice Processing" : assessmentType === "comparative" ? "e.g., Vendor A" : "e.g., Order Management"}
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder={`Describe this ${typeInfo?.itemLabel?.toLowerCase() || "item"}...`}
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddItem} disabled={!newItem.title}>
                Add {typeInfo?.itemLabel || "Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Question Dialog (standard only) */}
      {!isItemBased && (
        <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Question</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Question Text</Label>
                <Textarea
                  placeholder="Enter your question..."
                  value={newQuestion.question_text}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, question_text: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Response Type</Label>
                  <Select
                    value={newQuestion.question_type}
                    onValueChange={(value: Question["question_type"]) =>
                      setNewQuestion({ ...newQuestion, question_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="likert">Likert Scale (1-5)</SelectItem>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="text">Free Text</SelectItem>
                      <SelectItem value="numeric">Numeric Value</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Weight</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[newQuestion.weight]}
                      onValueChange={([value]) =>
                        setNewQuestion({ ...newQuestion, weight: value })
                      }
                      min={0.5}
                      max={3}
                      step={0.25}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-12">{newQuestion.weight}x</span>
                  </div>
                </div>
              </div>

              {/* Likert Scale Configuration */}
              {newQuestion.question_type === "likert" && (
                <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Scale Configuration</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => setScaleDialogOpen(true)}
                    >
                      <Settings2 className="h-4 w-4" />
                      Advanced
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {Array.from(
                      { length: newQuestion.scale_config!.max - newQuestion.scale_config!.min + 1 },
                      (_, i) => newQuestion.scale_config!.min + i
                    ).map((level) => (
                      <div key={level} className="grid grid-cols-12 gap-2 items-start">
                        <div className="col-span-1 flex items-center justify-center h-9 rounded bg-primary/10 text-primary font-medium">
                          {level}
                        </div>
                        <div className="col-span-3">
                          <Input
                            placeholder="Label"
                            value={newQuestion.scale_config!.labels?.[level] || ""}
                            onChange={(e) => updateScaleLabel(level, e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-8">
                          <Input
                            placeholder="Description for this level..."
                            value={newQuestion.scale_config!.descriptions?.[level] || ""}
                            onChange={(e) => updateScaleDescription(level, e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Multiple Choice Options */}
              {newQuestion.question_type === "multiple_choice" && (
                <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                  <Label className="text-base font-medium">Answer Options</Label>
                  {(newQuestion.options || [""]).map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...(newQuestion.options || [])];
                          newOptions[index] = e.target.value;
                          setNewQuestion({ ...newQuestion, options: newOptions });
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newOptions = (newQuestion.options || []).filter(
                            (_, i) => i !== index
                          );
                          setNewQuestion({ ...newQuestion, options: newOptions });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewQuestion({
                        ...newQuestion,
                        options: [...(newQuestion.options || []), ""],
                      });
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Option
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddQuestion} disabled={!newQuestion.question_text}>
                Add Question
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Import Items Dialog */}
      {isItemBased && (
        <ImportItemsDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          itemLabel={typeInfo?.itemLabel || "Item"}
          itemLabelPlural={typeInfo?.itemLabelPlural || "Items"}
          onImport={async (importedItems) => {
            const inserts = importedItems.map((item, idx) => ({
              assessment_template_id: templateId,
              title: item.title,
              description: item.description || null,
              order_index: items.length + idx,
            }));
            const { error } = await supabase
              .from("assessment_items" as any)
              .insert(inserts as any);
            if (error) throw error;
            fetchItems();
          }}
        />
      )}
    </div>
  );
}
