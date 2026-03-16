import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Props {
  dashboard: any;
  entities: any[];
  dimensions: string[];
  useCases: any[];
  onImport: (entities: any[], useCases: any[]) => Promise<void>;
}

export function DashboardDataTab({ dashboard, entities, dimensions, useCases, onImport }: Props) {
  const [importing, setImporting] = useState(false);

  const handleDownload = () => {
    const wb = XLSX.utils.book_new();

    // Entities sheet
    const entityRows = entities.map(e => ({
      Name: e.name,
      Region: e.region || "",
      "Overall Score": Number(e.overall_score),
      Tier: e.tier || "",
      Description: e.description || "",
      "Investment Level": e.investment_level || "",
      "AI Leader": e.ai_leader || "",
      Tags: ((e.tags as string[]) || []).join(", "),
      "Key Use Cases": ((e.key_use_cases as string[]) || []).join(", "),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(entityRows), "Entities");

    // Dimension scores matrix
    const matrixRows = entities.map(e => {
      const row: any = { Entity: e.name };
      dimensions.forEach(dim => {
        row[dim] = (e.dimension_scores || {})[dim] || 0;
      });
      return row;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matrixRows), "Scores Matrix");

    // Tech stacks
    const techRows: any[] = [];
    entities.forEach(e => {
      ((e.tech_stack as any[]) || []).forEach(t => {
        techRows.push({ Entity: e.name, "Tech Name": t.name, Category: t.cat || "", Description: t.desc || "" });
      });
    });
    if (techRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(techRows), "Tech Stacks");

    // Use cases
    if (useCases.length) {
      const ucRows = useCases.map((uc: any) => ({
        ID: uc.id,
        Title: uc.title,
        Domain: uc.domain,
        "Agentic Level": uc.agenticLevel,
        Description: uc.description,
        Challenge: uc.challenge,
        Solution: uc.solution,
        Benefits: uc.benefits,
        "Key AI Tasks": uc.keyAiTasks,
        Adopters: (uc.adopters || []).join(", "),
        Value: uc.value,
        Complexity: uc.complexity,
        "Tech Stack": (uc.techStack || []).join(", "),
        Example: uc.example || "",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ucRows), "Use Cases");
    }

    const filename = `${dashboard.title.replace(/[^a-zA-Z0-9]/g, "_")}_data.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success("Data exported successfully");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab);

      // Parse entities
      const entSheet = wb.Sheets["Entities"];
      const matrixSheet = wb.Sheets["Scores Matrix"];
      const techSheet = wb.Sheets["Tech Stacks"];
      const parsedEntities: any[] = [];

      if (entSheet) {
        const rows = XLSX.utils.sheet_to_json<any>(entSheet);
        const matrixRows = matrixSheet ? XLSX.utils.sheet_to_json<any>(matrixSheet) : [];
        const techRows = techSheet ? XLSX.utils.sheet_to_json<any>(techSheet) : [];

        rows.forEach((r: any) => {
          if (!r.Name) return;
          const matrixRow = matrixRows.find((m: any) => m.Entity === r.Name);
          const dimension_scores: Record<string, number> = {};
          if (matrixRow) {
            Object.keys(matrixRow).forEach(k => { if (k !== "Entity") dimension_scores[k] = Number(matrixRow[k]) || 0; });
          }
          const entityTech = techRows.filter((t: any) => t.Entity === r.Name).map((t: any) => ({
            name: t["Tech Name"], cat: t.Category || "tp-custom", desc: t.Description || "",
          }));

          parsedEntities.push({
            name: r.Name,
            region: r.Region || null,
            overall_score: Number(r["Overall Score"]) || 0,
            tier: r.Tier || null,
            description: r.Description || null,
            investment_level: r["Investment Level"] || null,
            ai_leader: r["AI Leader"] || null,
            tags: r.Tags ? String(r.Tags).split(",").map((t: string) => t.trim()) : [],
            key_use_cases: r["Key Use Cases"] ? String(r["Key Use Cases"]).split(",").map((t: string) => t.trim()) : [],
            dimension_scores,
            tech_stack: entityTech,
          });
        });
      }

      // Parse use cases
      const ucSheet = wb.Sheets["Use Cases"];
      const parsedUCs: any[] = [];
      if (ucSheet) {
        const rows = XLSX.utils.sheet_to_json<any>(ucSheet);
        rows.forEach((r: any) => {
          if (!r.Title) return;
          parsedUCs.push({
            id: r.ID || `UC${parsedUCs.length + 1}`,
            title: r.Title,
            domain: r.Domain || "General",
            agenticLevel: Number(r["Agentic Level"]) || 1,
            description: r.Description || "",
            challenge: r.Challenge || "",
            solution: r.Solution || "",
            benefits: r.Benefits || "",
            keyAiTasks: r["Key AI Tasks"] || "",
            adopters: r.Adopters ? String(r.Adopters).split(",").map((t: string) => t.trim()) : [],
            value: Number(r.Value) || 0,
            complexity: Number(r.Complexity) || 0,
            techStack: r["Tech Stack"] ? String(r["Tech Stack"]).split(",").map((t: string) => t.trim()) : [],
            example: r.Example || "",
          });
        });
      }

      await onImport(parsedEntities, parsedUCs);
      toast.success(`Imported ${parsedEntities.length} entities and ${parsedUCs.length} use cases`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-primary">Data Management</h2>
        <p className="text-sm text-muted-foreground mt-1">Import and export dashboard data via Excel for easy data capture and updates</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="enterprise-card rounded-[1.75rem]">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Export Data</h3>
            </div>
            <p className="text-sm text-muted-foreground">Download all entities, scores, tech stacks, and use cases as a multi-sheet Excel workbook.</p>
            <Button onClick={handleDownload} className="w-full">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Download Excel
            </Button>
          </CardContent>
        </Card>

        <Card className="enterprise-card rounded-[1.75rem]">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Import Data</h3>
            </div>
            <p className="text-sm text-muted-foreground">Upload an Excel file to update entities and use cases. Use the exported template as a starting point.</p>
            <div className="relative">
              <Button variant="outline" className="w-full" disabled={importing}>
                {importing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing...</> : <><Upload className="h-4 w-4 mr-2" /> Upload Excel</>}
              </Button>
              <input type="file" accept=".xlsx,.xls" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={importing} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="enterprise-card rounded-[1.75rem]">
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground mb-4">Current Data Summary</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-[1.25rem] bg-primary/5 p-4 text-center">
              <p className="font-display text-2xl text-primary">{entities.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Entities</p>
            </div>
            <div className="rounded-[1.25rem] bg-primary/5 p-4 text-center">
              <p className="font-display text-2xl text-primary">{dimensions.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Dimensions</p>
            </div>
            <div className="rounded-[1.25rem] bg-primary/5 p-4 text-center">
              <p className="font-display text-2xl text-primary">{useCases.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Use Cases</p>
            </div>
            <div className="rounded-[1.25rem] bg-primary/5 p-4 text-center">
              <p className="font-display text-2xl text-primary">
                {entities.length ? Math.round(entities.reduce((s: number, e: any) => s + Number(e.overall_score), 0) / entities.length) : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Avg Score</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
