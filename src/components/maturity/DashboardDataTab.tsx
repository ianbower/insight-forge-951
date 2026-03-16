import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Entity {
  id: string;
  name: string;
  overall_score: number;
  tier: string | null;
  description: string | null;
  region: string | null;
  dimension_scores: Record<string, number>;
  tags: string[];
  investment_level: string | null;
  ai_leader: string | null;
}

interface Capability {
  id: string;
  name: string;
  score: number;
  target_score: number | null;
  source_type: string;
  owner: string | null;
  summary: string | null;
}

interface Props {
  dashboard: any;
  entities: Entity[];
  capabilities: Capability[];
  onImport: (entities: Partial<Entity>[], capabilities: Partial<Capability>[]) => Promise<void>;
}

export function DashboardDataTab({ dashboard, entities, capabilities, onImport }: Props) {
  const [importing, setImporting] = useState(false);

  const handleDownload = () => {
    const wb = XLSX.utils.book_new();

    // Dashboard metadata sheet
    const metaRows = [
      { Field: "Title", Value: dashboard.title },
      { Field: "Subtitle", Value: dashboard.subtitle || "" },
      { Field: "Topic", Value: dashboard.topic },
      { Field: "Industry", Value: dashboard.industry || "" },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(metaRows), "Dashboard");

    // Capabilities/Dimensions sheet
    const capRows = capabilities.map(c => ({
      Name: c.name,
      Score: Number(c.score),
      "Target Score": c.target_score ? Number(c.target_score) : "",
      "Source Type": c.source_type,
      Owner: c.owner || "",
      Summary: c.summary || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(capRows), "Dimensions");

    // Entities sheet
    if (entities.length > 0) {
      const entityRows = entities.map(e => ({
        Name: e.name,
        Region: e.region || "",
        "Overall Score": Number(e.overall_score),
        Tier: e.tier || "",
        Description: e.description || "",
        "Investment Level": e.investment_level || "",
        "AI Leader": e.ai_leader || "",
        Tags: (e.tags || []).join(", "),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(entityRows), "Entities");

      // Entity × Dimension scores matrix
      const dimNames = capabilities.map(c => c.name);
      const matrixRows = entities.map(e => {
        const row: any = { Entity: e.name };
        dimNames.forEach(dim => {
          const dims = e.dimension_scores || {};
          row[dim] = dims[dim] || 0;
        });
        return row;
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matrixRows), "Scores Matrix");
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

      // Parse dimensions
      const dimsSheet = wb.Sheets["Dimensions"];
      const parsedCaps: Partial<Capability>[] = [];
      if (dimsSheet) {
        const rows = XLSX.utils.sheet_to_json<any>(dimsSheet);
        rows.forEach((r: any) => {
          if (r.Name) {
            parsedCaps.push({
              name: r.Name,
              score: Number(r.Score) || 0,
              target_score: r["Target Score"] ? Number(r["Target Score"]) : null,
              source_type: r["Source Type"] || "ai_research",
              owner: r.Owner || null,
              summary: r.Summary || null,
            });
          }
        });
      }

      // Parse entities
      const entSheet = wb.Sheets["Entities"];
      const parsedEntities: Partial<Entity>[] = [];
      if (entSheet) {
        const rows = XLSX.utils.sheet_to_json<any>(entSheet);
        const matrixSheet = wb.Sheets["Scores Matrix"];
        const matrixRows = matrixSheet ? XLSX.utils.sheet_to_json<any>(matrixSheet) : [];

        rows.forEach((r: any) => {
          if (r.Name) {
            // Find scores from matrix
            const matrixRow = matrixRows.find((m: any) => m.Entity === r.Name);
            const dimension_scores: Record<string, number> = {};
            if (matrixRow) {
              Object.keys(matrixRow).forEach(k => {
                if (k !== "Entity") dimension_scores[k] = Number(matrixRow[k]) || 0;
              });
            }

            parsedEntities.push({
              name: r.Name,
              region: r.Region || null,
              overall_score: Number(r["Overall Score"]) || 0,
              tier: r.Tier || null,
              description: r.Description || null,
              investment_level: r["Investment Level"] || null,
              ai_leader: r["AI Leader"] || null,
              tags: r.Tags ? String(r.Tags).split(",").map((t: string) => t.trim()) : [],
              dimension_scores,
            });
          }
        });
      }

      await onImport(parsedEntities, parsedCaps);
      toast.success(`Imported ${parsedEntities.length} entities and ${parsedCaps.length} dimensions`);
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
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="enterprise-card rounded-[1.75rem]">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Download className="h-5 w-5" /> Export Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download all dashboard data as a multi-sheet Excel workbook including dimensions, entities, and score matrices.
            </p>
            <Button onClick={handleDownload} className="w-full">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Download Excel
            </Button>
          </CardContent>
        </Card>

        <Card className="enterprise-card rounded-[1.75rem]">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Upload className="h-5 w-5" /> Import Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload an Excel file to update dimensions and entities. Use the exported template as a starting point.
            </p>
            <div className="relative">
              <Button variant="outline" className="w-full" disabled={importing}>
                {importing ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Upload Excel</>
                )}
              </Button>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={importing}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data summary */}
      <Card className="enterprise-card rounded-[1.75rem]">
        <CardHeader>
          <CardTitle className="text-primary">Current Data Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.25rem] bg-primary/5 p-4 text-center">
              <p className="font-display text-2xl text-primary">{capabilities.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Dimensions</p>
            </div>
            <div className="rounded-[1.25rem] bg-primary/5 p-4 text-center">
              <p className="font-display text-2xl text-primary">{entities.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Entities</p>
            </div>
            <div className="rounded-[1.25rem] bg-primary/5 p-4 text-center">
              <p className="font-display text-2xl text-primary">
                {entities.length ? (entities.reduce((s, e) => s + Number(e.overall_score), 0) / entities.length).toFixed(0) : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Avg Score</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
