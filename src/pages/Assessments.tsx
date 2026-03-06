import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  ClipboardList,
  Plus,
  Search,
  FileText,
  BarChart3,
  Users,
  Calendar,
  ChevronRight,
  Layers,
  Target,
  Send,
  Eye,
  Settings2,
  Database,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AssessmentBuilder } from "@/components/assessments/AssessmentBuilder";
import { AssessmentLaunch } from "@/components/assessments/AssessmentLaunch";
import { AssessmentResults } from "@/components/assessments/AssessmentResults";
import { BenchmarkManager } from "@/components/assessments/BenchmarkManager";
import { MyAssessments } from "@/components/assessments/MyAssessments";
import { ActiveAssessments } from "@/components/assessments/ActiveAssessments";

interface AssessmentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  framework_type: string | null;
  industry: string | null;
  is_public: boolean;
  created_at: string;
  assessment_type?: string;
}

interface AssessmentInstance {
  id: string;
  name: string;
  description: string | null;
  status: string;
  assessment_template_id: string;
  project_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  assessment_template?: AssessmentTemplate;
  _count?: {
    recipients: number;
    responses: number;
  };
}

const categoryColors: Record<string, string> = {
  maturity: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  readiness: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  capability: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  culture: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  general: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const assessmentTypeLabels: Record<string, string> = {
  standard: "Standard",
  use_case: "Use Case",
  comparative: "Comparative",
  process: "Process",
  checklist: "Checklist",
};

const statusColors: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-500",
  active: "bg-emerald-500/10 text-emerald-500",
  closed: "bg-blue-500/10 text-blue-500",
  archived: "bg-muted text-muted-foreground",
};

export default function Assessments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [instances, setInstances] = useState<AssessmentInstance[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [launchDialogOpen, setLaunchDialogOpen] = useState(false);
  const [builderDialogOpen, setBuilderDialogOpen] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [benchmarkDialogOpen, setBenchmarkDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AssessmentTemplate | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<AssessmentInstance | null>(null);

  // Form state for new template
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "maturity",
    framework_type: "",
    industry: "",
    assessment_type: "standard",
  });

  // Form state for launching assessment
  const [launchForm, setLaunchForm] = useState({
    name: "",
    description: "",
    project_id: "",
  });

  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch templates
    const { data: templatesData } = await supabase
      .from("assessment_templates")
      .select("*")
      .order("created_at", { ascending: false });

    setTemplates(templatesData || []);

    // Fetch instances with template info
    const { data: instancesData } = await supabase
      .from("assessment_instances")
      .select(`
        *,
        assessment_template:assessment_templates(*)
      `)
      .order("created_at", { ascending: false });

    setInstances((instancesData || []) as AssessmentInstance[]);

    // Fetch projects for dropdown
    const { data: projectsData } = await supabase
      .from("projects")
      .select("id, name")
      .order("name");

    setProjects(projectsData || []);

    setLoading(false);
  };

  const handleCreateTemplate = async () => {
    const { error } = await supabase.from("assessment_templates").insert({
      name: newTemplate.name,
      description: newTemplate.description || null,
      category: newTemplate.category,
      framework_type: newTemplate.framework_type || null,
      industry: newTemplate.industry || null,
      is_public: true,
      assessment_type: newTemplate.assessment_type,
    } as any);

    if (error) {
      toast({ title: "Error creating template", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template created successfully" });
      setCreateDialogOpen(false);
      setNewTemplate({ name: "", description: "", category: "maturity", framework_type: "", industry: "", assessment_type: "standard" });
      fetchData();
    }
  };

  const handleLaunchAssessment = async () => {
    if (!selectedTemplate) return;

    const { error } = await supabase.from("assessment_instances").insert({
      name: launchForm.name || `${selectedTemplate.name} - ${new Date().toLocaleDateString()}`,
      description: launchForm.description || null,
      assessment_template_id: selectedTemplate.id,
      project_id: launchForm.project_id || null,
      status: "draft",
    });

    if (error) {
      toast({ title: "Error launching assessment", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Assessment created", description: "You can now add questions and invite recipients" });
      setLaunchDialogOpen(false);
      setLaunchForm({ name: "", description: "", project_id: "" });
      setSelectedTemplate(null);
      fetchData();
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...new Set(templates.map((t) => t.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading assessments...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assessments</h1>
          <p className="text-muted-foreground">
            Create and manage maturity assessments, readiness checks, and capability evaluations
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my-assessments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-assessments" className="gap-2">
            <User className="h-4 w-4" />
            My Assessments
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Layers className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <Target className="h-4 w-4" />
            Active Assessments
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Results
          </TabsTrigger>
          <TabsTrigger value="benchmarks" className="gap-2">
            <Database className="h-4 w-4" />
            Benchmarks
          </TabsTrigger>
        </TabsList>

        {/* My Assessments Tab */}
        <TabsContent value="my-assessments" className="space-y-4">
          <MyAssessments />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="capitalize"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="border-border hover:border-primary/50 transition-colors group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge
                      variant="outline"
                      className={cn("capitalize", categoryColors[template.category] || categoryColors.general)}
                    >
                      {template.category}
                    </Badge>
                    {(template as any).assessment_type && (template as any).assessment_type !== "standard" && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {assessmentTypeLabels[(template as any).assessment_type] || (template as any).assessment_type}
                      </Badge>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/assessments/preview/${template.id}`, '_blank');
                        }}
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(template);
                          setBuilderDialogOpen(true);
                        }}
                        title="Edit"
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setLaunchDialogOpen(true);
                        }}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
                  {template.description && (
                    <CardDescription className="line-clamp-2">
                      {template.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {template.framework_type && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          <span>{template.framework_type}</span>
                        </div>
                      )}
                      {template.industry && (
                        <div className="flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" />
                          <span>{template.industry}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setLaunchDialogOpen(true);
                      }}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Launch
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredTemplates.length === 0 && (
              <Card className="col-span-full border-dashed">
                <CardContent className="py-12 text-center">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium text-muted-foreground">No templates found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first assessment template to get started
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)} variant="outline" className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    Create Template
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Active Assessments Tab */}
        <TabsContent value="active" className="space-y-4">
          <ActiveAssessments
            instances={instances}
            onViewResults={(instance) => {
              setSelectedInstance(instance);
              setResultsDialogOpen(true);
            }}
            onManageRecipients={(instance) => {
              setSelectedInstance(instance);
              setManageDialogOpen(true);
            }}
            onRefresh={fetchData}
          />
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {instances.filter((i) => i.status === "closed" || i.status === "active").length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {instances.filter((i) => i.status !== "draft").map((instance) => (
                <Card 
                  key={instance.id} 
                  className="border-border cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => {
                    setSelectedInstance(instance);
                    setResultsDialogOpen(true);
                  }}
                >
                  <CardContent className="py-4">
                    <p className="font-medium">{instance.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {instance.assessment_template?.name}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">No results yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete assessments will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Benchmarks Tab */}
        <TabsContent value="benchmarks" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="border-border hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge
                      variant="outline"
                      className={cn("capitalize", categoryColors[template.category] || categoryColors.general)}
                    >
                      {template.category}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setBenchmarkDialogOpen(true);
                      }}
                    >
                      <Database className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
                  {template.description && (
                    <CardDescription className="line-clamp-2">
                      {template.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 w-full"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setBenchmarkDialogOpen(true);
                    }}
                  >
                    <Database className="h-3.5 w-3.5" />
                    Manage Benchmarks
                  </Button>
                </CardContent>
              </Card>
            ))}

            {templates.length === 0 && (
              <Card className="col-span-full border-dashed">
                <CardContent className="py-12 text-center">
                  <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium text-muted-foreground">No templates available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create assessment templates first to add benchmark data
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Assessment Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                placeholder="e.g., Digital Maturity Assessment"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose and scope of this assessment..."
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Assessment Type</Label>
              <Select
                value={newTemplate.assessment_type}
                onValueChange={(value) => setNewTemplate({ ...newTemplate, assessment_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard — Questions by dimension</SelectItem>
                  <SelectItem value="use_case">Use Case — Evaluate items against criteria</SelectItem>
                  <SelectItem value="comparative">Comparative — Compare options side-by-side</SelectItem>
                  <SelectItem value="process">Process — Evaluate business processes</SelectItem>
                  <SelectItem value="checklist">Checklist — Binary or RAG compliance</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {newTemplate.assessment_type === "standard" && "Traditional questionnaire grouped by dimensions with Likert scoring."}
                {newTemplate.assessment_type === "use_case" && "Define a list of use cases evaluated against the same criteria. Results feed into a prioritisation matrix."}
                {newTemplate.assessment_type === "comparative" && "Score vendors/solutions against weighted criteria. Results show ranked comparison."}
                {newTemplate.assessment_type === "process" && "Evaluate business processes against standard criteria. Results show a transformation heat map."}
                {newTemplate.assessment_type === "checklist" && "Binary or Red/Amber/Green responses against compliance requirements."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newTemplate.category}
                  onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maturity">Maturity</SelectItem>
                    <SelectItem value="readiness">Readiness</SelectItem>
                    <SelectItem value="capability">Capability</SelectItem>
                    <SelectItem value="culture">Culture</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="framework">Framework Type</Label>
                <Input
                  id="framework"
                  placeholder="e.g., CMMI, TOGAF"
                  value={newTemplate.framework_type}
                  onChange={(e) => setNewTemplate({ ...newTemplate, framework_type: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry Focus</Label>
              <Input
                id="industry"
                placeholder="e.g., Financial Services, Healthcare"
                value={newTemplate.industry}
                onChange={(e) => setNewTemplate({ ...newTemplate, industry: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={!newTemplate.name}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Launch Assessment Dialog */}
      <Dialog open={launchDialogOpen} onOpenChange={setLaunchDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Launch Assessment</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4 py-4">
              <Card className="bg-muted/50">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedTemplate.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{selectedTemplate.category}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-2">
                <Label htmlFor="instance-name">Assessment Name</Label>
                <Input
                  id="instance-name"
                  placeholder={`${selectedTemplate.name} - ${new Date().toLocaleDateString()}`}
                  value={launchForm.name}
                  onChange={(e) => setLaunchForm({ ...launchForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instance-description">Description (Optional)</Label>
                <Textarea
                  id="instance-description"
                  placeholder="Add any specific context for this assessment instance..."
                  value={launchForm.description}
                  onChange={(e) => setLaunchForm({ ...launchForm, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Link to Project (Optional)</Label>
                <Select
                  value={launchForm.project_id}
                  onValueChange={(value) => setLaunchForm({ ...launchForm, project_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLaunchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLaunchAssessment} className="gap-2">
              <Send className="h-4 w-4" />
              Launch Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Builder Dialog */}
      <Dialog open={builderDialogOpen} onOpenChange={setBuilderDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTemplate && (
            <AssessmentBuilder
              templateId={selectedTemplate.id}
              templateName={selectedTemplate.name}
              onClose={() => {
                setBuilderDialogOpen(false);
                fetchData();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {selectedInstance && (
            <AssessmentResults
              instanceId={selectedInstance.id}
              instanceName={selectedInstance.name}
              onClose={() => setResultsDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Benchmark Manager Dialog */}
      <Dialog open={benchmarkDialogOpen} onOpenChange={setBenchmarkDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedTemplate && (
            <BenchmarkManager
              templateId={selectedTemplate.id}
              templateName={selectedTemplate.name}
              onClose={() => {
                setBenchmarkDialogOpen(false);
                fetchData();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Assessment Dialog (Recipients) */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedInstance && selectedInstance.assessment_template && (
            <AssessmentLaunch
              templateId={selectedInstance.assessment_template_id}
              templateName={selectedInstance.assessment_template.name}
              instanceId={selectedInstance.id}
              onClose={() => {
                setManageDialogOpen(false);
                fetchData();
              }}
              onViewResults={(id, name) => {
                setManageDialogOpen(false);
                setSelectedInstance({ ...selectedInstance, id, name });
                setResultsDialogOpen(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
