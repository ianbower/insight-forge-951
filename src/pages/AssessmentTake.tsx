import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  Send,
  ArrowLeft,
  Home,
  MessageSquarePlus,
  ChevronDown,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ScaleConfig {
  min: number;
  max: number;
  labels: Record<number, string>;
  descriptions: Record<number, string>;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  scale_config?: ScaleConfig;
  options?: string[];
  required: boolean;
  dimension_id: string | null;
}

interface Dimension {
  id: string;
  name: string;
  description: string | null;
  questions: Question[];
}

interface AssessmentItem {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
}

export default function AssessmentTake() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [recipient, setRecipient] = useState<any>(null);
  const [instance, setInstance] = useState<any>(null);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [items, setItems] = useState<AssessmentItem[]>([]);
  const [assessmentType, setAssessmentType] = useState("standard");
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [currentDimensionIndex, setCurrentDimensionIndex] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const notesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Item-based flow state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [itemSelectionDone, setItemSelectionDone] = useState(false);

  const isItemBased = ["use_case", "comparative", "process"].includes(assessmentType);
  const selectedItems = items.filter((i) => selectedItemIds.has(i.id));

  useEffect(() => {
    if (token) {
      fetchAssessment();
    }
  }, [token]);

  const fetchAssessment = async () => {
    setLoading(true);

    const { data: recipientData, error: recipientError } = await supabase
      .from("assessment_recipients")
      .select("*, assessment_instance:assessment_instances(*, assessment_template:assessment_templates(*))")
      .eq("token", token)
      .single();

    if (recipientError || !recipientData) {
      toast({ title: "Invalid or expired link", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (recipientData.status === "completed") {
      setCompleted(true);
      setLoading(false);
      return;
    }

    setRecipient(recipientData);
    setInstance(recipientData.assessment_instance);

    const templateId = recipientData.assessment_instance.assessment_template_id;
    const template = recipientData.assessment_instance.assessment_template;
    const aType = (template as any)?.assessment_type || "standard";
    setAssessmentType(aType);

    if (recipientData.status === "pending") {
      await supabase
        .from("assessment_recipients")
        .update({ status: "started", started_at: new Date().toISOString() })
        .eq("id", recipientData.id);
    }

    // Fetch items for item-based assessments
    if (["use_case", "comparative", "process"].includes(aType)) {
      const { data: itemsData } = await supabase
        .from("assessment_items" as any)
        .select("*")
        .eq("assessment_template_id", templateId)
        .order("order_index");
      // Filter to only in-scope items (default is in-scope if not explicitly set)
      const allItems = (itemsData as any[]) || [];
      const inScopeItems = allItems.filter((item: any) => {
        const meta = item.metadata_json as Record<string, any> | null;
        return meta?.in_scope !== false;
      });
      setItems(inScopeItems);
    }

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

    const { data: existingResponses } = await supabase
      .from("assessment_responses")
      .select("*")
      .eq("assessment_instance_id", recipientData.assessment_instance.id)
      .eq("recipient_id", recipientData.id);

    const responsesMap: Record<string, any> = {};
    const notesMap: Record<string, string> = {};
    (existingResponses || []).forEach((r) => {
      const itemId = (r as any).item_id;
      const key = itemId ? `${itemId}:${r.question_id}` : r.question_id;
      responsesMap[key] = r.response_value;
      if (r.notes) notesMap[key] = r.notes;
    });
    setResponses(responsesMap);
    setNotes(notesMap);

    // If there are existing responses for items, auto-select those items
    if (["use_case", "comparative", "process"].includes(aType)) {
      const respondedItemIds = new Set<string>();
      (existingResponses || []).forEach((r) => {
        const itemId = (r as any).item_id;
        if (itemId) respondedItemIds.add(itemId);
      });
      if (respondedItemIds.size > 0) {
        setSelectedItemIds(respondedItemIds);
        setItemSelectionDone(true);
      }
    }

    const dims: Dimension[] = (dimensionsData || []).map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      questions: (questionsData || [])
        .filter((q) => q.dimension_id === d.id)
        .map((q) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          scale_config: q.scale_config as unknown as ScaleConfig | undefined,
          options: q.options as unknown as string[] | undefined,
          required: q.required,
          dimension_id: q.dimension_id,
        })),
    }));

    const uncategorizedQuestions = (questionsData || [])
      .filter((q) => !q.dimension_id)
      .map((q) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        scale_config: q.scale_config as unknown as ScaleConfig | undefined,
        options: q.options as unknown as string[] | undefined,
        required: q.required,
        dimension_id: null,
      }));

    if (uncategorizedQuestions.length > 0) {
      dims.unshift({
        id: "general",
        name: "General Questions",
        description: null,
        questions: uncategorizedQuestions,
      });
    }

    setDimensions(dims);
    setLoading(false);
  };

  const getResponseKey = (questionId: string, itemId?: string) => {
    if (isItemBased && itemId) {
      return `${itemId}:${questionId}`;
    }
    if (isItemBased && selectedItems.length > 0) {
      return `${selectedItems[currentItemIndex]?.id}:${questionId}`;
    }
    return questionId;
  };

  const handleResponse = async (questionId: string, value: any, itemId?: string) => {
    const key = getResponseKey(questionId, itemId);
    setResponses((prev) => ({ ...prev, [key]: value }));

    const resolvedItemId = itemId || (isItemBased && selectedItems.length > 0 ? selectedItems[currentItemIndex]?.id : null);

    const insertData: any = {
      assessment_instance_id: instance.id,
      recipient_id: recipient.id,
      question_id: questionId,
      response_value: value,
    };
    if (resolvedItemId) insertData.item_id = resolvedItemId;

    const { error } = await supabase.from("assessment_responses").upsert(
      insertData,
      { onConflict: "assessment_instance_id,recipient_id,question_id" }
    );

    if (error) {
      console.error("Error saving response:", error);
    }
  };

  const handleDualResponse = async (questionId: string, field: "asIs" | "toBe", value: number, itemId?: string) => {
    const key = getResponseKey(questionId, itemId);
    const current = responses[key];
    const updated = {
      asIs: current?.asIs ?? null,
      toBe: current?.toBe ?? null,
      [field]: value,
    };
    await handleResponse(questionId, updated, itemId);
  };

  const handleNotesChange = (questionId: string, value: string, itemId?: string) => {
    const key = getResponseKey(questionId, itemId);
    setNotes((prev) => ({ ...prev, [key]: value }));
    if (notesTimers.current[key]) clearTimeout(notesTimers.current[key]);
    notesTimers.current[key] = setTimeout(async () => {
      const query = supabase
        .from("assessment_responses")
        .update({ notes: value })
        .eq("assessment_instance_id", instance.id)
        .eq("recipient_id", recipient.id)
        .eq("question_id", questionId);
      await query;
    }, 800);
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    const { error } = await supabase
      .from("assessment_recipients")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", recipient.id);

    if (error) {
      toast({ title: "Error submitting", description: error.message, variant: "destructive" });
    } else {
      setCompleted(true);
      toast({ title: "Assessment submitted successfully!" });
    }

    setSubmitting(false);
  };

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const selectAllItems = () => {
    if (selectedItemIds.size === items.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(items.map((i) => i.id)));
    }
  };

  // --- Navigation for item-based (one item per page, all dimensions shown) ---
  const currentItem = isItemBased && itemSelectionDone ? selectedItems[currentItemIndex] : null;

  // --- Navigation for standard (paginate by dimension) ---
  const currentDimension = !isItemBased ? dimensions[currentDimensionIndex] : null;

  const allQuestions = dimensions.reduce((acc, d) => acc.concat(d.questions), [] as Question[]);

  // Progress calculation
  const totalSlots = isItemBased
    ? selectedItems.length * allQuestions.length
    : allQuestions.length;
  const answeredSlots = Object.keys(responses).filter((key) => {
    const val = responses[key];
    if (val && typeof val === "object" && "asIs" in val) {
      return val.asIs != null && val.toBe != null;
    }
    return val !== undefined;
  }).length;
  const progress = totalSlots > 0 ? (answeredSlots / totalSlots) * 100 : 0;

  // Can go next for standard flow (dimension-based)
  const canGoNextStandard = currentDimension?.questions.every((q) => {
    if (!q.required) return true;
    const key = getResponseKey(q.id);
    const val = responses[key];
    if (val && typeof val === "object" && "asIs" in val) {
      return val.asIs != null && val.toBe != null;
    }
    return val !== undefined;
  });

  // Can go next for item-based flow (all questions for current item answered)
  const canGoNextItem = currentItem
    ? allQuestions.every((q) => {
        if (!q.required) return true;
        const key = `${currentItem.id}:${q.id}`;
        const val = responses[key];
        if (val && typeof val === "object" && "asIs" in val) {
          return val.asIs != null && val.toBe != null;
        }
        return val !== undefined;
      })
    : false;

  const handleNext = () => {
    if (isItemBased) {
      if (currentItemIndex < selectedItems.length - 1) {
        setCurrentItemIndex((prev) => prev + 1);
        window.scrollTo(0, 0);
      }
    } else {
      if (currentDimensionIndex < dimensions.length - 1) {
        setCurrentDimensionIndex((prev) => prev + 1);
      }
    }
  };

  const handlePrev = () => {
    if (isItemBased) {
      if (currentItemIndex > 0) {
        setCurrentItemIndex((prev) => prev - 1);
        window.scrollTo(0, 0);
      }
    } else {
      if (currentDimensionIndex > 0) {
        setCurrentDimensionIndex((prev) => prev - 1);
      }
    }
  };

  const isFirstPage = isItemBased ? currentItemIndex === 0 : currentDimensionIndex === 0;
  const isLastPage = isItemBased
    ? currentItemIndex === selectedItems.length - 1
    : currentDimensionIndex === dimensions.length - 1;
  const canGoNext = isItemBased ? canGoNextItem : canGoNextStandard;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading assessment...</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-12 pb-8">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-6 text-emerald-500" />
            <h1 className="text-2xl font-bold mb-2">Thank You!</h1>
            <p className="text-muted-foreground mb-6">
              Your responses have been submitted successfully.
            </p>
            <Button onClick={() => navigate("/assessments")} className="gap-2">
              <Home className="h-4 w-4" />
              Return to Assessments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!instance || dimensions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-12 pb-8">
            <ClipboardList className="h-16 w-16 mx-auto mb-6 text-muted-foreground/50" />
            <h1 className="text-2xl font-bold mb-2">Assessment Not Available</h1>
            <p className="text-muted-foreground mb-6">
              This assessment is not currently available or has no questions configured.
            </p>
            <Button variant="outline" onClick={() => navigate("/assessments")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Assessments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Item Selection Step for item-based assessments ---
  if (isItemBased && !itemSelectionDone) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/assessments")}
                className="gap-2 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Badge variant="outline">In App</Badge>
            </div>
            <h1 className="text-xl font-semibold">{instance.name}</h1>
            {instance.description && (
              <p className="text-sm text-muted-foreground mt-1">{instance.description}</p>
            )}
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-1">Select items to assess</h2>
            <p className="text-sm text-muted-foreground">
              Choose which {assessmentType === "use_case" ? "use cases" : assessmentType === "comparative" ? "options" : "processes"} you'd like to evaluate. You'll answer all evaluation criteria for each selected item.
            </p>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedItemIds.size} of {items.length} selected
            </span>
            <Button variant="ghost" size="sm" onClick={selectAllItems}>
              {selectedItemIds.size === items.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <Card
                key={item.id}
                className={cn(
                  "cursor-pointer transition-colors border-2",
                  selectedItemIds.has(item.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                )}
                onClick={() => toggleItemSelection(item.id)}
              >
                <CardContent className="py-4 flex items-start gap-3">
                  <Checkbox
                    checked={selectedItemIds.has(item.id)}
                    onCheckedChange={() => toggleItemSelection(item.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{item.title}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={() => {
                if (selectedItemIds.size === 0) {
                  toast({ title: "Please select at least one item", variant: "destructive" });
                  return;
                }
                setItemSelectionDone(true);
                setCurrentItemIndex(0);
              }}
              disabled={selectedItemIds.size === 0}
              className="gap-2"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main assessment flow ---
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isItemBased && itemSelectionDone) {
                  setItemSelectionDone(false);
                } else {
                  navigate("/assessments");
                }
              }}
              className="gap-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {isItemBased && itemSelectionDone ? "Back to Selection" : "Back"}
            </Button>
            <Badge variant="outline">In App</Badge>
          </div>
          <h1 className="text-xl font-semibold">{instance.name}</h1>
          {instance.description && (
            <p className="text-sm text-muted-foreground mt-1">{instance.description}</p>
          )}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Item-based: show current item header + ALL dimensions on one page */}
        {isItemBased && currentItem && (
          <>
            <Card className="mb-6 border-primary/30 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <ListChecks className="h-5 w-5 text-primary" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {currentItemIndex + 1} of {selectedItems.length}
                      </Badge>
                      <span className="font-medium">{currentItem.title}</span>
                    </div>
                    {currentItem.description && (
                      <p className="text-sm text-muted-foreground mt-1">{currentItem.description}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* All dimensions and their questions for this item */}
            {dimensions.map((dim) => (
              <div key={dim.id} className="mb-8">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">{dim.name}</h2>
                  {dim.description && (
                    <p className="text-sm text-muted-foreground mt-1">{dim.description}</p>
                  )}
                </div>
                <div className="space-y-6">
                  {dim.questions.map((question, qIndex) => {
                    const responseKey = `${currentItem.id}:${question.id}`;
                    return (
                      <QuestionCard
                        key={responseKey}
                        question={question}
                        qIndex={qIndex}
                        responseKey={responseKey}
                        responseValue={responses[responseKey]}
                        noteValue={notes[responseKey]}
                        onResponse={(val) => handleResponse(question.id, val, currentItem.id)}
                        onDualResponse={(field, val) => handleDualResponse(question.id, field, val, currentItem.id)}
                        onNotesChange={(val) => handleNotesChange(question.id, val, currentItem.id)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Standard flow: paginate by dimension */}
        {!isItemBased && currentDimension && (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">
                  Section {currentDimensionIndex + 1} of {dimensions.length}
                </Badge>
              </div>
              <h2 className="text-lg font-semibold">{currentDimension.name}</h2>
              {currentDimension.description && (
                <p className="text-sm text-muted-foreground mt-1">{currentDimension.description}</p>
              )}
            </div>

            <div className="space-y-6">
              {currentDimension.questions.map((question, qIndex) => {
                const responseKey = getResponseKey(question.id);
                return (
                  <QuestionCard
                    key={`${responseKey}-${qIndex}`}
                    question={question}
                    qIndex={qIndex}
                    responseKey={responseKey}
                    responseValue={responses[responseKey]}
                    noteValue={notes[responseKey]}
                    onResponse={(val) => handleResponse(question.id, val)}
                    onDualResponse={(field, val) => handleDualResponse(question.id, field, val)}
                    onNotesChange={(val) => handleNotesChange(question.id, val)}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={isFirstPage}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {!isLastPage ? (
            <Button
              onClick={handleNext}
              disabled={!canGoNext}
              className="gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !canGoNext}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Submitting..." : "Submit Assessment"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Reusable Question Card */
function QuestionCard({
  question,
  qIndex,
  responseKey,
  responseValue,
  noteValue,
  onResponse,
  onDualResponse,
  onNotesChange,
}: {
  question: Question;
  qIndex: number;
  responseKey: string;
  responseValue: any;
  noteValue: string | undefined;
  onResponse: (val: any) => void;
  onDualResponse: (field: "asIs" | "toBe", val: number) => void;
  onNotesChange: (val: string) => void;
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-start gap-2">
          <span className="text-muted-foreground font-normal">{qIndex + 1}.</span>
          <span>{question.question_text}</span>
          {question.required && <span className="text-destructive">*</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {question.question_type === "likert" && question.scale_config && (
          <LikertDualScore
            question={question}
            value={responseValue}
            onChange={onDualResponse}
          />
        )}

        {question.question_type === "multiple_choice" && question.options && (
          <RadioGroup
            value={responseValue || ""}
            onValueChange={onResponse}
            className="space-y-2"
          >
            {question.options.map((option, oIndex) => (
              <div key={oIndex} className="flex items-center space-x-3">
                <RadioGroupItem value={option} id={`${responseKey}-${oIndex}`} />
                <Label htmlFor={`${responseKey}-${oIndex}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {question.question_type === "text" && (
          <Textarea
            value={responseValue || ""}
            onChange={(e) => onResponse(e.target.value)}
            placeholder="Enter your response..."
            className="min-h-[100px]"
          />
        )}

        {question.question_type === "numeric" && (
          <Input
            type="number"
            value={responseValue || ""}
            onChange={(e) => onResponse(Number(e.target.value))}
            placeholder="Enter a number..."
            className="max-w-[200px]"
          />
        )}

        {/* Optional notes */}
        <Collapsible className="mt-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground p-0 h-auto">
              <MessageSquarePlus className="h-4 w-4" />
              <span className="text-sm">{noteValue ? "Edit additional comments" : "Add additional comments"}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Textarea
              value={noteValue || ""}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Share any additional thoughts, context, or insights about your answer..."
              className="min-h-[80px] text-sm"
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

/** Dual Likert scale: As-Is and To-Be side by side */
function LikertDualScore({
  question,
  value,
  onChange,
}: {
  question: { id: string; scale_config?: ScaleConfig };
  value: any;
  onChange: (field: "asIs" | "toBe", val: number) => void;
}) {
  const config = question.scale_config!;
  const levels = Array.from(
    { length: config.max - config.min + 1 },
    (_, i) => config.min + i
  );

  const asIsValue = value?.asIs ?? null;
  const toBeValue = value?.toBe ?? null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">As-Is (Current State)</Badge>
        </div>
        <RadioGroup
          value={asIsValue?.toString() || ""}
          onValueChange={(val) => onChange("asIs", Number(val))}
          className="space-y-2"
        >
          {levels.map((level) => (
            <div key={`asis-${level}`} className="flex items-start space-x-3">
              <RadioGroupItem value={level.toString()} id={`${question.id}-asis-${level}`} />
              <div className="flex-1">
                <Label htmlFor={`${question.id}-asis-${level}`} className="font-medium cursor-pointer">
                  {level} - {config.labels?.[level] || `Level ${level}`}
                </Label>
                {config.descriptions?.[level] && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {config.descriptions[level]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">To-Be (Target State)</Badge>
        </div>
        <RadioGroup
          value={toBeValue?.toString() || ""}
          onValueChange={(val) => onChange("toBe", Number(val))}
          className="space-y-2"
        >
          {levels.map((level) => (
            <div key={`tobe-${level}`} className="flex items-start space-x-3">
              <RadioGroupItem value={level.toString()} id={`${question.id}-tobe-${level}`} />
              <div className="flex-1">
                <Label htmlFor={`${question.id}-tobe-${level}`} className="font-medium cursor-pointer">
                  {level} - {config.labels?.[level] || `Level ${level}`}
                </Label>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
