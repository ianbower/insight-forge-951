import { useState } from "react";
import { 
  Search, 
  TrendingUp, 
  Building2, 
  Globe2, 
  BarChart3, 
  FileText,
  Send,
  Loader2,
  Sparkles,
  History,
  Plus,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ResearchPersona {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  systemPrompt: string;
  suggestedQueries: string[];
  color: string;
}

const personas: ResearchPersona[] = [
  {
    id: "industry-analyst",
    name: "Industry Analyst",
    description: "Deep-dive into industry trends, market dynamics, and competitive landscapes",
    icon: TrendingUp,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    systemPrompt: `You are a senior industry analyst at a top-tier consulting firm. Your expertise includes:
- Market sizing and growth projections
- Industry value chain analysis
- Regulatory environment assessment
- Technology disruption trends
- Competitive dynamics and market structure

Provide detailed, data-driven insights. Structure your responses with clear sections, cite relevant frameworks (Porter's Five Forces, PESTEL, etc.), and include actionable recommendations. When discussing trends, consider both short-term and long-term implications.`,
    suggestedQueries: [
      "What are the key trends shaping the healthcare industry in 2024?",
      "Analyze the competitive dynamics in the EV market",
      "What's driving consolidation in the banking sector?"
    ]
  },
  {
    id: "benchmarking-expert",
    name: "Benchmarking Expert",
    description: "Compare performance metrics, best practices, and operational excellence",
    icon: BarChart3,
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    systemPrompt: `You are a benchmarking and operational excellence expert. Your expertise includes:
- Financial performance benchmarking (revenue, margins, ROIC)
- Operational KPIs and efficiency metrics
- Best practice identification across industries
- Gap analysis and improvement prioritization
- World-class performance standards

Always structure comparisons clearly, identify performance gaps, and suggest specific improvement levers. Use percentile rankings where appropriate and reference industry standards.`,
    suggestedQueries: [
      "What are best-in-class SG&A ratios for consumer goods companies?",
      "Compare supply chain efficiency metrics across retailers",
      "What operational KPIs define top-quartile manufacturers?"
    ]
  },
  {
    id: "market-intelligence",
    name: "Market Intelligence",
    description: "Gather competitive intelligence, market signals, and strategic insights",
    icon: Globe2,
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    systemPrompt: `You are a market intelligence specialist focused on competitive analysis. Your expertise includes:
- Competitor strategy and positioning analysis
- M&A activity and strategic moves tracking
- Market share dynamics and shifts
- Pricing and go-to-market strategies
- Customer sentiment and market perception

Provide actionable intelligence with clear implications. Identify patterns, emerging threats, and opportunities. Structure insights around "so what" and "now what" frameworks.`,
    suggestedQueries: [
      "What are the strategic priorities of major cloud providers?",
      "Analyze recent M&A activity in the fintech space",
      "How are traditional banks responding to neobank competition?"
    ]
  },
  {
    id: "company-researcher",
    name: "Company Researcher",
    description: "Deep research on specific companies, their strategies, and performance",
    icon: Building2,
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    systemPrompt: `You are a company research analyst providing comprehensive company profiles. Your expertise includes:
- Business model and revenue stream analysis
- Strategic initiatives and transformation programs
- Financial performance and trajectory
- Leadership and organizational changes
- Risk factors and challenges

Provide balanced, objective analysis. Include both strengths and weaknesses. Reference recent earnings calls, investor presentations, and strategic announcements. Structure analysis around key investment themes.`,
    suggestedQueries: [
      "Provide an overview of Microsoft's cloud strategy",
      "Analyze Tesla's manufacturing efficiency improvements",
      "What are Amazon's key strategic bets for the next 5 years?"
    ]
  },
  {
    id: "synthesis-writer",
    name: "Synthesis Writer",
    description: "Transform research into polished executive summaries and reports",
    icon: FileText,
    color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    systemPrompt: `You are an expert at synthesizing complex research into executive-ready content. Your expertise includes:
- Executive summary writing
- Insight structuring and pyramid principle
- Data visualization recommendations
- Storyline development
- Recommendation framing

Write in a clear, concise consulting style. Use the pyramid principle (lead with the answer). Structure content with clear headers, bullet points, and actionable recommendations. Suggest how insights could be visualized.`,
    suggestedQueries: [
      "Synthesize key insights about the future of remote work",
      "Create an executive summary on AI adoption in financial services",
      "Structure a compelling narrative around digital transformation ROI"
    ]
  }
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  personaId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export default function Research() {
  const { toast } = useToast();
  const [selectedPersona, setSelectedPersona] = useState<ResearchPersona | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const startNewConversation = (persona: ResearchPersona) => {
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      personaId: persona.id,
      title: "New Research",
      messages: [],
      createdAt: new Date()
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversation(newConversation);
    setSelectedPersona(persona);
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || !selectedPersona || !activeConversation) return;
    
    setInput("");
    setIsLoading(true);

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date()
    };

    // Update conversation with user message
    const updatedConversation = {
      ...activeConversation,
      title: activeConversation.messages.length === 0 ? text.slice(0, 50) : activeConversation.title,
      messages: [...activeConversation.messages, userMessage]
    };
    setActiveConversation(updatedConversation);
    setConversations(prev => prev.map(c => c.id === updatedConversation.id ? updatedConversation : c));

    try {
      const response = await supabase.functions.invoke('research-ai', {
        body: {
          messages: updatedConversation.messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          systemPrompt: selectedPersona.systemPrompt,
          personaName: selectedPersona.name
        }
      });

      if (response.error) throw new Error(response.error.message);

      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: response.data.content,
        timestamp: new Date()
      };

      const finalConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, assistantMessage]
      };
      setActiveConversation(finalConversation);
      setConversations(prev => prev.map(c => c.id === finalConversation.id ? finalConversation : c));

    } catch (error) {
      console.error("Research AI error:", error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Persona selection view
  if (!selectedPersona) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Research & Insights</h1>
          </div>
          <p className="text-muted-foreground ml-[52px]">
            AI-powered research assistants to accelerate your consulting work
          </p>
        </div>

        {/* Conversation History */}
        {conversations.length > 0 && (
          <div className="mb-8">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-3"
            >
              <History className="h-4 w-4" />
              Recent Research ({conversations.length})
              <ChevronRight className={cn("h-4 w-4 transition-transform", showHistory && "rotate-90")} />
            </button>
            
            {showHistory && (
              <div className="grid gap-2 mb-6">
                {conversations.slice(0, 5).map(conv => {
                  const persona = personas.find(p => p.id === conv.personaId);
                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setActiveConversation(conv);
                        setSelectedPersona(persona || null);
                      }}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 text-left transition-colors"
                    >
                      {persona && <persona.icon className="h-4 w-4 text-muted-foreground" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{conv.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {persona?.name} · {conv.messages.length} messages
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Persona Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona) => (
            <Card 
              key={persona.id}
              className="cursor-pointer hover:border-primary/50 transition-all group"
              onClick={() => startNewConversation(persona)}
            >
              <CardHeader className="pb-3">
                <div className={cn("w-fit p-2 rounded-lg border mb-2", persona.color)}>
                  <persona.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  {persona.name}
                </CardTitle>
                <CardDescription>{persona.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">Suggested queries:</p>
                <div className="space-y-1">
                  {persona.suggestedQueries.slice(0, 2).map((query, i) => (
                    <p key={i} className="text-xs text-muted-foreground truncate">
                      • {query}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Chat view
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedPersona(null);
                setActiveConversation(null);
              }}
            >
              ← Back
            </Button>
            <div className={cn("p-1.5 rounded-lg border", selectedPersona.color)}>
              <selectedPersona.icon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold">{selectedPersona.name}</h2>
              <p className="text-xs text-muted-foreground">{activeConversation?.title}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => startNewConversation(selectedPersona)}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Research
          </Button>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="max-w-4xl mx-auto py-6 space-y-6">
          {activeConversation?.messages.length === 0 && (
            <div className="text-center py-12">
              <div className={cn("w-16 h-16 rounded-2xl border mx-auto mb-4 flex items-center justify-center", selectedPersona.color)}>
                <selectedPersona.icon className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start your research</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {selectedPersona.description}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {selectedPersona.suggestedQueries.map((query, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => sendMessage(query)}
                  >
                    {query}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {activeConversation?.messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" && "justify-end"
              )}
            >
              {message.role === "assistant" && (
                <div className={cn("p-1.5 rounded-lg border h-fit", selectedPersona.color)}>
                  <selectedPersona.icon className="h-4 w-4" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-xl px-4 py-3 max-w-[80%]",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className={cn("p-1.5 rounded-lg border h-fit", selectedPersona.color)}>
                <selectedPersona.icon className="h-4 w-4" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Researching...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-background px-4 py-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a research question..."
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isLoading}
          />
          <Button 
            onClick={() => sendMessage()} 
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[44px] w-[44px]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
