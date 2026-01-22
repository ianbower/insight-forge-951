import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, Grid3X3, LayoutGrid, Target, GitBranch, Hexagon, Layers, Plus, Palette, Pencil, Globe, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BusinessModelCanvas } from "@/components/canvas/BusinessModelCanvas";
import { SWOTCanvas } from "@/components/canvas/SWOTCanvas";
import { SevenSCanvas } from "@/components/canvas/SevenSCanvas";
import { OperatingModelCanvas } from "@/components/canvas/OperatingModelCanvas";
import { TransformationRoadmap } from "@/components/canvas/TransformationRoadmap";
import { CustomToolCanvas } from "@/components/canvas/CustomToolCanvas";
import { CustomToolBuilder } from "@/components/tools/CustomToolBuilder";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CustomTool {
  id: string;
  name: string;
  description: string | null;
  category: string;
  canvas_image_url: string | null;
  is_public: boolean;
  visibility: string | null;
  owner_id: string | null;
  created_at: string;
}

const builtInTools = [
  {
    id: "bmc",
    name: "Business Model Canvas",
    category: "Strategy",
    description: "Map your business model across 9 key building blocks",
    icon: Grid3X3,
    color: "bg-primary/10 text-primary",
    component: BusinessModelCanvas,
    isBuiltIn: true,
  },
  {
    id: "omc",
    name: "Operating Model Canvas",
    category: "Operations",
    description: "Design how your organization delivers value",
    icon: LayoutGrid,
    color: "bg-accent/10 text-accent",
    component: OperatingModelCanvas,
    isBuiltIn: true,
  },
  {
    id: "swot",
    name: "SWOT Analysis",
    category: "Strategy",
    description: "Assess strengths, weaknesses, opportunities, and threats",
    icon: Target,
    color: "bg-info/10 text-info",
    component: SWOTCanvas,
    isBuiltIn: true,
  },
  {
    id: "roadmap",
    name: "Transformation Roadmap",
    category: "Planning",
    description: "Gantt-style timeline for change initiatives",
    icon: GitBranch,
    color: "bg-warning/10 text-warning",
    component: TransformationRoadmap,
    isBuiltIn: true,
  },
  {
    id: "7s",
    name: "McKinsey 7S Framework",
    category: "Organization",
    description: "Analyze organizational effectiveness",
    icon: Hexagon,
    color: "bg-success/10 text-success",
    component: SevenSCanvas,
    isBuiltIn: true,
  },
  {
    id: "porter",
    name: "Porter's Five Forces",
    category: "Strategy",
    description: "Industry competitive analysis framework",
    icon: Layers,
    color: "bg-destructive/10 text-destructive",
    component: null,
    isBuiltIn: true,
  },
];

const categories = ["All", "Strategy", "Operations", "Planning", "Organization", "Custom"];

export default function ToolLibrary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toolId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTool, setEditingTool] = useState<CustomTool | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "my" | "team" | "public">("all");

  useEffect(() => {
    fetchCustomTools();
  }, [user]);

  const fetchCustomTools = async () => {
    try {
      const { data, error } = await supabase
        .from("custom_tools")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomTools(data || []);
    } catch (error) {
      console.error("Error fetching custom tools:", error);
    }
  };

  // Filter tools by visibility
  const filterByVisibility = (tools: CustomTool[]) => {
    if (visibilityFilter === "all") return tools;
    if (visibilityFilter === "my") return tools.filter((t) => t.owner_id === user?.id);
    if (visibilityFilter === "team") return tools.filter((t) => t.visibility === "team");
    if (visibilityFilter === "public") return tools.filter((t) => t.visibility === "public" || t.is_public);
    return tools;
  };

  // Check if selected tool is a custom tool
  const selectedCustomTool = toolId?.startsWith("custom-")
    ? customTools.find((t) => `custom-${t.id}` === toolId)
    : null;

  const selectedBuiltInTool = toolId && !toolId.startsWith("custom-")
    ? builtInTools.find((t) => t.id === toolId)
    : null;

  // Combine built-in and custom tools for filtering
  const allTools = [
    ...builtInTools,
    ...filterByVisibility(customTools).map((ct) => ({
      id: `custom-${ct.id}`,
      name: ct.name,
      category: ct.category,
      description: ct.description || "Custom canvas tool",
      icon: Palette,
      color: "bg-primary/10 text-primary",
      component: null,
      isBuiltIn: false,
      customTool: ct,
    })),
  ];

  const filteredTools = allTools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tool.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory =
      selectedCategory === "All" || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleBuilderSave = (tool: CustomTool) => {
    setShowBuilder(false);
    setEditingTool(null);
    fetchCustomTools();
    navigate(`/tools/custom-${tool.id}`);
  };

  const isOwnTool = (tool: CustomTool) => tool.owner_id === user?.id;

  // Show builder
  if (showBuilder || editingTool) {
    return (
      <CustomToolBuilder
        onClose={() => {
          setShowBuilder(false);
          setEditingTool(null);
        }}
        onSave={handleBuilderSave}
        existingTool={editingTool || undefined}
      />
    );
  }

  // If a custom tool is selected, render its canvas
  if (selectedCustomTool) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/tools")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-display font-semibold">{selectedCustomTool.name}</h1>
                  {selectedCustomTool.visibility === "public" || selectedCustomTool.is_public ? (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  ) : selectedCustomTool.visibility === "team" ? (
                    <User className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedCustomTool.description || "Custom canvas tool"}
                </p>
              </div>
            </div>
          </div>
          {isOwnTool(selectedCustomTool) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingTool(selectedCustomTool)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Tool
            </Button>
          )}
        </div>

        <CustomToolCanvas
          toolId={selectedCustomTool.id}
          toolName={selectedCustomTool.name}
          canvasImageUrl={selectedCustomTool.canvas_image_url || undefined}
        />
      </div>
    );
  }

  // If a built-in tool is selected, render its canvas
  if (selectedBuiltInTool) {
    const CanvasComponent = selectedBuiltInTool.component;

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tools")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", selectedBuiltInTool.color)}>
              <selectedBuiltInTool.icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-display font-semibold">{selectedBuiltInTool.name}</h1>
              <p className="text-sm text-muted-foreground">{selectedBuiltInTool.description}</p>
            </div>
          </div>
        </div>

        {CanvasComponent ? (
          <CanvasComponent />
        ) : (
          <div className="flex items-center justify-center h-96 rounded-xl border border-dashed border-border bg-muted/30">
            <p className="text-muted-foreground">Coming soon</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Tool Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Interactive strategy frameworks and consulting canvases
          </p>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Tool
        </Button>
      </div>

      {/* Visibility Tabs */}
      <Tabs value={visibilityFilter} onValueChange={(v) => setVisibilityFilter(v as typeof visibilityFilter)}>
        <TabsList>
          <TabsTrigger value="all">All Tools</TabsTrigger>
          <TabsTrigger value="my">My Tools</TabsTrigger>
          <TabsTrigger value="team">Team Tools</TabsTrigger>
          <TabsTrigger value="public">Public Tools</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={cn(selectedCategory === category && "shadow-card")}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTools.map((tool, index) => {
          const isCustom = !tool.isBuiltIn;
          const customTool = isCustom ? (tool as any).customTool as CustomTool : null;
          const canEdit = customTool && isOwnTool(customTool);

          return (
            <div
              key={tool.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-card-lg hover:border-primary/20 cursor-pointer animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => navigate(`/tools/${tool.id}`)}
            >
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110",
                    tool.color
                  )}
                >
                  <tool.icon className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-2">
                  {customTool && (
                    customTool.visibility === "public" || customTool.is_public ? (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    ) : customTool.visibility === "team" ? (
                      <User className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {tool.category}
                  </Badge>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <h3 className="font-semibold font-display group-hover:text-primary transition-colors">
                  {tool.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {tool.description}
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" className="flex-1">
                  Open Canvas
                </Button>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTool(customTool);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">
            No tools found matching your criteria
          </p>
        </div>
      )}
    </div>
  );
}
