import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, Grid3X3, LayoutGrid, Target, GitBranch, Hexagon, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BusinessModelCanvas } from "@/components/canvas/BusinessModelCanvas";
import { SWOTCanvas } from "@/components/canvas/SWOTCanvas";
import { SevenSCanvas } from "@/components/canvas/SevenSCanvas";
import { OperatingModelCanvas } from "@/components/canvas/OperatingModelCanvas";
import { TransformationRoadmap } from "@/components/canvas/TransformationRoadmap";
import { cn } from "@/lib/utils";

const tools = [
  {
    id: "bmc",
    name: "Business Model Canvas",
    category: "Strategy",
    description: "Map your business model across 9 key building blocks",
    icon: Grid3X3,
    color: "bg-primary/10 text-primary",
    component: BusinessModelCanvas,
  },
  {
    id: "omc",
    name: "Operating Model Canvas",
    category: "Operations",
    description: "Design how your organization delivers value",
    icon: LayoutGrid,
    color: "bg-accent/10 text-accent",
    component: OperatingModelCanvas,
  },
  {
    id: "swot",
    name: "SWOT Analysis",
    category: "Strategy",
    description: "Assess strengths, weaknesses, opportunities, and threats",
    icon: Target,
    color: "bg-info/10 text-info",
    component: SWOTCanvas,
  },
  {
    id: "roadmap",
    name: "Transformation Roadmap",
    category: "Planning",
    description: "Gantt-style timeline for change initiatives",
    icon: GitBranch,
    color: "bg-warning/10 text-warning",
    component: TransformationRoadmap,
  },
  {
    id: "7s",
    name: "McKinsey 7S Framework",
    category: "Organization",
    description: "Analyze organizational effectiveness",
    icon: Hexagon,
    color: "bg-success/10 text-success",
    component: SevenSCanvas,
  },
  {
    id: "porter",
    name: "Porter's Five Forces",
    category: "Strategy",
    description: "Industry competitive analysis framework",
    icon: Layers,
    color: "bg-destructive/10 text-destructive",
    component: null, // Coming soon
  },
];

const categories = ["All", "Strategy", "Operations", "Planning", "Organization"];

export default function ToolLibrary() {
  const navigate = useNavigate();
  const { toolId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const selectedTool = toolId ? tools.find((t) => t.id === toolId) : null;

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // If a tool is selected, render its canvas
  if (selectedTool) {
    const CanvasComponent = selectedTool.component;
    
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tools")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", selectedTool.color)}>
              <selectedTool.icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-display font-semibold">{selectedTool.name}</h1>
              <p className="text-sm text-muted-foreground">{selectedTool.description}</p>
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
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">
          Tool Library
        </h1>
        <p className="text-muted-foreground mt-1">
          Interactive strategy frameworks and consulting canvases
        </p>
      </div>

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
        <div className="flex gap-2">
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
        {filteredTools.map((tool, index) => (
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
              <Badge variant="secondary" className="text-xs">
                {tool.category}
              </Badge>
            </div>
            <div className="mt-4 space-y-2">
              <h3 className="font-semibold font-display group-hover:text-primary transition-colors">
                {tool.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {tool.description}
              </p>
            </div>
            <div className="mt-4">
              <Button size="sm" className="w-full">
                Open Canvas
              </Button>
            </div>
          </div>
        ))}
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
