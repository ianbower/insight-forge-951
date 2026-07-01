import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Bot, User, Sparkles, History, Globe, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useChatSessions, ChatMessage } from "@/hooks/useChatSessions";
import { useAuth } from "@/hooks/useAuth";
import { ChatHistorySidebar } from "@/components/chat/ChatHistorySidebar";

const personas = [
  {
    id: "strategist",
    name: "Strategist",
    description: "Strategic planning and market analysis expert",
  },
  {
    id: "service-designer",
    name: "Service Designer",
    description: "Customer experience and service design specialist",
  },
  {
    id: "change-manager",
    name: "Change Manager",
    description: "Organizational transformation specialist",
  },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/expert-ai-chat`;
const SEARCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-search`;

export default function ExpertAI() {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    sessions,
    folders,
    activeSession,
    loading: sessionsLoading,
    createSession,
    addMessage,
    updateMessageContent,
    updateSessionTitle,
    moveSessionToFolder,
    createFolder,
    renameFolder,
    deleteFolder,
    deleteSession,
    selectSession,
    setActiveSession,
  } = useChatSessions({ sessionType: "expert_ai" });

  const [selectedPersona, setSelectedPersona] = useState(personas[0]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [lastCitations, setLastCitations] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get messages from active session or use welcome message
  const messages: ChatMessage[] = activeSession?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handlePersonaChange = async (personaId: string) => {
    const persona = personas.find((p) => p.id === personaId);
    if (persona) {
      setSelectedPersona(persona);
      // Create a new session with the new persona
      await createSession(persona.id, `${persona.name} Chat`);
    }
  };

  const handleNewChat = async () => {
    await createSession(selectedPersona.id, "New Conversation");
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !user) return;

    let currentSession = activeSession;

    // Create a new session if none exists
    if (!currentSession) {
      currentSession = await createSession(selectedPersona.id);
      if (!currentSession) {
        toast({
          title: "Error",
          description: "Failed to create chat session",
          variant: "destructive",
        });
        return;
      }
    }

    const userMessageContent = inputValue;
    setInputValue("");
    setIsLoading(true);

    // Add user message to database
    const userMessage = await addMessage(currentSession.id, "user", userMessageContent);
    if (!userMessage) {
      setIsLoading(false);
      return;
    }

    let assistantContent = "";

    try {
      const allMessages = [...(currentSession.messages || []), userMessage];

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      // If web search is enabled, search first and augment the conversation
      let searchContext = "";
      let citations: string[] = [];
      if (webSearchEnabled) {
        try {
          const searchResp = await fetch(SEARCH_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              query: userMessageContent,
              options: {
                model: "sonar",
                systemPrompt: `You are a research assistant. Provide detailed, factual information with citations to help answer consulting questions. Focus on recent data and trends.`,
              },
            }),
          });
          if (searchResp.ok) {
            const searchData = await searchResp.json();
            searchContext = searchData.content || "";
            citations = searchData.citations || [];
            setLastCitations(citations);
          }
        } catch (searchErr) {
          console.warn("Web search failed, continuing without:", searchErr);
        }
      } else {
        setLastCitations([]);
      }

      // Build messages with search context injected
      const messagesForLLM = allMessages.map((m) => ({ role: m.role, content: m.content }));
      if (searchContext) {
        messagesForLLM[messagesForLLM.length - 1] = {
          role: "user",
          content: `${userMessageContent}\n\n---\n**Web Search Results:**\n${searchContext}\n\n**Sources:** ${citations.map((c, i) => `[${i + 1}] ${c}`).join(", ")}\n---\n\nPlease use the above search results to inform your response. Cite sources where relevant using [1], [2], etc.`,
        };
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: messagesForLLM,
          persona: selectedPersona.id,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Create initial assistant message in database
      const assistantMessage = await addMessage(currentSession.id, "assistant", "");
      if (!assistantMessage) throw new Error("Failed to create assistant message");

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            // Support both streaming delta format and full message format
            const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content;
            if (content && content !== assistantContent) {
              assistantContent = content.length > assistantContent.length ? content : assistantContent + content;
              await updateMessageContent(currentSession.id, assistantMessage.id, assistantContent);
            }
          } catch (parseError) {
            // Only re-buffer if it looks like incomplete JSON
            if (jsonStr.includes("{") && !jsonStr.includes("}")) {
              buffer = line + "\n" + buffer;
              break;
            }
            // Otherwise skip malformed line
            console.warn("Skipping malformed SSE line:", jsonStr);
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response",
        variant: "destructive",
      });
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

  const getWelcomeMessage = (): ChatMessage => ({
    id: "welcome",
    role: "assistant",
    content: `Hello! I'm your AI ${selectedPersona.name} assistant. I can help you with strategic analysis, framework recommendations, and consulting best practices. What would you like to explore today?`,
    timestamp: new Date(),
  });

  const displayMessages = messages.length > 0 ? messages : [getWelcomeMessage()];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 animate-fade-in">
      {/* Chat History Sidebar */}
      <div
        className={cn(
          "w-64 flex-shrink-0 rounded-xl border border-border bg-card transition-all overflow-hidden",
          showHistory ? "block" : "hidden lg:block"
        )}
      >
        {sessionsLoading ? (
          <div className="p-4">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <ChatHistorySidebar
            sessions={sessions}
            folders={folders}
            activeSessionId={activeSession?.id}
            onSelectSession={selectSession}
            onDeleteSession={deleteSession}
            onUpdateTitle={updateSessionTitle}
            onMoveToFolder={moveSessionToFolder}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onNewChat={handleNewChat}
          />
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col rounded-xl border border-border bg-card overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold font-display">Expert AI Assistant</h2>
              <p className="text-sm text-muted-foreground">
                {selectedPersona.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Globe className={cn("h-4 w-4", webSearchEnabled ? "text-primary" : "text-muted-foreground")} />
              <span className="text-xs text-muted-foreground">Web Search</span>
              <Switch
                checked={webSearchEnabled}
                onCheckedChange={setWebSearchEnabled}
              />
            </div>
            <Select
              value={selectedPersona.id}
              onValueChange={handlePersonaChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {personas.map((persona) => (
                  <SelectItem key={persona.id} value={persona.id}>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      {persona.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-6">
            {displayMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 animate-slide-up",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                    message.role === "assistant"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.role === "assistant" ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-4 py-3",
                    message.role === "assistant"
                      ? "bg-muted/50"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {message.role === "assistant" ? (
                    <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-pre:bg-muted prose-pre:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-table:border-collapse prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-2 prose-th:bg-muted prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (messages[messages.length - 1]?.role !== "assistant" || !messages[messages.length - 1]?.content) && (
              <div className="flex gap-3 animate-slide-up">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="max-w-[80%] rounded-xl bg-muted/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm bg-gradient-to-r from-muted-foreground via-foreground to-muted-foreground bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer">
                      Thinking
                    </span>
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: "0.2s" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: "0.4s" }} />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Citations */}
        {lastCitations.length > 0 && (
          <div className="border-t border-border px-4 py-2 bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground mb-1">Sources:</p>
            <div className="flex flex-wrap gap-1">
              {lastCitations.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 rounded px-1.5 py-0.5"
                >
                  [{i + 1}] {new URL(url).hostname}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="flex gap-3">
            <Input
              placeholder={webSearchEnabled ? "Search the web and ask..." : "Ask about strategy, frameworks, or best practices..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Prompts Sidebar */}
      <div className="hidden w-72 flex-shrink-0 rounded-xl border border-border bg-card p-4 xl:block">
        <h3 className="font-semibold font-display mb-4">Quick Prompts</h3>
        <div className="space-y-2">
          {[
            "How should I structure a digital transformation strategy?",
            "What frameworks are best for organizational assessment?",
            "How do I identify quick wins in a change program?",
            "What's the best approach for stakeholder management?",
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => setInputValue(prompt)}
              className="w-full rounded-lg border border-border bg-muted/50 p-3 text-left text-sm transition-all hover:bg-muted hover:shadow-card"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
