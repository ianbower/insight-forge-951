import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileDown, Loader2, ExternalLink } from "lucide-react";
import { exportDocumentationToPDF } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";

const sections = [
  { id: "executive-summary", title: "1. Executive Summary" },
  { id: "technology-stack", title: "2. Technology Stack" },
  { id: "architecture", title: "3. System Architecture" },
  { id: "core-modules", title: "4. Core Modules" },
  { id: "database-schema", title: "5. Database Schema" },
  { id: "edge-functions", title: "6. Edge Functions" },
  { id: "user-roles", title: "7. User Roles & Permissions" },
  { id: "security", title: "8. Security" },
  { id: "deployment", title: "9. Deployment" },
  { id: "troubleshooting", title: "10. Troubleshooting" },
];

export default function Documentation() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportDocumentationToPDF("documentation-content", "aXet Consult Platform Documentation");
      toast({
        title: "PDF Exported",
        description: "Documentation has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Platform Documentation</h1>
          <p className="text-muted-foreground mt-1">Technical reference for IT support and administrators</p>
        </div>
        <Button onClick={handleExportPDF} disabled={isExporting} size="lg">
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Export to PDF
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Table of Contents - Sticky Sidebar */}
        <div className="col-span-3">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Table of Contents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors py-1"
                >
                  {section.title}
                </a>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Documentation Content */}
        <div className="col-span-9">
          <div id="documentation-content" className="bg-background space-y-8">
            {/* Document Header for PDF */}
            <div className="text-center pb-6 border-b border-border">
              <h1 className="text-4xl font-bold text-foreground mb-2">aXet Consult Platform</h1>
              <p className="text-xl text-muted-foreground">Technical Documentation</p>
              <p className="text-sm text-muted-foreground mt-2">Version 1.0 • {new Date().toLocaleDateString()}</p>
            </div>

            {/* Section 1: Executive Summary */}
            <section id="executive-summary" className="scroll-mt-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">1. Executive Summary</h2>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <p className="text-foreground">
                    <strong>aXet Consult</strong> is a comprehensive consulting engagement platform designed to streamline 
                    professional services delivery. It provides an integrated suite of tools for project management, 
                    client assessments, strategic frameworks, and AI-powered research capabilities.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">Key Capabilities</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Project & engagement management</li>
                        <li>• Assessment creation & distribution</li>
                        <li>• Strategic consulting frameworks</li>
                        <li>• AI-powered research & insights</li>
                        <li>• Team resource management</li>
                        <li>• Runbook workflow automation</li>
                      </ul>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">Target Users</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Consulting firm leadership</li>
                        <li>• Practice leaders</li>
                        <li>• Engagement managers</li>
                        <li>• Consultants & analysts</li>
                        <li>• IT administrators</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Section 2: Technology Stack */}
            <section id="technology-stack" className="scroll-mt-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">2. Technology Stack</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">Category</th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">Technology</th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">Purpose</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-medium text-foreground">Frontend Framework</td>
                          <td className="py-3 px-4 text-muted-foreground">React 18 + TypeScript</td>
                          <td className="py-3 px-4 text-muted-foreground">UI component library with type safety</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-medium text-foreground">Build Tool</td>
                          <td className="py-3 px-4 text-muted-foreground">Vite</td>
                          <td className="py-3 px-4 text-muted-foreground">Fast development & production builds</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-medium text-foreground">Styling</td>
                          <td className="py-3 px-4 text-muted-foreground">Tailwind CSS + Shadcn/UI</td>
                          <td className="py-3 px-4 text-muted-foreground">Utility-first CSS with component library</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-medium text-foreground">State Management</td>
                          <td className="py-3 px-4 text-muted-foreground">TanStack Query</td>
                          <td className="py-3 px-4 text-muted-foreground">Server state, caching, synchronization</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-medium text-foreground">Backend</td>
                          <td className="py-3 px-4 text-muted-foreground">Lovable Cloud (PostgreSQL)</td>
                          <td className="py-3 px-4 text-muted-foreground">Database, auth, storage, edge functions</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-medium text-foreground">Authentication</td>
                          <td className="py-3 px-4 text-muted-foreground">Lovable Cloud Auth</td>
                          <td className="py-3 px-4 text-muted-foreground">Email/password with session management</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-medium text-foreground">Charts</td>
                          <td className="py-3 px-4 text-muted-foreground">Recharts</td>
                          <td className="py-3 px-4 text-muted-foreground">Data visualization & analytics</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-medium text-foreground">Export</td>
                          <td className="py-3 px-4 text-muted-foreground">jsPDF, PptxGenJS, html2canvas</td>
                          <td className="py-3 px-4 text-muted-foreground">PDF and PowerPoint generation</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-medium text-foreground">Icons</td>
                          <td className="py-3 px-4 text-muted-foreground">Lucide React</td>
                          <td className="py-3 px-4 text-muted-foreground">Consistent iconography throughout UI</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Section 3: Architecture */}
            <section id="architecture" className="scroll-mt-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">3. System Architecture</h2>
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Frontend Structure</h3>
                    <div className="bg-muted/30 p-4 rounded-lg font-mono text-sm">
                      <pre className="text-foreground whitespace-pre-wrap">{`src/
├── components/           # Reusable UI components
│   ├── ui/              # Shadcn base components
│   ├── layout/          # AppSidebar, TopBar, AppLayout
│   ├── project/         # Project-specific components
│   ├── assessments/     # Assessment builder & results
│   ├── canvas/          # Strategic framework canvases
│   └── dashboard/       # Dashboard widgets & charts
├── pages/               # Route-level page components
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
└── integrations/        # Backend client configuration`}</pre>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Backend Structure</h3>
                    <div className="bg-muted/30 p-4 rounded-lg font-mono text-sm">
                      <pre className="text-foreground whitespace-pre-wrap">{`supabase/
├── functions/           # Edge Functions (serverless)
│   ├── expert-ai-chat/  # AI chat with consulting personas
│   ├── research-ai/     # Deep research synthesis
│   ├── assessment-insights/ # AI assessment analysis
│   ├── send-assessment-emails/ # Email distribution
│   ├── generate-report/ # Document generation
│   └── layout-wizard/   # AI-powered layout suggestions
└── migrations/          # Database schema & RLS policies`}</pre>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Data Flow</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-primary/10 p-4 rounded-lg">
                        <div className="font-semibold text-foreground mb-2">Client (Browser)</div>
                        <div className="text-sm text-muted-foreground">React SPA with TanStack Query</div>
                      </div>
                      <div className="bg-primary/10 p-4 rounded-lg">
                        <div className="font-semibold text-foreground mb-2">Lovable Cloud API</div>
                        <div className="text-sm text-muted-foreground">REST API + Realtime subscriptions</div>
                      </div>
                      <div className="bg-primary/10 p-4 rounded-lg">
                        <div className="font-semibold text-foreground mb-2">PostgreSQL Database</div>
                        <div className="text-sm text-muted-foreground">RLS-protected tables</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Section 4: Core Modules */}
            <section id="core-modules" className="scroll-mt-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">4. Core Modules</h2>
              <div className="grid gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">Projects & Engagements</h3>
                    <p className="text-muted-foreground mb-3">
                      Central module for managing consulting engagements with workflow automation, deliverable tracking, 
                      and team coordination.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong className="text-foreground">Features:</strong>
                        <ul className="text-muted-foreground mt-1 space-y-1">
                          <li>• Workflow step management</li>
                          <li>• Milestone & deliverable tracking</li>
                          <li>• RAID log (Risks, Actions, Issues, Decisions)</li>
                          <li>• Budget tracking with currency conversion</li>
                          <li>• Block-based layout system</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-foreground">Key Files:</strong>
                        <ul className="text-muted-foreground mt-1 space-y-1 font-mono text-xs">
                          <li>• ProjectDetail.tsx</li>
                          <li>• WorkflowTimeline.tsx</li>
                          <li>• RAIDLog.tsx</li>
                          <li>• GridBlockLayout.tsx</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">Assessments</h3>
                    <p className="text-muted-foreground mb-3">
                      Complete assessment lifecycle management from template creation to response analysis and insights generation.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong className="text-foreground">Features:</strong>
                        <ul className="text-muted-foreground mt-1 space-y-1">
                          <li>• Custom question builder (Likert, multiple choice, text)</li>
                          <li>• Dimension-based scoring with weights</li>
                          <li>• Email distribution with unique tokens</li>
                          <li>• Radar chart visualizations</li>
                          <li>• AI-powered insight generation</li>
                          <li>• Benchmark comparisons</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-foreground">Key Files:</strong>
                        <ul className="text-muted-foreground mt-1 space-y-1 font-mono text-xs">
                          <li>• AssessmentBuilder.tsx</li>
                          <li>• AssessmentResults.tsx</li>
                          <li>• AssessmentInsights.tsx</li>
                          <li>• AssessmentVisualizations.tsx</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">Tool Library</h3>
                    <p className="text-muted-foreground mb-3">
                      Interactive strategic consulting frameworks with drag-and-drop canvas interfaces.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong className="text-foreground">Available Tools:</strong>
                        <ul className="text-muted-foreground mt-1 space-y-1">
                          <li>• Business Model Canvas</li>
                          <li>• SWOT Analysis</li>
                          <li>• McKinsey 7S Framework</li>
                          <li>• Operating Model Canvas</li>
                          <li>• Transformation Roadmap</li>
                          <li>• Custom tool builder</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-foreground">Key Files:</strong>
                        <ul className="text-muted-foreground mt-1 space-y-1 font-mono text-xs">
                          <li>• BusinessModelCanvas.tsx</li>
                          <li>• SWOTCanvas.tsx</li>
                          <li>• SevenSCanvas.tsx</li>
                          <li>• CustomToolBuilder.tsx</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">Expert AI & Research</h3>
                    <p className="text-muted-foreground mb-3">
                      AI-powered consulting assistance with specialized personas and deep research capabilities.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong className="text-foreground">Features:</strong>
                        <ul className="text-muted-foreground mt-1 space-y-1">
                          <li>• Consulting persona chat (Strategy, Operations, etc.)</li>
                          <li>• Multi-source research synthesis</li>
                          <li>• Chat session history & folders</li>
                          <li>• Markdown rendering with code blocks</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-foreground">Key Files:</strong>
                        <ul className="text-muted-foreground mt-1 space-y-1 font-mono text-xs">
                          <li>• ExpertAI.tsx</li>
                          <li>• Research.tsx</li>
                          <li>• ChatHistorySidebar.tsx</li>
                          <li>• expert-ai-chat/index.ts</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">Runbooks</h3>
                    <p className="text-muted-foreground mb-3">
                      Reusable engagement templates that define standard workflow steps, tools, and deliverables.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong className="text-foreground">Features:</strong>
                        <ul className="text-muted-foreground mt-1 space-y-1">
                          <li>• Template creation & management</li>
                          <li>• Step sequencing with dependencies</li>
                          <li>• Tool & assessment linking</li>
                          <li>• Industry-specific templates</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-foreground">Key Files:</strong>
                        <ul className="text-muted-foreground mt-1 space-y-1 font-mono text-xs">
                          <li>• Runbooks.tsx</li>
                          <li>• RunbookDesigner.tsx</li>
                          <li>• RunbookBuilder.tsx</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">Team Management</h3>
                    <p className="text-muted-foreground mb-3">
                      Resource management for consulting team members with skills tracking and project assignment.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong className="text-foreground">Features:</strong>
                        <ul className="text-muted-foreground mt-1 space-y-1">
                          <li>• Team member profiles</li>
                          <li>• Skills & expertise tracking</li>
                          <li>• Availability calendar</li>
                          <li>• Project assignment management</li>
                          <li>• Utilization reporting</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-foreground">Key Files:</strong>
                        <ul className="text-muted-foreground mt-1 space-y-1 font-mono text-xs">
                          <li>• Team.tsx</li>
                          <li>• TeamMemberCard.tsx</li>
                          <li>• AvailabilityCalendar.tsx</li>
                          <li>• TeamUtilization.tsx</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Section 5: Database Schema */}
            <section id="database-schema" className="scroll-mt-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">5. Database Schema</h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground mb-4">
                    The platform uses a PostgreSQL database with Row Level Security (RLS) policies to ensure data isolation and access control.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">Table</th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">Purpose</th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">Key Fields</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">projects</td>
                          <td className="py-3 px-4 text-muted-foreground">Core project/engagement records</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">name, client_id, status, runbook_id, budget_amount</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">project_tasks</td>
                          <td className="py-3 px-4 text-muted-foreground">Workflow steps within projects</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">title, status, layout_json, notes_json</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">project_members</td>
                          <td className="py-3 px-4 text-muted-foreground">User-project associations</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">user_id, project_id, role_in_project, can_manage</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">assessment_templates</td>
                          <td className="py-3 px-4 text-muted-foreground">Reusable assessment definitions</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">name, category, framework_type, is_public</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">assessment_instances</td>
                          <td className="py-3 px-4 text-muted-foreground">Deployed assessment campaigns</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">template_id, project_id, status, settings</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">assessment_responses</td>
                          <td className="py-3 px-4 text-muted-foreground">Individual response data</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">question_id, recipient_id, response_value</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">team_members</td>
                          <td className="py-3 px-4 text-muted-foreground">Consultant profiles</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">name, email, role, skills, hourly_rate</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">runbook_templates</td>
                          <td className="py-3 px-4 text-muted-foreground">Reusable workflow templates</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">name, workflow_json, step_layouts</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">tool_data</td>
                          <td className="py-3 px-4 text-muted-foreground">Canvas tool content storage</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">project_id, tool_id, content_json</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">chat_sessions</td>
                          <td className="py-3 px-4 text-muted-foreground">AI chat conversation history</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">user_id, title, persona, folder_id</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">user_roles</td>
                          <td className="py-3 px-4 text-muted-foreground">RBAC role assignments</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">user_id, role (enum)</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-mono text-foreground">profiles</td>
                          <td className="py-3 px-4 text-muted-foreground">User profile extensions</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">user_id, display_name, preferred_currency</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Section 6: Edge Functions */}
            <section id="edge-functions" className="scroll-mt-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">6. Edge Functions</h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground mb-4">
                    Serverless functions running on Deno runtime, handling AI operations and external integrations.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">Function</th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">Purpose</th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">Auth Required</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">expert-ai-chat</td>
                          <td className="py-3 px-4 text-muted-foreground">Consulting persona AI chat interactions</td>
                          <td className="py-3 px-4 text-muted-foreground">Yes</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">research-ai</td>
                          <td className="py-3 px-4 text-muted-foreground">Deep research synthesis from multiple sources</td>
                          <td className="py-3 px-4 text-muted-foreground">Yes</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">assessment-insights</td>
                          <td className="py-3 px-4 text-muted-foreground">AI analysis of assessment responses</td>
                          <td className="py-3 px-4 text-muted-foreground">Yes</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">send-assessment-emails</td>
                          <td className="py-3 px-4 text-muted-foreground">Email distribution via Resend</td>
                          <td className="py-3 px-4 text-muted-foreground">Yes</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">generate-report</td>
                          <td className="py-3 px-4 text-muted-foreground">AI-powered report content generation</td>
                          <td className="py-3 px-4 text-muted-foreground">Yes</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">layout-wizard</td>
                          <td className="py-3 px-4 text-muted-foreground">AI suggestions for step layouts</td>
                          <td className="py-3 px-4 text-muted-foreground">Yes</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">benchmark-discovery</td>
                          <td className="py-3 px-4 text-muted-foreground">Industry benchmark data retrieval</td>
                          <td className="py-3 px-4 text-muted-foreground">Yes</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-mono text-foreground">generate-chat-title</td>
                          <td className="py-3 px-4 text-muted-foreground">Auto-generate titles for chat sessions</td>
                          <td className="py-3 px-4 text-muted-foreground">Yes</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-mono text-foreground">exchange-rates</td>
                          <td className="py-3 px-4 text-muted-foreground">Currency conversion rate updates</td>
                          <td className="py-3 px-4 text-muted-foreground">No</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Section 7: User Roles */}
            <section id="user-roles" className="scroll-mt-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">7. User Roles & Permissions</h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground mb-4">
                    The platform implements a hierarchical Role-Based Access Control (RBAC) system stored in the <code className="bg-muted px-1 rounded">user_roles</code> table.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">Role</th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">Description</th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">Key Permissions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-semibold text-foreground">Admin</td>
                          <td className="py-3 px-4 text-muted-foreground">Full system administrator</td>
                          <td className="py-3 px-4 text-muted-foreground">
                            All permissions, user management, system configuration
                          </td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-semibold text-foreground">Practice Leader</td>
                          <td className="py-3 px-4 text-muted-foreground">Senior consulting leadership</td>
                          <td className="py-3 px-4 text-muted-foreground">
                            Create projects, manage templates, view all projects
                          </td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 px-4 font-semibold text-foreground">Engagement Lead</td>
                          <td className="py-3 px-4 text-muted-foreground">Project/engagement manager</td>
                          <td className="py-3 px-4 text-muted-foreground">
                            Create projects, manage assigned projects, team assignment
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-semibold text-foreground">Member</td>
                          <td className="py-3 px-4 text-muted-foreground">Standard consultant</td>
                          <td className="py-3 px-4 text-muted-foreground">
                            View/edit assigned projects only, use tools
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 bg-muted/30 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">Permission Hierarchy</h4>
                    <p className="text-sm text-muted-foreground">
                      Roles inherit permissions from lower levels. Admin includes all Practice Leader permissions, 
                      Practice Leader includes all Engagement Lead permissions, and so on. Users can have multiple roles assigned.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Section 8: Security */}
            <section id="security" className="scroll-mt-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">8. Security</h2>
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Authentication</h3>
                    <ul className="text-muted-foreground space-y-2">
                      <li>• Email/password authentication via Lovable Cloud Auth</li>
                      <li>• Email verification required before access</li>
                      <li>• Session-based authentication with JWT tokens</li>
                      <li>• Automatic session refresh handling</li>
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Row Level Security (RLS)</h3>
                    <p className="text-muted-foreground mb-3">
                      All database tables are protected by RLS policies that restrict access based on user authentication and role.
                    </p>
                    <div className="bg-muted/30 p-4 rounded-lg font-mono text-sm">
                      <pre className="text-foreground whitespace-pre-wrap">{`-- Example: Projects table RLS
CREATE POLICY "Users can view projects they are members of"
  ON projects FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = projects.id
    )
    OR has_elevated_role(auth.uid())
  );`}</pre>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">API Security</h3>
                    <ul className="text-muted-foreground space-y-2">
                      <li>• Edge functions require valid JWT authorization header</li>
                      <li>• CORS configured for approved origins</li>
                      <li>• Sensitive operations validate user permissions server-side</li>
                      <li>• API keys stored as secrets, never exposed to client</li>
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Data Protection</h3>
                    <ul className="text-muted-foreground space-y-2">
                      <li>• All data encrypted at rest</li>
                      <li>• TLS 1.3 for data in transit</li>
                      <li>• Assessment tokens are UUID-based, single-use</li>
                      <li>• No sensitive data stored in local storage</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Section 9: Deployment */}
            <section id="deployment" className="scroll-mt-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">9. Deployment</h2>
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Environment Variables</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">Variable</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">Purpose</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">Required</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border">
                            <td className="py-3 px-4 font-mono text-foreground">VITE_SUPABASE_URL</td>
                            <td className="py-3 px-4 text-muted-foreground">Backend API endpoint</td>
                            <td className="py-3 px-4 text-muted-foreground">Yes (auto-configured)</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="py-3 px-4 font-mono text-foreground">VITE_SUPABASE_PUBLISHABLE_KEY</td>
                            <td className="py-3 px-4 text-muted-foreground">Public API key for client</td>
                            <td className="py-3 px-4 text-muted-foreground">Yes (auto-configured)</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-mono text-foreground">RESEND_API_KEY</td>
                            <td className="py-3 px-4 text-muted-foreground">Email service API key (edge function)</td>
                            <td className="py-3 px-4 text-muted-foreground">Yes (stored as secret)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Build & Deploy Process</h3>
                    <ol className="text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Code changes trigger automatic build via Lovable platform</li>
                      <li>Vite compiles TypeScript and bundles assets</li>
                      <li>Edge functions deploy automatically when changes are detected</li>
                      <li>Database migrations are applied through the Lovable Cloud interface</li>
                      <li>Preview environment available for testing before publish</li>
                    </ol>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Environments</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <h4 className="font-semibold text-foreground mb-2">Test Environment</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Development & testing</li>
                          <li>• Isolated database</li>
                          <li>• Preview URL access</li>
                        </ul>
                      </div>
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <h4 className="font-semibold text-foreground mb-2">Live Environment</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Production deployment</li>
                          <li>• Published URL</li>
                          <li>• Real user data</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Section 10: Troubleshooting */}
            <section id="troubleshooting" className="scroll-mt-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">10. Troubleshooting</h2>
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-4">
                    <div className="border-l-4 border-yellow-500 pl-4">
                      <h4 className="font-semibold text-foreground">User Cannot Access Project</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        <strong>Cause:</strong> User not added to project_members table or lacks appropriate role.<br />
                        <strong>Solution:</strong> Add user to project via Project Settings → Team, or assign appropriate role in Admin panel.
                      </p>
                    </div>

                    <div className="border-l-4 border-yellow-500 pl-4">
                      <h4 className="font-semibold text-foreground">Assessment Emails Not Sending</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        <strong>Cause:</strong> RESEND_API_KEY not configured or invalid.<br />
                        <strong>Solution:</strong> Verify the RESEND_API_KEY secret is properly configured in Lovable Cloud settings.
                      </p>
                    </div>

                    <div className="border-l-4 border-yellow-500 pl-4">
                      <h4 className="font-semibold text-foreground">AI Chat Returns Errors</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        <strong>Cause:</strong> Edge function timeout or API rate limits.<br />
                        <strong>Solution:</strong> Check edge function logs for specific errors. May need to retry or reduce request complexity.
                      </p>
                    </div>

                    <div className="border-l-4 border-yellow-500 pl-4">
                      <h4 className="font-semibold text-foreground">Data Not Loading</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        <strong>Cause:</strong> RLS policy blocking access or network issues.<br />
                        <strong>Solution:</strong> Verify user has appropriate role. Check browser console for specific error messages.
                      </p>
                    </div>

                    <div className="border-l-4 border-yellow-500 pl-4">
                      <h4 className="font-semibold text-foreground">PDF Export Fails</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        <strong>Cause:</strong> Browser blocking downloads or memory constraints.<br />
                        <strong>Solution:</strong> Ensure pop-up blocker allows downloads. Try with fewer data items or in incognito mode.
                      </p>
                    </div>

                    <div className="border-l-4 border-yellow-500 pl-4">
                      <h4 className="font-semibold text-foreground">Session Expired Unexpectedly</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        <strong>Cause:</strong> JWT token expired without refresh.<br />
                        <strong>Solution:</strong> User should log in again. If persistent, check for browser extensions blocking cookies.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">Support Contact</h4>
                    <p className="text-sm text-muted-foreground">
                      For issues not covered here, contact the platform administrator or check the 
                      Lovable documentation for additional guidance.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Footer for PDF */}
            <div className="text-center pt-8 border-t border-border mt-8">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} aXet Consult. All rights reserved.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Generated on {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
