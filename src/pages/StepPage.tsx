import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Edit2, 
  Save,
  CheckCircle2,
  PlayCircle,
  Circle,
  Eye,
  PanelLeftClose,
  PanelLeft,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { GridBlockLayout } from "@/components/project/blocks/GridBlockLayout";
import { 
  StepBlock, 
  StepLayout, 
  DEFAULT_STEP_LAYOUT,
  HeadingBlock,
  TextBlock,
  DividerBlock,
  ToolBlock,
  ChecklistBlock,
  FormBlock,
  PollBlock,
  AIChatBlock,
  DeliverablesBlock,
  NotesBlock
} from "@/components/project/blocks/BlockTypes";
import { StepAIChat } from "@/components/project/StepAIChat";
import { StepPreviewPanel } from "@/components/project/StepPreviewPanel";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Type,
  FileText,
  Minus,
  Wrench,
  ListChecks,
  FileInput,
  BarChart3,
  Bot,
  StickyNote,
  Image as ImageIcon,
  Video,
} from "lucide-react";

interface Deliverable {
  id: string;
  text: string;
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  status: string;
  order_index: number | null;
  tool_link: string | null;
  description?: string | null;
  notes_json?: any;
  deliverables?: any;
  layout_json?: any;
  project_id: string;
}

interface Project {
  id: string;
  name: string;
  client_id: string | null;
  runbook_id: string | null;
}

interface Client {
  id: string;
  name: string;
}

export default function StepPage() {
  const { projectId, stepId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  const [task, setTask] = useState<Task | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Autosave state
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const autoSaveTimerRef = useRef<number | null>(null);
  const autoSaveSeqRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const savedStateTimerRef = useRef<number | null>(null);
  
  // Content state
  const [layout, setLayout] = useState<StepLayout>(DEFAULT_STEP_LAYOUT);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [newDeliverable, setNewDeliverable] = useState("");
  const [showAIChat, setShowAIChat] = useState(false);
  const [showPreviewPanel, setShowPreviewPanel] = useState(true);
  const [sidebarSize, setSidebarSize] = useState(() => {
    const saved = localStorage.getItem('step-sidebar-size');
    return saved ? parseFloat(saved) : 18;
  });
  
  // Tool data state - stores content from all tools used in this step
  const [toolDataContent, setToolDataContent] = useState<Record<string, { toolName: string; data: any }>>({});

  const currentIndex = allTasks.findIndex(t => t.id === stepId);
  const totalSteps = allTasks.length;

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId || !stepId) return;

      try {
        // Fetch project
        const { data: projectData } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .maybeSingle();

        if (!projectData) {
          toast({ title: "Project not found", variant: "destructive" });
          navigate("/projects");
          return;
        }
        setProject(projectData);

        // Fetch client
        if (projectData.client_id) {
          const { data: clientData } = await supabase
            .from("clients")
            .select("*")
            .eq("id", projectData.client_id)
            .maybeSingle();
          setClient(clientData);
        }

        // Fetch all tasks for navigation
        const { data: tasksData } = await supabase
          .from("project_tasks")
          .select("*")
          .eq("project_id", projectId)
          .order("order_index");

        setAllTasks(tasksData || []);

        // Find current task
        const currentTask = tasksData?.find(t => t.id === stepId);
        if (!currentTask) {
          toast({ title: "Step not found", variant: "destructive" });
          navigate(`/projects/${projectId}`);
          return;
        }

        setTask(currentTask);
        setDescription(currentTask.description || "");
        
        const notesArray = Array.isArray(currentTask.notes_json) ? currentTask.notes_json : [];
        setNotes(notesArray.length > 0 
          ? notesArray.map((n: any) => n.text || n).join("\n") 
          : ""
        );

        const dels = Array.isArray(currentTask.deliverables) ? currentTask.deliverables : [];
        setDeliverables(dels.map((d: any, i: number) => ({
          id: d.id || `del-${i}`,
          text: d.text || d.name || d,
          completed: d.completed || false
        })));

        // Load layout - use task's custom layout or default
        if (currentTask.layout_json && typeof currentTask.layout_json === 'object' && 'blocks' in currentTask.layout_json) {
          setLayout(currentTask.layout_json as unknown as StepLayout);
        } else {
          // Create default layout with step title
          const defaultLayout: StepLayout = {
            blocks: [
              { id: 'heading-1', type: 'heading', order: 0, content: currentTask.title, level: 1 } as HeadingBlock,
              { id: 'text-1', type: 'text', order: 1, content: '' } as TextBlock,
              { id: 'deliverables-1', type: 'deliverables', order: 2 } as DeliverablesBlock,
              { id: 'ai-chat-1', type: 'ai-chat', order: 3 } as AIChatBlock,
              { id: 'notes-1', type: 'notes', order: 4 } as NotesBlock,
            ],
            theme: 'default'
          };
          setLayout(defaultLayout);
        }

        // Mark initial load complete (prevents autosave from firing immediately)
        hasLoadedRef.current = true;

        // Fetch tool data for this step to provide context to AI
        const { data: toolDataRecords } = await supabase
          .from("tool_data")
          .select("tool_id, content_json, consulting_tools(name)")
          .eq("project_id", projectId)
          .eq("step_id", stepId);

        if (toolDataRecords && toolDataRecords.length > 0) {
          const toolContent: Record<string, { toolName: string; data: any }> = {};
          toolDataRecords.forEach((record: any) => {
            if (record.content_json && record.consulting_tools?.name) {
              toolContent[record.tool_id] = {
                toolName: record.consulting_tools.name,
                data: record.content_json
              };
            }
          });
          setToolDataContent(toolContent);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Error loading step", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, stepId, navigate, toast]);

  const handleUpdateBlock = useCallback((updatedBlock: StepBlock) => {
    setLayout(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === updatedBlock.id ? updatedBlock : b)
    }));
  }, []);

  const handleDeleteBlock = useCallback((blockId: string) => {
    setLayout(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== blockId)
    }));
  }, []);

  const handleAddBlock = useCallback((afterBlockId: string, type: StepBlock['type']) => {
    const afterIndex = layout.blocks.findIndex(b => b.id === afterBlockId);
    const newBlock = createNewBlock(type, afterIndex + 1);
    
    setLayout(prev => {
      const blocks = [...prev.blocks];
      blocks.splice(afterIndex + 1, 0, newBlock);
      // Update order indices
      blocks.forEach((b, i) => b.order = i);
      return { ...prev, blocks };
    });
  }, [layout.blocks]);

  const handleBlocksChange = useCallback((newBlocks: StepBlock[]) => {
    setLayout(prev => ({ ...prev, blocks: newBlocks }));
  }, []);

  const handleAddNewBlock = useCallback((type: StepBlock['type']) => {
    const newBlock = createNewBlock(type, layout.blocks.length);
    setLayout(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock]
    }));
  }, [layout.blocks.length]);

  // Refresh tool data from database (called when tools save)
  const refreshToolData = useCallback(async () => {
    if (!projectId || !stepId) return;
    
    const { data: toolDataRecords } = await supabase
      .from("tool_data")
      .select("tool_id, content_json, consulting_tools(name)")
      .eq("project_id", projectId)
      .eq("step_id", stepId);

    if (toolDataRecords && toolDataRecords.length > 0) {
      const toolContent: Record<string, { toolName: string; data: any }> = {};
      toolDataRecords.forEach((record: any) => {
        if (record.content_json && record.consulting_tools?.name) {
          toolContent[record.tool_id] = {
            toolName: record.consulting_tools.name,
            data: record.content_json
          };
        }
      });
      setToolDataContent(toolContent);
    }
  }, [projectId, stepId]);

  // Listen for tool saves and refresh tool context
  useEffect(() => {
    const handler = (e: Event) => {
      // Refresh tool data for the current step
      refreshToolData();
    };
    window.addEventListener('tool-data-saved', handler as EventListener);
    return () => window.removeEventListener('tool-data-saved', handler as EventListener);
  }, [refreshToolData]);

  // Autosave step content (layout, notes, deliverables, description)
  useEffect(() => {
    if (!task?.id) return;
    if (!hasLoadedRef.current) return;

    // Clear previous timers
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    if (savedStateTimerRef.current) window.clearTimeout(savedStateTimerRef.current);

    const seq = ++autoSaveSeqRef.current;

    autoSaveTimerRef.current = window.setTimeout(async () => {
      setAutoSaveState('saving');
      try {
        const notesArray = notes
          .split("\n")
          .filter(Boolean)
          .map((text) => ({ text, timestamp: new Date().toISOString() }));

        const { error } = await supabase
          .from('project_tasks')
          .update({
            description,
            notes_json: notesArray,
            deliverables: JSON.parse(JSON.stringify(deliverables)),
            layout_json: JSON.parse(JSON.stringify(layout)),
          })
          .eq('id', task.id);

        if (seq !== autoSaveSeqRef.current) return; // stale save
        if (error) throw error;

        setAutoSaveState('saved');
        savedStateTimerRef.current = window.setTimeout(() => setAutoSaveState('idle'), 1500);
      } catch (err) {
        if (seq !== autoSaveSeqRef.current) return;
        setAutoSaveState('error');
        toast({ title: 'Autosave failed', variant: 'destructive' });
      }
    }, 800);

    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    };
  }, [task?.id, description, notes, deliverables, layout, toast]);

  const createNewBlock = (type: StepBlock['type'], order: number): StepBlock => {
    const id = `${type}-${Date.now()}`;
    const base = { id, order };

    switch (type) {
      case 'heading':
        return { ...base, type: 'heading', content: '', level: 2 } as HeadingBlock;
      case 'text':
        return { ...base, type: 'text', content: '' } as TextBlock;
      case 'divider':
        return { ...base, type: 'divider' } as DividerBlock;
      case 'tool':
        return { ...base, type: 'tool', toolName: '', embedded: false } as ToolBlock;
      case 'checklist':
        return { ...base, type: 'checklist', title: 'Checklist', items: [] } as ChecklistBlock;
      case 'form':
        return { ...base, type: 'form', title: 'Form', fields: [] } as FormBlock;
      case 'poll':
        return { ...base, type: 'poll', question: 'Poll Question', options: [], allowMultiple: false } as PollBlock;
      case 'ai-chat':
        return { ...base, type: 'ai-chat' } as AIChatBlock;
      case 'deliverables':
        return { ...base, type: 'deliverables' } as DeliverablesBlock;
      case 'notes':
        return { ...base, type: 'notes' } as NotesBlock;
      default:
        return { ...base, type: 'text', content: '' } as TextBlock;
    }
  };

  const handleSave = async () => {
    if (!task) return;
    setIsSaving(true);
    
    try {
      const notesArray = notes.split("\n").filter(Boolean).map(text => ({ 
        text, 
        timestamp: new Date().toISOString() 
      }));

      const { error } = await supabase
        .from("project_tasks")
        .update({
          description,
          notes_json: notesArray,
          deliverables: JSON.parse(JSON.stringify(deliverables)),
          layout_json: JSON.parse(JSON.stringify(layout))
        })
        .eq("id", task.id);

      if (error) throw error;
      toast({ title: "Changes saved" });
    } catch (error) {
      toast({ title: "Error saving changes", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;
    
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ status: newStatus })
        .eq("id", task.id);

      if (error) throw error;
      setTask({ ...task, status: newStatus });

      // Update project progress
      const completedCount = allTasks.filter(t => 
        t.id === task.id ? newStatus === 'completed' : t.status === 'completed'
      ).length;
      const progress = allTasks.length > 0 
        ? Math.round((completedCount / allTasks.length) * 100) 
        : 0;

      await supabase
        .from("projects")
        .update({ progress_percentage: progress })
        .eq("id", projectId);

      toast({ title: "Status updated" });
    } catch (error) {
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  const handleNavigate = (direction: "prev" | "next") => {
    const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < allTasks.length) {
      navigate(`/projects/${projectId}/steps/${allTasks[newIndex].id}`);
    }
  };

  const handleOpenTool = (toolName: string) => {
    navigate(`/tools?tool=${encodeURIComponent(toolName)}&projectId=${projectId}&stepId=${stepId}`);
  };

  const handleAddDeliverable = () => {
    if (!newDeliverable.trim()) return;
    setDeliverables([...deliverables, {
      id: `del-${Date.now()}`,
      text: newDeliverable.trim(),
      completed: false
    }]);
    setNewDeliverable("");
  };

  const handleToggleDeliverable = async (id: string) => {
    const updated = deliverables.map(d => 
      d.id === id ? { ...d, completed: !d.completed } : d
    );
    setDeliverables(updated);
    
    // Auto-save
    if (task) {
      await supabase
        .from("project_tasks")
        .update({ deliverables: JSON.parse(JSON.stringify(updated)) })
        .eq("id", task.id);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "in_progress":
        return <PlayCircle className="h-4 w-4 text-warning" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading step...</div>
      </div>
    );
  }

  if (!task || !project) return null;

  const completedDeliverables = deliverables.filter(d => d.completed).length;

  return (
    <div className="min-h-screen bg-background">
      <ResizablePanelGroup direction="horizontal" className="min-h-screen">
        {/* Step Preview Panel - Resizable */}
        {showPreviewPanel && (
          <>
            <ResizablePanel 
              defaultSize={sidebarSize} 
              minSize={12} 
              maxSize={35}
              className="border-r border-border"
              onResize={(size) => {
                setSidebarSize(size);
                localStorage.setItem('step-sidebar-size', size.toString());
              }}
            >
              <StepPreviewPanel
                tasks={allTasks}
                currentStepId={stepId || ""}
                projectId={projectId || ""}
                onNavigate={(id) => navigate(`/projects/${projectId}/steps/${id}`)}
                onPrev={() => handleNavigate("prev")}
                onNext={() => handleNavigate("next")}
                canGoPrev={currentIndex > 0}
                canGoNext={currentIndex < totalSteps - 1}
              />
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-border hover:bg-primary/20 transition-colors" />
          </>
        )}

        {/* Main Content Area */}
        <ResizablePanel defaultSize={showPreviewPanel ? (100 - sidebarSize) : 100} minSize={50}>
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-auto">
      {/* Fixed Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Toggle + Back + Project Name */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPreviewPanel(!showPreviewPanel)}
                className="hidden md:flex"
              >
                {showPreviewPanel ? (
                  <PanelLeftClose className="h-5 w-5" />
                ) : (
                  <PanelLeft className="h-5 w-5" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(`/projects/${projectId}`)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <p className="text-sm text-muted-foreground">{project.name}</p>
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold">{task.title}</h1>
                  {getStatusIcon(task.status)}
                </div>
              </div>
            </div>

            {/* Center: Step Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleNavigate("prev")}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Badge variant="secondary" className="px-3">
                Step {currentIndex + 1} of {totalSteps}
              </Badge>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleNavigate("next")}
                disabled={currentIndex === totalSteps - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Status Buttons */}
              <div className="hidden md:flex items-center gap-1 mr-2">
                {["pending", "in_progress", "completed"].map((status) => (
                  <Button
                    key={status}
                    variant={task.status === status ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleStatusChange(status)}
                    className={cn(
                      "capitalize text-xs",
                      task.status === status && status === "completed" && "bg-success hover:bg-success/90",
                      task.status === status && status === "in_progress" && "bg-warning hover:bg-warning/90"
                    )}
                  >
                    {status.replace("_", " ")}
                  </Button>
                ))}
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isEditing ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? <Eye className="h-4 w-4 mr-1" /> : <Edit2 className="h-4 w-4 mr-1" />}
                    {isEditing ? "Preview" : "Edit"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isEditing ? "Switch to preview mode" : "Edit page layout"}
                </TooltipContent>
              </Tooltip>

              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                size="sm"
              >
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground">Workflow Progress</span>
              <span className="text-xs font-medium">
                {Math.round(((currentIndex + (task.status === 'completed' ? 1 : 0)) / totalSteps) * 100)}%
              </span>
            </div>
            <div className="flex gap-1">
              {allTasks.map((t, i) => (
                <Tooltip key={t.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate(`/projects/${projectId}/steps/${t.id}`)}
                      className={cn(
                        "h-2 flex-1 rounded-full transition-all",
                        t.status === 'completed' ? "bg-success" :
                        t.status === 'in_progress' ? "bg-warning" :
                        "bg-muted",
                        t.id === stepId && "ring-2 ring-primary ring-offset-2"
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{t.title}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Add Block Button */}
        {isEditing && (
          <div className="mb-6 flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Block
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleAddNewBlock('heading')}>
                  <Type className="h-4 w-4 mr-2" /> Heading
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddNewBlock('text')}>
                  <FileText className="h-4 w-4 mr-2" /> Text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddNewBlock('divider')}>
                  <Minus className="h-4 w-4 mr-2" /> Divider
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddNewBlock('tool')}>
                  <Wrench className="h-4 w-4 mr-2" /> Tool Canvas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAddNewBlock('checklist')}>
                  <ListChecks className="h-4 w-4 mr-2" /> Checklist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddNewBlock('form')}>
                  <FileInput className="h-4 w-4 mr-2" /> Form
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddNewBlock('poll')}>
                  <BarChart3 className="h-4 w-4 mr-2" /> Poll
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddNewBlock('ai-chat')}>
                  <Bot className="h-4 w-4 mr-2" /> AI Assistant
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAddNewBlock('deliverables')}>
                  <ListChecks className="h-4 w-4 mr-2" /> Deliverables
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddNewBlock('notes')}>
                  <StickyNote className="h-4 w-4 mr-2" /> Notes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Grid Block Layout */}
        <GridBlockLayout
          blocks={layout.blocks}
          isEditing={isEditing}
          onBlocksChange={handleBlocksChange}
          onBlockUpdate={handleUpdateBlock}
          onBlockDelete={handleDeleteBlock}
          onAddBlock={handleAddBlock}
          onOpenTool={handleOpenTool}
          projectId={projectId}
          stepId={stepId}
          renderDeliverables={() => (
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Deliverables</span>
                  {deliverables.length > 0 && (
                    <Badge variant="secondary">{completedDeliverables}/{deliverables.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {deliverables.map((d) => (
                  <div key={d.id} className={cn("flex items-center gap-2 p-2 rounded border", d.completed ? "bg-success/5" : "bg-muted/20")}>
                    <Checkbox checked={d.completed} onCheckedChange={() => handleToggleDeliverable(d.id)} />
                    <span className={cn("flex-1 text-sm", d.completed && "line-through text-muted-foreground")}>{d.text}</span>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <Input value={newDeliverable} onChange={(e) => setNewDeliverable(e.target.value)} placeholder="Add..." onKeyPress={(e) => e.key === 'Enter' && handleAddDeliverable()} className="h-8 text-sm" />
                  <Button size="sm" onClick={handleAddDeliverable} disabled={!newDeliverable.trim()}><Plus className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          )}
          renderNotes={() => (
            <Card className="h-full">
              <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Working notes..." className="min-h-[100px]" /></CardContent>
            </Card>
          )}
          renderAIChat={() => (
            <Card className="h-full border-primary/20">
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><span>AI Assistant</span><Badge variant="secondary" className="text-xs">Context-Aware</Badge></CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="h-[300px]">
                  <StepAIChat 
                    stepTitle={task.title} 
                    projectName={project.name} 
                    clientName={client?.name} 
                    tools={task.tool_link?.split(", ").filter(Boolean) || []} 
                    description={description} 
                    notes={notes} 
                    deliverables={deliverables} 
                    allSteps={allTasks.map(t => ({ title: t.title, status: t.status, order_index: t.order_index }))} 
                    currentStepIndex={currentIndex}
                    toolDataContent={toolDataContent}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        />
      </main>
      </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
