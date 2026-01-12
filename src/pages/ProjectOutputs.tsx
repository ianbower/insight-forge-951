import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  FileText,
  Globe,
  Loader2,
  Upload,
  Palette,
  Type,
  Sparkles,
  RefreshCw,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BrandingConfig {
  primaryLogo: string | null;
  secondaryLogo: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  styleGuideNotes: string;
}

interface ReportSection {
  id: string;
  title: string;
  type: "executive-summary" | "methodology" | "step-content" | "tool-output" | "recommendations" | "appendix";
  content: string;
  isEditing: boolean;
}

interface Project {
  id: string;
  name: string;
  status: string;
  client_id: string | null;
  runbook_id: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deliverables: any;
  notes_json: any;
}

const defaultBranding: BrandingConfig = {
  primaryLogo: null,
  secondaryLogo: null,
  primaryColor: "#1a365d",
  secondaryColor: "#2d3748",
  accentColor: "#3182ce",
  headingFont: "Inter",
  bodyFont: "Inter",
  styleGuideNotes: "",
};

const fontOptions = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Source Sans Pro",
  "Playfair Display",
  "Merriweather",
  "Georgia",
];

export default function ProjectOutputs() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<{ name: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [toolData, setToolData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [activeTab, setActiveTab] = useState("branding");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const secondaryLogoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;

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
            .select("name")
            .eq("id", projectData.client_id)
            .maybeSingle();
          setClient(clientData);
        }

        // Fetch tasks
        const { data: tasksData } = await supabase
          .from("project_tasks")
          .select("*")
          .eq("project_id", projectId)
          .order("order_index");

        setTasks(tasksData || []);

        // Fetch tool data
        const { data: toolDataRecords } = await supabase
          .from("tool_data")
          .select("*, consulting_tools(name)")
          .eq("project_id", projectId);

        setToolData(toolDataRecords || []);

      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Error loading project", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, navigate, toast]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "primary" | "secondary") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setBranding((prev) => ({
        ...prev,
        [type === "primary" ? "primaryLogo" : "secondaryLogo"]: base64,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateReport = async () => {
    if (!project) return;

    setGenerating(true);
    setGenerationProgress(0);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setGenerationProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const { data, error } = await supabase.functions.invoke("generate-report", {
        body: {
          projectId,
          projectName: project.name,
          clientName: client?.name || "Client",
          tasks: tasks.map((t) => ({
            title: t.title,
            description: t.description,
            status: t.status,
            deliverables: t.deliverables,
            notes: t.notes_json,
          })),
          toolData: toolData.map((td: any) => ({
            toolName: td.consulting_tools?.name,
            content: td.content_json,
          })),
          branding,
        },
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (error) throw error;

      if (data?.sections) {
        setSections(
          data.sections.map((s: any, i: number) => ({
            id: `section-${i}`,
            title: s.title,
            type: s.type,
            content: s.content,
            isEditing: false,
          }))
        );
        setActiveTab("editor");
        toast({ title: "Report generated", description: "You can now edit the content before exporting." });
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast({ title: "Error generating report", variant: "destructive" });
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handleUpdateSection = (id: string, content: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, content } : s))
    );
  };

  const handleExportPDF = async () => {
    toast({ title: "Exporting PDF...", description: "Your document is being generated." });
    
    // Create a styled HTML document and use jsPDF
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    let yPosition = 20;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;

    // Title
    pdf.setFontSize(24);
    pdf.setTextColor(branding.primaryColor);
    pdf.text(project?.name || "Project Report", margin, yPosition);
    yPosition += 15;

    // Client
    if (client) {
      pdf.setFontSize(14);
      pdf.setTextColor(branding.secondaryColor);
      pdf.text(`Prepared for: ${client.name}`, margin, yPosition);
      yPosition += 10;
    }

    // Date
    pdf.setFontSize(10);
    pdf.setTextColor("#666666");
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 20;

    // Sections
    sections.forEach((section) => {
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      // Section title
      pdf.setFontSize(16);
      pdf.setTextColor(branding.primaryColor);
      pdf.text(section.title, margin, yPosition);
      yPosition += 10;

      // Section content
      pdf.setFontSize(11);
      pdf.setTextColor("#333333");
      const lines = pdf.splitTextToSize(section.content, 170);
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
      yPosition += 10;
    });

    pdf.save(`${project?.name?.replace(/\s+/g, "_") || "report"}.pdf`);
    toast({ title: "PDF exported successfully" });
  };

  const handleExportHTML = async () => {
    toast({ title: "Generating HTML package...", description: "Creating downloadable website." });

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project?.name || "Project Report"}</title>
  <link href="https://fonts.googleapis.com/css2?family=${branding.headingFont.replace(" ", "+")}:wght@400;600;700&family=${branding.bodyFont.replace(" ", "+")}:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: ${branding.primaryColor};
      --secondary: ${branding.secondaryColor};
      --accent: ${branding.accentColor};
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: '${branding.bodyFont}', system-ui, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f8fafc;
    }
    .container { max-width: 1000px; margin: 0 auto; padding: 2rem; }
    header {
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: white;
      padding: 4rem 2rem;
      text-align: center;
    }
    header h1 {
      font-family: '${branding.headingFont}', system-ui, sans-serif;
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    header p { opacity: 0.9; }
    nav {
      background: white;
      border-bottom: 1px solid #e2e8f0;
      padding: 1rem 2rem;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    nav ul {
      display: flex;
      gap: 2rem;
      list-style: none;
      justify-content: center;
      flex-wrap: wrap;
    }
    nav a {
      color: var(--secondary);
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
    }
    nav a:hover { color: var(--accent); }
    section {
      background: white;
      margin: 2rem 0;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    section h2 {
      font-family: '${branding.headingFont}', system-ui, sans-serif;
      color: var(--primary);
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--accent);
    }
    section p { margin-bottom: 1rem; white-space: pre-wrap; }
    footer {
      text-align: center;
      padding: 2rem;
      color: #64748b;
      font-size: 0.875rem;
    }
    @media print {
      nav { display: none; }
      section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <header>
    ${branding.primaryLogo ? `<img src="${branding.primaryLogo}" alt="Logo" style="max-height: 60px; margin-bottom: 1rem;">` : ""}
    <h1>${project?.name || "Project Report"}</h1>
    <p>Prepared for: ${client?.name || "Client"}</p>
    <p style="font-size: 0.875rem; margin-top: 0.5rem;">Generated: ${new Date().toLocaleDateString()}</p>
  </header>
  
  <nav>
    <ul>
      ${sections.map((s) => `<li><a href="#${s.id}">${s.title}</a></li>`).join("")}
    </ul>
  </nav>
  
  <main class="container">
    ${sections
      .map(
        (s) => `
    <section id="${s.id}">
      <h2>${s.title}</h2>
      <p>${s.content.replace(/\n/g, "</p><p>")}</p>
    </section>
    `
      )
      .join("")}
  </main>
  
  <footer>
    <p>Generated by Consulting Workbench</p>
  </footer>
  
  <script>
    document.querySelectorAll('nav a').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        document.querySelector(a.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
      });
    });
  </script>
</body>
</html>`;

    // Create downloadable file
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name?.replace(/\s+/g, "_") || "report"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "HTML exported successfully", description: "Open the file in any browser to view." });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-semibold">Project Outputs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {project?.name} • Generate branded deliverables
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {sections.length > 0 && (
            <>
              <Button variant="outline" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" onClick={handleExportHTML}>
                <Globe className="h-4 w-4 mr-2" />
                Export HTML
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="editor" className="gap-2" disabled={sections.length === 0}>
            <FileText className="h-4 w-4" />
            Report Editor
            {sections.length > 0 && (
              <Badge variant="secondary" className="ml-1">{sections.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6 mt-6">
          {/* Branding Configuration */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Logo Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Logos
                </CardTitle>
                <CardDescription>Upload your brand logos for the report header</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Primary Logo</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {branding.primaryLogo ? (
                      <div className="relative h-16 w-32 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                        <img
                          src={branding.primaryLogo}
                          alt="Primary logo"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                        No logo
                      </div>
                    )}
                    <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e, "primary")}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <Label>Secondary Logo (optional)</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {branding.secondaryLogo ? (
                      <div className="relative h-16 w-32 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                        <img
                          src={branding.secondaryLogo}
                          alt="Secondary logo"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                        No logo
                      </div>
                    )}
                    <Button variant="outline" size="sm" onClick={() => secondaryLogoInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                    <input
                      ref={secondaryLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e, "secondary")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Brand Colors
                </CardTitle>
                <CardDescription>Set your brand colors for consistent styling</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Primary</Label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
                        className="h-10 w-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={branding.primaryColor}
                        onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Secondary</Label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                        className="h-10 w-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Accent</Label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.accentColor}
                        onChange={(e) => setBranding((prev) => ({ ...prev, accentColor: e.target.value }))}
                        className="h-10 w-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={branding.accentColor}
                        onChange={(e) => setBranding((prev) => ({ ...prev, accentColor: e.target.value }))}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Typography */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Typography
                </CardTitle>
                <CardDescription>Choose fonts for headings and body text</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Heading Font</Label>
                    <select
                      value={branding.headingFont}
                      onChange={(e) => setBranding((prev) => ({ ...prev, headingFont: e.target.value }))}
                      className="mt-2 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {fontOptions.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Body Font</Label>
                    <select
                      value={branding.bodyFont}
                      onChange={(e) => setBranding((prev) => ({ ...prev, bodyFont: e.target.value }))}
                      className="mt-2 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {fontOptions.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Style Guide Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Style Guide Notes (Optional)</CardTitle>
                <CardDescription>Add any additional branding guidelines or notes</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="e.g., Use formal tone, avoid jargon, emphasize data-driven insights..."
                  value={branding.styleGuideNotes}
                  onChange={(e) => setBranding((prev) => ({ ...prev, styleGuideNotes: e.target.value }))}
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Generate Button */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Generate Report</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI will create a comprehensive report from your project data, workflow steps, tool outputs, and deliverables.
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={handleGenerateReport}
                  disabled={generating}
                  className="gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
              {generating && (
                <div className="mt-4">
                  <Progress value={generationProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Analyzing project data and generating content...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="editor" className="space-y-4 mt-6">
          {/* Regenerate option */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleGenerateReport} disabled={generating}>
              <RefreshCw className={cn("h-4 w-4 mr-2", generating && "animate-spin")} />
              Regenerate
            </Button>
          </div>

          {/* Editable Sections */}
          {sections.map((section) => (
            <Card key={section.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {section.title}
                    <Badge variant="secondary" className="text-xs">
                      {section.type.replace("-", " ")}
                    </Badge>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setEditingSectionId(editingSectionId === section.id ? null : section.id)
                    }
                  >
                    {editingSectionId === section.id ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Done
                      </>
                    ) : (
                      "Edit"
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {editingSectionId === section.id ? (
                  <Textarea
                    value={section.content}
                    onChange={(e) => handleUpdateSection(section.id, e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                    {section.content}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {sections.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-2">No report generated yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure your branding and click "Generate Report" to create your deliverable.
                </p>
                <Button variant="outline" onClick={() => setActiveTab("branding")}>
                  Go to Branding
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
