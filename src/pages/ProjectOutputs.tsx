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
  Camera,
  X,
  Plus,
  GripVertical,
  Eye,
  Trash2,
  LayoutGrid,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";

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

interface ReportImage {
  id: string;
  src: string;
  caption: string;
  type: "tool" | "custom";
  toolName?: string;
}

interface ReportSection {
  id: string;
  title: string;
  type: "executive-summary" | "methodology" | "step-content" | "tool-output" | "recommendations" | "appendix";
  content: string;
  images: string[]; // image IDs
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
  primaryColor: "#0f172a",
  secondaryColor: "#334155",
  accentColor: "#0ea5e9",
  headingFont: "Playfair Display",
  bodyFont: "Inter",
  styleGuideNotes: "",
};

const fontOptions = [
  { name: "Playfair Display", category: "Serif" },
  { name: "Merriweather", category: "Serif" },
  { name: "Georgia", category: "Serif" },
  { name: "Lora", category: "Serif" },
  { name: "Inter", category: "Sans-serif" },
  { name: "Roboto", category: "Sans-serif" },
  { name: "Open Sans", category: "Sans-serif" },
  { name: "Montserrat", category: "Sans-serif" },
  { name: "Source Sans Pro", category: "Sans-serif" },
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
  const [images, setImages] = useState<ReportImage[]>([]);
  const [activeTab, setActiveTab] = useState("branding");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const secondaryLogoInputRef = useRef<HTMLInputElement>(null);
  const customImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;

      try {
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

        if (projectData.client_id) {
          const { data: clientData } = await supabase
            .from("clients")
            .select("name")
            .eq("id", projectData.client_id)
            .maybeSingle();
          setClient(clientData);
        }

        const { data: tasksData } = await supabase
          .from("project_tasks")
          .select("*")
          .eq("project_id", projectId)
          .order("order_index");

        setTasks(tasksData || []);

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

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage: ReportImage = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          src: reader.result as string,
          caption: file.name.replace(/\.[^/.]+$/, ""),
          type: "custom",
        };
        setImages((prev) => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });
  };

  const captureToolScreenshot = async (toolName: string, elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      toast({ title: "Could not capture tool", description: "Element not found", variant: "destructive" });
      return;
    }

    try {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff" });
      const newImage: ReportImage = {
        id: `tool-${Date.now()}`,
        src: canvas.toDataURL("image/png"),
        caption: toolName,
        type: "tool",
        toolName,
      };
      setImages((prev) => [...prev, newImage]);
      toast({ title: "Screenshot captured", description: `${toolName} added to images` });
    } catch (error) {
      toast({ title: "Error capturing screenshot", variant: "destructive" });
    }
  };

  const handleDeleteImage = (imageId: string) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId));
    setSections((prev) =>
      prev.map((s) => ({ ...s, images: s.images.filter((id) => id !== imageId) }))
    );
  };

  const handleUpdateImageCaption = (imageId: string, caption: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, caption } : img))
    );
  };

  const handleAddImageToSection = (sectionId: string, imageId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId && !s.images.includes(imageId)
          ? { ...s, images: [...s.images, imageId] }
          : s
      )
    );
  };

  const handleRemoveImageFromSection = (sectionId: string, imageId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, images: s.images.filter((id) => id !== imageId) } : s
      )
    );
  };

  const handleGenerateReport = async () => {
    if (!project) return;

    setGenerating(true);
    setGenerationProgress(0);

    try {
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
            images: [],
          }))
        );
        setActiveTab("editor");
        toast({ title: "Report generated", description: "Review and customize your deliverable." });
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
    toast({ title: "Exporting PDF...", description: "Generating your document." });
    
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 25;
    const contentWidth = pageWidth - margin * 2;
    let yPosition = margin;

    // Cover page
    pdf.setFillColor(branding.primaryColor);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
    
    // Logo on cover
    if (branding.primaryLogo) {
      try {
        pdf.addImage(branding.primaryLogo, "PNG", margin, margin, 40, 20);
      } catch (e) {}
    }

    pdf.setTextColor("#ffffff");
    pdf.setFontSize(36);
    const titleLines = pdf.splitTextToSize(project?.name || "Strategic Report", contentWidth);
    pdf.text(titleLines, margin, pageHeight / 2 - 20);

    pdf.setFontSize(16);
    pdf.text(`Prepared for ${client?.name || "Client"}`, margin, pageHeight / 2 + 10);
    
    pdf.setFontSize(12);
    pdf.text(new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }), margin, pageHeight / 2 + 25);

    // Content pages
    sections.forEach((section, sectionIndex) => {
      pdf.addPage();
      yPosition = margin;

      // Section number and title
      pdf.setTextColor(branding.accentColor);
      pdf.setFontSize(12);
      pdf.text(`${String(sectionIndex + 1).padStart(2, "0")}`, margin, yPosition);
      
      pdf.setTextColor(branding.primaryColor);
      pdf.setFontSize(22);
      yPosition += 12;
      pdf.text(section.title, margin, yPosition);
      
      // Accent line
      pdf.setDrawColor(branding.accentColor);
      pdf.setLineWidth(0.5);
      yPosition += 5;
      pdf.line(margin, yPosition, margin + 40, yPosition);
      yPosition += 15;

      // Content
      pdf.setTextColor("#374151");
      pdf.setFontSize(11);
      const lines = pdf.splitTextToSize(section.content, contentWidth);
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin, yPosition);
        yPosition += 6;
      });

      // Section images
      const sectionImages = section.images.map((imgId) => images.find((img) => img.id === imgId)).filter(Boolean);
      sectionImages.forEach((img) => {
        if (!img) return;
        if (yPosition > pageHeight - 80) {
          pdf.addPage();
          yPosition = margin;
        }
        try {
          const imgWidth = contentWidth * 0.8;
          const imgX = margin + (contentWidth - imgWidth) / 2;
          pdf.addImage(img.src, "PNG", imgX, yPosition, imgWidth, 50);
          yPosition += 55;
          pdf.setFontSize(9);
          pdf.setTextColor("#6b7280");
          pdf.text(img.caption, pageWidth / 2, yPosition, { align: "center" });
          yPosition += 15;
        } catch (e) {}
      });
    });

    pdf.save(`${project?.name?.replace(/\s+/g, "_") || "report"}.pdf`);
    toast({ title: "PDF exported successfully" });
  };

  const handleExportHTML = async () => {
    toast({ title: "Generating HTML...", description: "Creating interactive website." });

    const sectionImagesMap: Record<string, ReportImage[]> = {};
    sections.forEach((s) => {
      sectionImagesMap[s.id] = s.images.map((imgId) => images.find((img) => img.id === imgId)).filter(Boolean) as ReportImage[];
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project?.name || "Strategic Report"}</title>
  <link href="https://fonts.googleapis.com/css2?family=${branding.headingFont.replace(/ /g, "+")}:wght@400;500;600;700&family=${branding.bodyFont.replace(/ /g, "+")}:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: ${branding.primaryColor};
      --secondary: ${branding.secondaryColor};
      --accent: ${branding.accentColor};
      --heading-font: '${branding.headingFont}', Georgia, serif;
      --body-font: '${branding.bodyFont}', system-ui, sans-serif;
    }
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      font-family: var(--body-font);
      line-height: 1.7;
      color: #1f2937;
      background: #fafafa;
    }
    
    /* Cover Section */
    .cover {
      min-height: 100vh;
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 4rem;
      color: white;
      position: relative;
      overflow: hidden;
    }
    .cover::before {
      content: '';
      position: absolute;
      top: 0; right: 0; bottom: 0; left: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }
    .cover-logo { max-height: 60px; margin-bottom: 3rem; }
    .cover h1 {
      font-family: var(--heading-font);
      font-size: clamp(2.5rem, 6vw, 4.5rem);
      font-weight: 600;
      line-height: 1.1;
      margin-bottom: 1.5rem;
      max-width: 800px;
    }
    .cover-meta {
      font-size: 1.125rem;
      opacity: 0.9;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .cover-date { opacity: 0.7; font-size: 0.875rem; }
    
    /* Navigation */
    nav {
      position: sticky;
      top: 0;
      background: white;
      border-bottom: 1px solid #e5e7eb;
      z-index: 100;
      padding: 0 2rem;
    }
    nav ul {
      display: flex;
      gap: 0;
      list-style: none;
      max-width: 1200px;
      margin: 0 auto;
      overflow-x: auto;
    }
    nav li { flex-shrink: 0; }
    nav a {
      display: block;
      padding: 1rem 1.5rem;
      color: var(--secondary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    nav a:hover, nav a.active {
      color: var(--primary);
      border-bottom-color: var(--accent);
    }
    
    /* Main Content */
    main { max-width: 900px; margin: 0 auto; padding: 4rem 2rem; }
    
    /* Sections */
    .section {
      margin-bottom: 5rem;
      scroll-margin-top: 80px;
    }
    .section-header {
      display: flex;
      align-items: baseline;
      gap: 1rem;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .section-number {
      font-family: var(--heading-font);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--accent);
      letter-spacing: 0.05em;
    }
    .section h2 {
      font-family: var(--heading-font);
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--primary);
    }
    .section-content {
      font-size: 1.0625rem;
      color: #374151;
    }
    .section-content p { margin-bottom: 1.25rem; }
    
    /* Images */
    .section-images {
      display: grid;
      gap: 2rem;
      margin: 2rem 0;
    }
    .section-image {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
    }
    .section-image img {
      width: 100%;
      height: auto;
      display: block;
    }
    .section-image figcaption {
      padding: 1rem;
      font-size: 0.875rem;
      color: #6b7280;
      text-align: center;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    
    /* Footer */
    footer {
      background: var(--primary);
      color: white;
      padding: 3rem 2rem;
      text-align: center;
    }
    footer p { opacity: 0.8; font-size: 0.875rem; }
    
    /* Print Styles */
    @media print {
      nav, .cover::before { display: none; }
      .cover { min-height: auto; padding: 2rem; page-break-after: always; }
      .section { page-break-inside: avoid; }
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .cover { padding: 2rem; }
      .cover h1 { font-size: 2rem; }
      main { padding: 2rem 1rem; }
    }
  </style>
</head>
<body>
  <section class="cover">
    ${branding.primaryLogo ? `<img src="${branding.primaryLogo}" alt="Logo" class="cover-logo">` : ""}
    <h1>${project?.name || "Strategic Report"}</h1>
    <div class="cover-meta">
      <span>Prepared for ${client?.name || "Client"}</span>
      <span class="cover-date">${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
    </div>
  </section>
  
  <nav>
    <ul>
      ${sections.map((s, i) => `<li><a href="#${s.id}">${String(i + 1).padStart(2, "0")}. ${s.title}</a></li>`).join("")}
    </ul>
  </nav>
  
  <main>
    ${sections.map((s, i) => `
    <section class="section" id="${s.id}">
      <div class="section-header">
        <span class="section-number">${String(i + 1).padStart(2, "0")}</span>
        <h2>${s.title}</h2>
      </div>
      <div class="section-content">
        ${s.content.split("\n\n").map((p) => `<p>${p}</p>`).join("")}
      </div>
      ${sectionImagesMap[s.id]?.length ? `
      <div class="section-images">
        ${sectionImagesMap[s.id].map((img) => `
        <figure class="section-image">
          <img src="${img.src}" alt="${img.caption}">
          <figcaption>${img.caption}</figcaption>
        </figure>
        `).join("")}
      </div>
      ` : ""}
    </section>
    `).join("")}
  </main>
  
  <footer>
    <p>Confidential • ${new Date().getFullYear()}</p>
  </footer>
  
  <script>
    // Smooth scroll and active state
    const links = document.querySelectorAll('nav a');
    const sections = document.querySelectorAll('.section');
    
    links.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        document.querySelector(link.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
      });
    });
    
    window.addEventListener('scroll', () => {
      let current = '';
      sections.forEach(section => {
        if (scrollY >= section.offsetTop - 100) current = section.getAttribute('id');
      });
      links.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + current) link.classList.add('active');
      });
    });
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name?.replace(/\s+/g, "_") || "report"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "HTML exported", description: "Open in any browser to view." });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const availableTools = toolData.filter((td) => td.consulting_tools?.name);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
      {/* Elegant Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-display font-semibold text-primary">
                  Project Deliverables
                </h1>
                <p className="text-sm text-muted-foreground">
                  {project?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {sections.length > 0 && (
                <>
                  <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Report Preview</DialogTitle>
                      </DialogHeader>
                      <div className="prose prose-sm max-w-none">
                        {sections.map((section, i) => (
                          <div key={section.id} className="mb-8">
                            <div className="flex items-baseline gap-3 mb-2">
                              <span className="text-accent font-semibold text-sm">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <h3 className="text-lg font-display font-semibold text-primary m-0">
                                {section.title}
                              </h3>
                            </div>
                            <p className="text-muted-foreground whitespace-pre-wrap">
                              {section.content}
                            </p>
                            {section.images.length > 0 && (
                              <div className="grid gap-4 mt-4">
                                {section.images.map((imgId) => {
                                  const img = images.find((i) => i.id === imgId);
                                  return img ? (
                                    <figure key={imgId} className="m-0">
                                      <img src={img.src} alt={img.caption} className="rounded-lg border" />
                                      <figcaption className="text-center text-xs text-muted-foreground mt-2">
                                        {img.caption}
                                      </figcaption>
                                    </figure>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
                    <FileText className="h-4 w-4" />
                    PDF
                  </Button>
                  <Button size="sm" onClick={handleExportHTML} className="gap-2">
                    <Globe className="h-4 w-4" />
                    HTML Website
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white shadow-sm border mb-8">
            <TabsTrigger value="branding" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Palette className="h-4 w-4" />
              Brand & Style
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ImageIcon className="h-4 w-4" />
              Images
              {images.length > 0 && <Badge variant="secondary" className="ml-1">{images.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="editor" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" disabled={sections.length === 0}>
              <FileText className="h-4 w-4" />
              Report
              {sections.length > 0 && <Badge variant="secondary" className="ml-1">{sections.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Logos */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-accent" />
                    Logos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Primary Logo</Label>
                    <div className="mt-2 flex items-center gap-3">
                      <div className={cn(
                        "h-14 w-28 rounded-lg flex items-center justify-center overflow-hidden transition-colors",
                        branding.primaryLogo ? "bg-white border" : "bg-muted border-2 border-dashed"
                      )}>
                        {branding.primaryLogo ? (
                          <img src={branding.primaryLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-xs text-muted-foreground">No logo</span>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </Button>
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, "primary")} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Colors */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Palette className="h-4 w-4 text-accent" />
                    Brand Colors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: "primaryColor", label: "Primary" },
                      { key: "secondaryColor", label: "Secondary" },
                      { key: "accentColor", label: "Accent" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <Label className="text-xs text-muted-foreground">{label}</Label>
                        <div className="mt-1.5 flex items-center gap-2">
                          <input
                            type="color"
                            value={(branding as any)[key]}
                            onChange={(e) => setBranding((prev) => ({ ...prev, [key]: e.target.value }))}
                            className="h-9 w-9 rounded-lg border cursor-pointer"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Typography */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Type className="h-4 w-4 text-accent" />
                    Typography
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Heading Font</Label>
                    <select
                      value={branding.headingFont}
                      onChange={(e) => setBranding((prev) => ({ ...prev, headingFont: e.target.value }))}
                      className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {fontOptions.map((font) => (
                        <option key={font.name} value={font.name}>{font.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Body Font</Label>
                    <select
                      value={branding.bodyFont}
                      onChange={(e) => setBranding((prev) => ({ ...prev, bodyFont: e.target.value }))}
                      className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {fontOptions.map((font) => (
                        <option key={font.name} value={font.name}>{font.name}</option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Style Guide Notes */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium">Style & Tone Guidelines</CardTitle>
                <CardDescription>Optional notes to guide AI content generation</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="e.g., Use formal executive tone, emphasize data-driven insights, avoid technical jargon..."
                  value={branding.styleGuideNotes}
                  onChange={(e) => setBranding((prev) => ({ ...prev, styleGuideNotes: e.target.value }))}
                  rows={3}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {/* Generate CTA */}
            <Card className="shadow-sm border-accent/30 bg-gradient-to-r from-accent/5 to-transparent">
              <CardContent className="py-6">
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <h3 className="font-display font-semibold text-lg">Generate Your Report</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      AI will create a comprehensive McKinsey-style report from your project workflow, deliverables, and strategic analysis.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleGenerateReport}
                    disabled={generating}
                    className="gap-2 shadow-lg"
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
                    <Progress value={generationProgress} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Analyzing project data and crafting your deliverable...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Tool Screenshots */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-accent" />
                    Available Tools
                  </CardTitle>
                  <CardDescription>Capture screenshots from your strategic analysis tools</CardDescription>
                </CardHeader>
                <CardContent>
                  {availableTools.length > 0 ? (
                    <div className="space-y-2">
                      {availableTools.map((tool) => (
                        <div
                          key={tool.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-accent/10 flex items-center justify-center">
                              <LayoutGrid className="h-4 w-4 text-accent" />
                            </div>
                            <span className="font-medium text-sm">{tool.consulting_tools?.name}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Navigate to tool to capture, or add placeholder
                              const toolImage: ReportImage = {
                                id: `tool-${Date.now()}`,
                                src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#f1f5f9" width="400" height="300"/><text x="50%" y="50%" fill="#94a3b8" font-family="system-ui" font-size="14" text-anchor="middle" dy=".3em">${tool.consulting_tools?.name}</text></svg>`)}`,
                                caption: tool.consulting_tools?.name || "Tool Analysis",
                                type: "tool",
                                toolName: tool.consulting_tools?.name,
                              };
                              setImages((prev) => [...prev, toolImage]);
                              toast({ title: "Tool added", description: "Visit the tool page to capture a live screenshot" });
                            }}
                            className="gap-1.5"
                          >
                            <Plus className="h-3 w-3" />
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No tools used in this project yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Custom Images Upload */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Upload className="h-4 w-4 text-accent" />
                    Custom Images
                  </CardTitle>
                  <CardDescription>Upload charts, diagrams, photos, or other visuals</CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    onClick={() => customImageInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload images</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or SVG</p>
                  </div>
                  <input
                    ref={customImageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleCustomImageUpload}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Image Library */}
            {images.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Image Library ({images.length})</CardTitle>
                  <CardDescription>Click on images to edit captions. Assign them to report sections.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.map((img) => (
                      <div key={img.id} className="group relative">
                        <div className="aspect-video rounded-lg overflow-hidden bg-muted border">
                          <img src={img.src} alt={img.caption} className="w-full h-full object-cover" />
                        </div>
                        <button
                          onClick={() => handleDeleteImage(img.id)}
                          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <Input
                          value={img.caption}
                          onChange={(e) => handleUpdateImageCaption(img.id, e.target.value)}
                          className="mt-2 text-xs h-8"
                          placeholder="Caption..."
                        />
                        <Badge variant="outline" className="absolute top-2 left-2 text-[10px]">
                          {img.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Editor Tab */}
          <TabsContent value="editor" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Edit content and assign images to each section
              </p>
              <Button variant="outline" size="sm" onClick={handleGenerateReport} disabled={generating}>
                <RefreshCw className={cn("h-4 w-4 mr-2", generating && "animate-spin")} />
                Regenerate
              </Button>
            </div>

            {sections.map((section, sectionIndex) => (
              <Card key={section.id} className="shadow-sm overflow-hidden">
                <CardHeader className="pb-3 bg-gradient-to-r from-muted/30 to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-accent font-semibold text-sm font-display">
                        {String(sectionIndex + 1).padStart(2, "0")}
                      </span>
                      <CardTitle className="text-base font-display">{section.title}</CardTitle>
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                        {section.type.replace("-", " ")}
                      </Badge>
                    </div>
                    <Button
                      variant={editingSectionId === section.id ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setEditingSectionId(editingSectionId === section.id ? null : section.id)}
                    >
                      {editingSectionId === section.id ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Done
                        </>
                      ) : (
                        "Edit"
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {editingSectionId === section.id ? (
                    <Textarea
                      value={section.content}
                      onChange={(e) => handleUpdateSection(section.id, e.target.value)}
                      rows={10}
                      className="font-mono text-sm resize-none"
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                      {section.content.split("\n\n").map((p, i) => (
                        <p key={i} className="mb-3 last:mb-0">{p}</p>
                      ))}
                    </div>
                  )}

                  {/* Section Images */}
                  {section.images.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <Label className="text-xs text-muted-foreground mb-2 block">Attached Images</Label>
                      <div className="flex flex-wrap gap-2">
                        {section.images.map((imgId) => {
                          const img = images.find((i) => i.id === imgId);
                          return img ? (
                            <div key={imgId} className="relative group">
                              <img src={img.src} alt={img.caption} className="h-16 w-24 object-cover rounded border" />
                              <button
                                onClick={() => handleRemoveImageFromSection(section.id, imgId)}
                                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add Image to Section */}
                  {images.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <Label className="text-xs text-muted-foreground mb-2 block">Add Image</Label>
                      <ScrollArea className="w-full">
                        <div className="flex gap-2 pb-2">
                          {images
                            .filter((img) => !section.images.includes(img.id))
                            .map((img) => (
                              <button
                                key={img.id}
                                onClick={() => handleAddImageToSection(section.id, img.id)}
                                className="flex-shrink-0 h-12 w-20 rounded border-2 border-dashed hover:border-accent overflow-hidden transition-colors"
                              >
                                <img src={img.src} alt={img.caption} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {sections.length === 0 && (
              <Card className="border-dashed shadow-sm">
                <CardContent className="py-16 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="font-display font-semibold mb-2">No report generated yet</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Set up your branding, add images, then generate your report.
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab("branding")}>
                    Go to Brand & Style
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
