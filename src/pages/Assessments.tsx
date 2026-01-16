// Assessments page
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardCheck,
  Plus,
  Search,
  LayoutGrid,
  List,
  Target,
  Users,
  BarChart3,
  FileText,
  Settings2,
  Play,
  Copy,
  Trash2,
  Edit,
  Calendar,
} from "lucide-react";

interface AssessmentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  industry: string | null;
  framework_type: string | null;
  is_public: boolean;
  created_at: string;
  question_count?: number;
  instance_count?: number;
}

const categories = ["Maturity", "Capability", "Risk", "Compliance", "Performance", "Culture"];
const frameworks = ["Custom", "CMMI", "COBIT", "ITIL", "ISO 27001", "NIST"];
const industries = ["Technology", "Financial Services", "Healthcare", "Manufacturing", "Retail", "Government", "All Industries"];

export default function Assessments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    name: "",
    description: "",
    category: "Maturity",
    industry: "All Industries",
    framework_type: "Custom",
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("assessment_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const handleCreateAssessment = async () => {
    if (!newAssessment.name.trim()) {
      toast({ title: "Error", description: "Please enter a name", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase
      .from("assessment_templates")
      .insert({
        name: newAssessment.name,
        description: newAssessment.description || null,
        category: newAssessment.category,
        industry: newAssessment.industry,
        framework_type: newAssessment.framework_type,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Assessment created" });
      setShowNewDialog(false);
      setNewAssessment({
        name: "",
        description: "",
        category: "Maturity",
        industry: "All Industries",
        framework_type: "Custom",
      });
      navigate(`/assessments/${data.id}/builder`);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const { error } = await supabase.from("assessment_templates").delete().eq("id", id);
    if (!error) {
      toast({ title: "Assessment deleted" });
      fetchTemplates();
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.framework_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Maturity":
        return <Target className="h-4 w-4" />;
      case "Capability":
        return <BarChart3 className="h-4 w-4" />;
      case "Risk":
        return <Settings2 className="h-4 w-4" />;
      case "Culture":
        return <Users className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Maturity":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Capability":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "Risk":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "Compliance":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "Performance":
        return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
      case "Culture":
        return "bg-pink-500/10 text-pink-500 border-pink-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Assessments
          </h1>
          <p className="text-muted-foreground mt-1">
            Create, distribute, and analyze maturity assessments
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Assessment
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assessments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="templates" className="w-full">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="active">Active Assessments</TabsTrigger>
          <TabsTrigger value="results">Results & Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading assessments...</div>
          ) : filteredTemplates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No assessments yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first assessment template to get started
                </p>
                <Button onClick={() => setShowNewDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Assessment
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="group hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/assessments/${template.id}/builder`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className={getCategoryColor(template.category)}>
                        {getCategoryIcon(template.category)}
                        <span className="ml-1">{template.category}</span>
                      </Badge>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/assessments/${template.id}/builder`);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {template.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        {template.framework_type && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {template.framework_type}
                          </span>
                        )}
                        {template.industry && template.industry !== "All Industries" && (
                          <span>{template.industry}</span>
                        )}
                      </div>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(template.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/assessments/${template.id}/builder`)}
                >
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className={getCategoryColor(template.category)}>
                        {getCategoryIcon(template.category)}
                        <span className="ml-1">{template.category}</span>
                      </Badge>
                      <div>
                        <h3 className="font-medium">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {template.framework_type && (
                        <Badge variant="secondary">{template.framework_type}</Badge>
                      )}
                      <Button variant="outline" size="sm" className="gap-2">
                        <Play className="h-3 w-3" />
                        Launch
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No active assessments</h3>
              <p className="text-muted-foreground text-center">
                Launch an assessment from a template to start collecting responses
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No results yet</h3>
              <p className="text-muted-foreground text-center">
                Complete assessments will show their results and insights here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Assessment Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Create New Assessment
            </DialogTitle>
            <DialogDescription>
              Define the basic details for your assessment template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Assessment Name *</Label>
              <Input
                id="name"
                value={newAssessment.name}
                onChange={(e) => setNewAssessment({ ...newAssessment, name: e.target.value })}
                placeholder="e.g., Digital Maturity Assessment"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newAssessment.description}
                onChange={(e) => setNewAssessment({ ...newAssessment, description: e.target.value })}
                placeholder="Describe the purpose and scope of this assessment..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newAssessment.category}
                  onValueChange={(value) => setNewAssessment({ ...newAssessment, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="framework">Framework</Label>
                <Select
                  value={newAssessment.framework_type}
                  onValueChange={(value) =>
                    setNewAssessment({ ...newAssessment, framework_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frameworks.map((fw) => (
                      <SelectItem key={fw} value={fw}>
                        {fw}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry Focus</Label>
              <Select
                value={newAssessment.industry}
                onValueChange={(value) => setNewAssessment({ ...newAssessment, industry: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAssessment}>
              <Plus className="h-4 w-4 mr-2" />
              Create & Build
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
