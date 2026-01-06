import { useState, useRef, useEffect } from "react";
import { 
  Wand2, 
  Send, 
  Sparkles, 
  Layout, 
  MessageSquare,
  Check,
  X,
  ChevronRight,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LAYOUT_TEMPLATES, StepLayout, StepBlock } from "@/components/project/blocks/BlockTypes";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface LayoutWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepTitle: string;
  stepIndex: number;
  runbookName: string;
  industry: string;
  tools: string[];
  currentLayout?: StepLayout;
  onApplyLayout: (stepIndex: number, layout: StepLayout) => void;
}

const WIZARD_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/layout-wizard`;

export default function LayoutWizard({
  open,
  onOpenChange,
  stepTitle,
  stepIndex,
  runbookName,
  industry,
  tools,
  currentLayout,
  onApplyLayout,
}: LayoutWizardProps) {
  const [mode, setMode] = useState<"templates" | "chat">("templates");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingLayout, setPendingLayout] = useState<StepLayout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMode("templates");
      setMessages([]);
      setPendingLayout(null);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startConversation = (template?: StepLayout) => {
    setMode("chat");
    if (template) {
      setPendingLayout(template);
      setMessages([{
        id: "initial",
        role: "assistant",
        content: `Great choice! I've prepared a layout based on that template. You can see the preview on the right.\n\nWould you like me to customize it further? For example, I could:\n- Add more interactive elements like polls or forms\n- Include specific consulting tools\n- Adjust the content structure\n- Add AI assistance for specific tasks\n\nJust tell me what you'd like to change!`
      }]);
    } else {
      setMessages([{
        id: "initial",
        role: "assistant",
        content: `Hi! I'm here to help you design an engaging layout for "${stepTitle}".\n\nTell me about what you want this step to accomplish, and I'll suggest a layout. For example:\n- What's the main objective?\n- What kind of work will happen here?\n- Do you need stakeholder input, data collection, or analysis?`
      }]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(WIZARD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          stepContext: {
            stepTitle,
            runbookName,
            industry,
            tools,
            currentLayout: pendingLayout,
          },
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to get AI response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      setMessages(prev => [...prev, { id: "streaming", role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;

        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => 
                prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                )
              );
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Try to extract layout from the response
      const layoutMatch = assistantContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (layoutMatch) {
        try {
          const parsedLayout = JSON.parse(layoutMatch[1]) as StepLayout;
          if (parsedLayout.blocks) {
            setPendingLayout(parsedLayout);
          }
        } catch (e) {
          console.error("Failed to parse layout JSON:", e);
        }
      }
    } catch (error) {
      console.error("Error in layout wizard:", error);
      setMessages(prev => [
        ...prev.filter(m => m.id !== "streaming"),
        { id: "error", role: "assistant", content: "Sorry, I encountered an error. Please try again." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const applyLayout = () => {
    if (pendingLayout) {
      onApplyLayout(stepIndex, pendingLayout);
      onOpenChange(false);
    }
  };

  const renderBlockPreview = (block: StepBlock) => {
    switch (block.type) {
      case "heading":
        return (
          <div className={cn(
            "font-semibold",
            block.level === 1 && "text-lg",
            block.level === 2 && "text-base",
            block.level === 3 && "text-sm"
          )}>
            {block.content || "Heading"}
          </div>
        );
      case "text":
        return <div className="text-sm text-muted-foreground truncate">{block.content || "Text content..."}</div>;
      case "tool":
        return <Badge variant="secondary">{block.toolName}</Badge>;
      case "checklist":
        return <Badge variant="outline">☑ {block.title || "Checklist"}</Badge>;
      case "form":
        return <Badge variant="outline">📝 {block.title || "Form"}</Badge>;
      case "poll":
        return <Badge variant="outline">📊 Poll</Badge>;
      case "ai-chat":
        return <Badge variant="outline">🤖 AI Assistant</Badge>;
      case "deliverables":
        return <Badge variant="outline">📎 Deliverables</Badge>;
      case "notes":
        return <Badge variant="outline">📝 Notes</Badge>;
      case "divider":
        return <div className="border-t border-border my-1" />;
      case "image":
        return <Badge variant="outline">🖼 Image</Badge>;
      case "video":
        return <Badge variant="outline">🎬 Video</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Layout Wizard for "{stepTitle}"
          </DialogTitle>
          <DialogDescription>
            Choose a template to start, then refine with AI assistance
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {mode === "templates" ? (
            <div className="flex-1 space-y-4 overflow-y-auto">
              <div className="grid gap-3">
                {Object.entries(LAYOUT_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => startConversation({ blocks: template.blocks as StepBlock[] })}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left group"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Layout className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {template.name}
                        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.blocks.slice(0, 4).map((block, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {block.type}
                          </Badge>
                        ))}
                        {template.blocks.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.blocks.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-t border-border pt-4">
                <button
                  onClick={() => startConversation()}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors text-left group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      Start from Scratch with AI
                      <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Describe your needs and I'll design a custom layout
                    </p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Chat panel */}
              <div className="flex-1 flex flex-col min-w-0">
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4 py-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          message.role === "user" && "justify-end"
                        )}
                      >
                        {message.role === "assistant" && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Wand2 className="h-4 w-4" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "rounded-lg px-4 py-2 max-w-[85%]",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Wand2 className="h-4 w-4" />
                        </div>
                        <div className="rounded-lg px-4 py-2 bg-muted">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="flex gap-2 pt-4 border-t border-border">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Describe what you want..."
                    disabled={isLoading}
                  />
                  <Button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Layout preview panel */}
              <div className="w-64 flex flex-col border-l border-border pl-4">
                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Layout Preview
                </div>
                
                {pendingLayout ? (
                  <>
                    <ScrollArea className="flex-1">
                      <div className="space-y-2 pr-2">
                        {pendingLayout.blocks.map((block, index) => (
                          <div
                            key={block.id || index}
                            className="p-2 rounded border border-border bg-card text-xs"
                          >
                            {renderBlockPreview(block)}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <div className="flex gap-2 pt-4 mt-4 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={applyLayout}
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Apply
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground text-center p-4">
                    Describe your layout needs and I'll generate a preview
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
