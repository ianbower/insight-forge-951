import { useState, useEffect } from "react";
import { 
  GripVertical, 
  Trash2, 
  Plus,
  Type,
  Image as ImageIcon,
  Video,
  Minus,
  Wrench,
  ListChecks,
  FileInput,
  BarChart3,
  Bot,
  FileText,
  StickyNote,
  Check,
  X,
  ChevronDown,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { 
  StepBlock, 
  HeadingBlock, 
  TextBlock, 
  ChecklistBlock,
  ChecklistItem,
  PollBlock,
  ToolBlock,
  FormBlock,
  AssessmentsBlock
} from "./BlockTypes";
import { EmbeddedTool } from "@/components/project/EmbeddedTool";
import { EmbeddedAssessment } from "@/components/project/EmbeddedAssessment";

interface BlockRendererProps {
  block: StepBlock;
  isEditing: boolean;
  onUpdate: (block: StepBlock) => void;
  onDelete: (blockId: string) => void;
  onAddBlock: (afterBlockId: string, type: StepBlock['type']) => void;
  onOpenTool?: (toolName: string) => void;
  projectId?: string;
  stepId?: string;
  // Drag and drop props
  isDragging?: boolean;
  dragHandleProps?: {
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
  };
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function BlockRenderer({ 
  block, 
  isEditing, 
  onUpdate, 
  onDelete,
  onAddBlock,
  onOpenTool,
  projectId,
  stepId,
  isDragging,
  dragHandleProps,
  onDragOver,
  onDrop
}: BlockRendererProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Keep hover state active while dropdown is open
  const showControls = isHovered || isDropdownOpen;

  const renderBlock = () => {
    switch (block.type) {
      case 'heading':
        return <HeadingBlockRenderer block={block} isEditing={isEditing} onUpdate={onUpdate} />;
      case 'text':
        return <TextBlockRenderer block={block} isEditing={isEditing} onUpdate={onUpdate} />;
      case 'divider':
        return <div className="border-t border-border my-6" />;
      case 'tool':
        return (
          <ToolBlockRenderer 
            block={block} 
            isEditing={isEditing} 
            onUpdate={onUpdate}
            onOpenTool={onOpenTool}
            projectId={projectId}
            stepId={stepId}
          />
        );
      case 'checklist':
        return <ChecklistBlockRenderer block={block} isEditing={isEditing} onUpdate={onUpdate} />;
      case 'poll':
        return <PollBlockRenderer block={block} isEditing={isEditing} onUpdate={onUpdate} />;
      case 'ai-chat':
        return <AIChatBlockRenderer />;
      case 'deliverables':
        return <DeliverablesBlockRenderer projectId={projectId} stepId={stepId} isEditing={isEditing} />;
      case 'notes':
        return <NotesBlockPlaceholder />;
      case 'form':
        return <FormBlockRenderer block={block} isEditing={isEditing} onUpdate={onUpdate} />;
      case 'image':
        return <ImageBlockPlaceholder />;
      case 'video':
        return <VideoBlockPlaceholder />;
      case 'assessments':
        return <AssessmentsBlockRenderer projectId={projectId} stepId={stepId} />;
      default:
        return <div className="text-muted-foreground">Unknown block type</div>;
    }
  };

  const blockTypes = [
    { type: 'heading', label: 'Heading', icon: Type },
    { type: 'text', label: 'Text', icon: FileText },
    { type: 'divider', label: 'Divider', icon: Minus },
    { type: 'tool', label: 'Tool Canvas', icon: Wrench },
    { type: 'checklist', label: 'Checklist', icon: ListChecks },
    { type: 'form', label: 'Form', icon: FileInput },
    { type: 'poll', label: 'Poll', icon: BarChart3 },
    { type: 'ai-chat', label: 'AI Assistant', icon: Bot },
    { type: 'notes', label: 'Notes', icon: StickyNote },
    { type: 'assessments', label: 'Assessments', icon: ClipboardList },
    { type: 'image', label: 'Image', icon: ImageIcon },
    { type: 'video', label: 'Video', icon: Video },
  ] as const;

  return (
    <div 
      className={cn(
        "group relative",
        isDragging && "opacity-50 scale-[0.98]",
        isEditing && "transition-all duration-200"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {isEditing && showControls && (
        <div className="absolute -left-10 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div 
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
            draggable
            onDragStart={dragHandleProps?.onDragStart}
            onDragEnd={dragHandleProps?.onDragEnd}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(block.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      <div className={cn(
        "transition-all",
        isEditing && showControls && "ring-2 ring-primary/20 rounded-lg"
      )}>
        {renderBlock()}
      </div>

      {isEditing && showControls && (
        <div className="flex justify-center my-2">
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 gap-1 text-xs">
                <Plus className="h-3 w-3" />
                Add block
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48 z-50">
              <DropdownMenuItem className="text-xs font-medium text-muted-foreground" disabled>
                Content
              </DropdownMenuItem>
              {blockTypes.slice(0, 4).map(({ type, label, icon: Icon }) => (
                <DropdownMenuItem key={type} onClick={() => onAddBlock(block.id, type)}>
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs font-medium text-muted-foreground" disabled>
                Interactive
              </DropdownMenuItem>
              {blockTypes.slice(4, 8).map(({ type, label, icon: Icon }) => (
                <DropdownMenuItem key={type} onClick={() => onAddBlock(block.id, type)}>
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs font-medium text-muted-foreground" disabled>
                Media
              </DropdownMenuItem>
              {blockTypes.slice(8).map(({ type, label, icon: Icon }) => (
                <DropdownMenuItem key={type} onClick={() => onAddBlock(block.id, type)}>
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

function HeadingBlockRenderer({ 
  block, 
  isEditing, 
  onUpdate 
}: { 
  block: HeadingBlock; 
  isEditing: boolean; 
  onUpdate: (block: StepBlock) => void;
}) {
  const HeadingTag = `h${block.level}` as keyof JSX.IntrinsicElements;
  const sizes = {
    1: 'text-3xl font-bold',
    2: 'text-2xl font-semibold',
    3: 'text-xl font-medium'
  };

  if (isEditing) {
    return (
      <Input
        value={block.content}
        onChange={(e) => onUpdate({ ...block, content: e.target.value })}
        placeholder={`Heading ${block.level}`}
        className={cn("border-0 bg-transparent focus-visible:ring-0 p-0", sizes[block.level])}
      />
    );
  }

  return (
    <HeadingTag className={cn(sizes[block.level], "text-foreground")}>
      {block.content || <span className="text-muted-foreground italic">Untitled</span>}
    </HeadingTag>
  );
}

function TextBlockRenderer({ 
  block, 
  isEditing, 
  onUpdate 
}: { 
  block: TextBlock; 
  isEditing: boolean; 
  onUpdate: (block: StepBlock) => void;
}) {
  if (isEditing) {
    return (
      <Textarea
        value={block.content}
        onChange={(e) => onUpdate({ ...block, content: e.target.value })}
        placeholder="Write something..."
        className="min-h-[100px] border-dashed"
      />
    );
  }

  return (
    <p className="text-foreground whitespace-pre-wrap">
      {block.content || <span className="text-muted-foreground italic">No content</span>}
    </p>
  );
}

function ToolBlockRenderer({ 
  block, 
  isEditing,
  onUpdate,
  onOpenTool,
  projectId,
  stepId
}: { 
  block: ToolBlock; 
  isEditing: boolean;
  onUpdate: (block: StepBlock) => void;
  onOpenTool?: (toolName: string) => void;
  projectId?: string;
  stepId?: string;
}) {
  const [tools, setTools] = useState<{ id: string; name: string; category: string }[]>([]);
  
  useEffect(() => {
    const fetchTools = async () => {
      const { data, error } = await supabase
        .from("consulting_tools")
        .select("id, name, category")
        .order("category")
        .order("name");
      if (error) {
        console.error("Error fetching tools:", error);
        return;
      }
      if (data) setTools(data);
    };
    fetchTools();
  }, []);

  // Supported tools for embedding
  const SUPPORTED_TOOLS = ["SWOT Analysis", "Business Model Canvas", "7S Framework", "Operating Model Canvas", "Transformation Roadmap"];
  const isSupported = SUPPORTED_TOOLS.includes(block.toolName);

  // If editing, show tool selector
  if (isEditing) {
    return (
      <Card className="border-dashed border-primary/50">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Select Tool</Label>
              <Select 
                value={block.toolName || undefined}
                onValueChange={(value) => onUpdate({ ...block, toolName: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a tool..." />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {tools.map((tool) => (
                    <SelectItem key={tool.id} value={tool.name}>
                      <span className="flex items-center gap-2">
                        {tool.name}
                        <Badge variant="outline" className="text-[10px] ml-2">{tool.category}</Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch 
                id="embedded" 
                checked={block.embedded}
                onCheckedChange={(checked) => onUpdate({ ...block, embedded: checked })}
              />
              <Label htmlFor="embedded" className="text-sm">Embed inline</Label>
            </div>
            {!isSupported && block.toolName && (
              <Badge variant="secondary" className="text-xs">Opens in new page</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // If not editing and embedded, show the actual tool
  if (block.embedded && isSupported && projectId && stepId) {
    return (
      <EmbeddedTool
        toolName={block.toolName}
        projectId={projectId}
        stepId={stepId}
        embedded={true}
        onOpenExternal={() => onOpenTool?.(block.toolName)}
      />
    );
  }

  // Otherwise show a tool selector with dropdown
  return (
    <Card className="border-dashed hover:border-primary/50 transition-colors">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <Select 
            value={block.toolName || undefined}
            onValueChange={(value) => {
              onUpdate({ ...block, toolName: value });
              // Auto-open the tool when selected
              if (value) {
                onOpenTool?.(value);
              }
            }}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a tool..." />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {tools.map((tool) => (
                <SelectItem key={tool.id} value={tool.name}>
                  <span className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    {tool.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {block.toolName && (
            <span className="text-sm text-muted-foreground">
              {isSupported ? "Tool ready" : "Opens in new page"}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChecklistBlockRenderer({ 
  block, 
  isEditing, 
  onUpdate 
}: { 
  block: ChecklistBlock; 
  isEditing: boolean; 
  onUpdate: (block: StepBlock) => void;
}) {
  const [newItem, setNewItem] = useState("");

  const addItem = () => {
    if (!newItem.trim()) return;
    const item: ChecklistItem = {
      id: `item-${Date.now()}`,
      text: newItem.trim(),
      checked: false
    };
    onUpdate({ ...block, items: [...block.items, item] });
    setNewItem("");
  };

  const toggleItem = (itemId: string) => {
    const items = block.items.map(i => 
      i.id === itemId ? { ...i, checked: !i.checked } : i
    );
    onUpdate({ ...block, items });
  };

  const removeItem = (itemId: string) => {
    onUpdate({ ...block, items: block.items.filter(i => i.id !== itemId) });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        {isEditing ? (
          <Input
            value={block.title}
            onChange={(e) => onUpdate({ ...block, title: e.target.value })}
            placeholder="Checklist title"
            className="font-semibold"
          />
        ) : (
          <CardTitle className="text-base">{block.title || 'Checklist'}</CardTitle>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {block.items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 group">
            <Checkbox 
              checked={item.checked} 
              onCheckedChange={() => toggleItem(item.id)}
            />
            <span className={cn(
              "flex-1 text-sm",
              item.checked && "line-through text-muted-foreground"
            )}>
              {item.text}
            </span>
            {isEditing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => removeItem(item.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add item..."
            onKeyPress={(e) => e.key === 'Enter' && addItem()}
            className="h-8"
          />
          <Button size="sm" onClick={addItem} disabled={!newItem.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PollBlockRenderer({ 
  block, 
  isEditing, 
  onUpdate 
}: { 
  block: PollBlock; 
  isEditing: boolean; 
  onUpdate: (block: StepBlock) => void;
}) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const totalVotes = block.options.reduce((sum, o) => sum + o.votes, 0);

  const addOption = () => {
    if (!newOption.trim()) return;
    const option = {
      id: `opt-${Date.now()}`,
      text: newOption.trim(),
      votes: 0
    };
    onUpdate({ ...block, options: [...block.options, option] });
    setNewOption("");
  };

  const vote = (optionId: string) => {
    if (selectedOptions.includes(optionId)) return;
    const options = block.options.map(o =>
      o.id === optionId ? { ...o, votes: o.votes + 1 } : o
    );
    onUpdate({ ...block, options });
    setSelectedOptions([...selectedOptions, optionId]);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        {isEditing ? (
          <Input
            value={block.question}
            onChange={(e) => onUpdate({ ...block, question: e.target.value })}
            placeholder="Poll question"
            className="font-semibold"
          />
        ) : (
          <CardTitle className="text-base">{block.question || 'Poll'}</CardTitle>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {block.options.map((option) => {
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
          const isSelected = selectedOptions.includes(option.id);
          
          return (
            <div 
              key={option.id} 
              className={cn(
                "relative p-3 rounded-lg border cursor-pointer transition-all",
                isSelected ? "border-primary bg-primary/5" : "hover:border-primary/50"
              )}
              onClick={() => vote(option.id)}
            >
              <div 
                className="absolute inset-0 bg-primary/10 rounded-lg transition-all"
                style={{ width: `${percentage}%` }}
              />
              <div className="relative flex items-center justify-between">
                <span className="text-sm font-medium">{option.text}</span>
                <span className="text-sm text-muted-foreground">
                  {option.votes} votes ({Math.round(percentage)}%)
                </span>
              </div>
            </div>
          );
        })}
        {isEditing && (
          <div className="flex gap-2 pt-2">
            <Input
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="Add option..."
              onKeyPress={(e) => e.key === 'Enter' && addOption()}
              className="h-8"
            />
            <Button size="sm" onClick={addOption} disabled={!newOption.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FormBlockRenderer({ 
  block, 
  isEditing, 
  onUpdate 
}: { 
  block: FormBlock; 
  isEditing: boolean; 
  onUpdate: (block: StepBlock) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        {isEditing ? (
          <Input
            value={block.title}
            onChange={(e) => onUpdate({ ...block, title: e.target.value })}
            placeholder="Form title"
            className="font-semibold"
          />
        ) : (
          <CardTitle className="text-base">{block.title || 'Form'}</CardTitle>
        )}
      </CardHeader>
      <CardContent>
        {block.fields.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            {isEditing ? 'Add form fields in the layout editor' : 'No fields configured'}
          </p>
        ) : (
          <div className="space-y-4">
            {block.fields.map((field) => (
              <div key={field.id}>
                <label className="text-sm font-medium">{field.label}</label>
                {field.type === 'textarea' ? (
                  <Textarea className="mt-1" placeholder={`Enter ${field.label.toLowerCase()}`} />
                ) : (
                  <Input className="mt-1" placeholder={`Enter ${field.label.toLowerCase()}`} />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AIChatBlockRenderer() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">AI Assistant</p>
            <p className="text-sm text-muted-foreground">
              Context-aware AI chat embedded in this step
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DeliverablesBlockRenderer({ 
  projectId, 
  stepId,
  isEditing
}: { 
  projectId?: string; 
  stepId?: string;
  isEditing: boolean;
}) {
  const [projectDeliverables, setProjectDeliverables] = useState<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    due_date: string | null;
    step_id: string | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  useEffect(() => {
    const fetchDeliverables = async () => {
      if (!projectId) return;
      
      const { data, error } = await supabase
        .from("project_deliverables")
        .select("id, title, description, status, due_date, step_id")
        .eq("project_id", projectId)
        .order("order_index");
      
      if (error) {
        console.error("Error fetching deliverables:", error);
        return;
      }
      
      setProjectDeliverables(data || []);
      setLoading(false);
    };

    fetchDeliverables();
  }, [projectId]);

  const linkedDeliverables = projectDeliverables.filter(d => d.step_id === stepId);
  const unlinkedDeliverables = projectDeliverables.filter(d => !d.step_id);
  const completedCount = linkedDeliverables.filter(d => d.status === "completed").length;

  const handleLink = async (deliverableId: string) => {
    const { error } = await supabase
      .from("project_deliverables")
      .update({ step_id: stepId })
      .eq("id", deliverableId);

    if (!error) {
      setProjectDeliverables(prev => 
        prev.map(d => d.id === deliverableId ? { ...d, step_id: stepId! } : d)
      );
    }
  };

  const handleUnlink = async (deliverableId: string) => {
    const { error } = await supabase
      .from("project_deliverables")
      .update({ step_id: null })
      .eq("id", deliverableId);

    if (!error) {
      setProjectDeliverables(prev => 
        prev.map(d => d.id === deliverableId ? { ...d, step_id: null } : d)
      );
    }
  };

  const handleToggleStatus = async (deliverable: typeof projectDeliverables[0]) => {
    const newStatus = deliverable.status === "completed" ? "pending" : "completed";
    const { error } = await supabase
      .from("project_deliverables")
      .update({ status: newStatus })
      .eq("id", deliverable.id);

    if (!error) {
      setProjectDeliverables(prev =>
        prev.map(d => d.id === deliverable.id ? { ...d, status: newStatus } : d)
      );
    }
  };

  if (!projectId || !stepId) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 flex flex-col items-center justify-center py-8">
          <ListChecks className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Deliverables require project context</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading deliverables...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            Deliverables
            {linkedDeliverables.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {completedCount}/{linkedDeliverables.length}
              </Badge>
            )}
          </CardTitle>
          <DropdownMenu open={showLinkDialog} onOpenChange={setShowLinkDialog}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs">
                <Plus className="h-3 w-3" />
                Link Deliverable
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 z-[100]">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Unlinked Project Deliverables
              </div>
              <DropdownMenuSeparator />
              {unlinkedDeliverables.length > 0 ? (
                unlinkedDeliverables.map(d => (
                  <DropdownMenuItem 
                    key={d.id} 
                    onClick={() => handleLink(d.id)}
                    className="flex items-center gap-2"
                  >
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{d.title}</p>
                      {d.due_date && (
                        <p className="text-xs text-muted-foreground">
                          Due: {new Date(d.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  {projectDeliverables.length === 0 
                    ? "No project deliverables yet" 
                    : "All deliverables are linked"}
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  const projectUrl = `/projects/${projectId}?tab=deliverables`;
                  window.open(projectUrl, '_blank');
                }}
                className="text-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Manage Project Deliverables
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {linkedDeliverables.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No deliverables linked to this step</p>
            <p className="text-xs mt-1">
              {unlinkedDeliverables.length > 0 
                ? 'Click "Link Deliverable" to add project deliverables'
                : 'Create deliverables in Project Details first'}
            </p>
          </div>
        ) : (
          linkedDeliverables.map(d => (
            <div 
              key={d.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all group cursor-pointer",
                d.status === "completed" 
                  ? "bg-success/5 border-success/20" 
                  : "hover:border-primary/30"
              )}
              onClick={() => {
                const projectUrl = `/projects/${projectId}?tab=deliverables`;
                window.open(projectUrl, '_blank');
              }}
            >
              <Checkbox
                checked={d.status === "completed"}
                onCheckedChange={() => handleToggleStatus(d)}
                onClick={(e) => e.stopPropagation()}
                className={d.status === "completed" ? "border-success data-[state=checked]:bg-success" : ""}
              />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium truncate",
                  d.status === "completed" && "line-through text-muted-foreground"
                )}>
                  {d.title}
                </p>
                {d.due_date && (
                  <p className="text-xs text-muted-foreground">
                    Due: {new Date(d.due_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              {isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnlink(d.id);
                  }}
                  title="Unlink from step"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function NotesBlockPlaceholder() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
            <StickyNote className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="font-medium">Notes</p>
            <p className="text-sm text-muted-foreground">
              Working notes for this step
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ImageBlockPlaceholder() {
  return (
    <Card className="border-dashed">
      <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
        <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Image placeholder</p>
      </CardContent>
    </Card>
  );
}

function VideoBlockPlaceholder() {
  return (
    <Card className="border-dashed">
      <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
        <Video className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Video placeholder</p>
      </CardContent>
    </Card>
  );
}

function AssessmentsBlockRenderer({ 
  projectId, 
  stepId 
}: { 
  projectId?: string; 
  stepId?: string;
}) {
  if (!projectId || !stepId) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 flex flex-col items-center justify-center py-8">
          <ClipboardList className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Assessments require a project context</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <EmbeddedAssessment 
          projectId={projectId} 
          stepId={stepId}
          compact
          displayMode="results"
        />
      </CardContent>
    </Card>
  );
}
