import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Trash2, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ImportedItem {
  title: string;
  description: string;
}

interface ImportItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemLabel: string;
  itemLabelPlural: string;
  onImport: (items: ImportedItem[]) => Promise<void>;
}

export function ImportItemsDialog({ open, onOpenChange, itemLabel, itemLabelPlural, onImport }: ImportItemsDialogProps) {
  const [parsedItems, setParsedItems] = useState<ImportedItem[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [titleCol, setTitleCol] = useState<string>("");
  const [descCol, setDescCol] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "map" | "preview">("upload");
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setParsedItems([]);
    setHeaders([]);
    setTitleCol("");
    setDescCol("");
    setRawRows([]);
    setStep("upload");
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  const parseCSV = (content: string) => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) {
      toast.error("CSV must have a header row and at least one data row");
      return;
    }

    const headerLine = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
    setHeaders(headerLine);

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
      if (values.every(v => !v)) continue;
      const row: Record<string, string> = {};
      headerLine.forEach((h, idx) => { row[h] = values[idx] || ""; });
      rows.push(row);
    }

    if (rows.length === 0) {
      toast.error("No valid rows found");
      return;
    }

    setRawRows(rows);

    // Auto-detect columns
    const lowerHeaders = headerLine.map(h => h.toLowerCase());
    const titleIdx = lowerHeaders.findIndex(h => ["title", "name", "use case", "use_case", "item", "option", "process"].includes(h));
    const descIdx = lowerHeaders.findIndex(h => ["description", "desc", "details", "summary", "notes"].includes(h));

    if (titleIdx !== -1) setTitleCol(headerLine[titleIdx]);
    if (descIdx !== -1) setDescCol(headerLine[descIdx]);

    setStep("map");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => parseCSV(ev.target?.result as string);
    reader.readAsText(file);
  };

  const applyMapping = () => {
    if (!titleCol) {
      toast.error("Please select the column for the title/name");
      return;
    }
    const mapped = rawRows
      .filter(row => row[titleCol]?.trim())
      .map(row => ({
        title: row[titleCol].trim(),
        description: descCol ? (row[descCol]?.trim() || "") : "",
      }));

    // Deduplicate
    const seen = new Set<string>();
    const unique = mapped.filter(item => {
      const key = item.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (unique.length < mapped.length) {
      toast.warning(`Removed ${mapped.length - unique.length} duplicate(s)`);
    }

    setParsedItems(unique);
    setStep("preview");
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      await onImport(parsedItems);
      toast.success(`Imported ${parsedItems.length} ${parsedItems.length === 1 ? itemLabel.toLowerCase() : itemLabelPlural.toLowerCase()}`);
      handleClose();
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  const removeItem = (idx: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== idx));
  };

  const downloadTemplate = () => {
    const csv = `title,description\nAutomated Invoice Processing,AI-driven invoice matching and approval\nPredictive Maintenance,Using sensor data to predict equipment failures\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${itemLabelPlural.toLowerCase().replace(/\s+/g, "_")}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => v ? onOpenChange(true) : handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import {itemLabelPlural} from CSV</DialogTitle>
          <DialogDescription>Upload a CSV file to bulk-add {itemLabelPlural.toLowerCase()}</DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Your CSV should have columns for <strong>title/name</strong> (required) and <strong>description</strong> (optional).
              </AlertDescription>
            </Alert>
            <Button variant="outline" onClick={downloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Download Template
            </Button>
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground">CSV files only</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </div>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Found {rawRows.length} rows with {headers.length} columns. Map your columns below:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{itemLabel} Name Column *</Label>
                <Select value={titleCol} onValueChange={setTitleCol}>
                  <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
                  <SelectContent>
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description Column (optional)</Label>
                <Select value={descCol || "__none__"} onValueChange={(v) => setDescCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {headers.filter(h => h !== titleCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setStep("upload"); setRawRows([]); setHeaders([]); }}>Back</Button>
              <Button onClick={applyMapping} disabled={!titleCol}>Continue</Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            <p className="text-sm text-muted-foreground">{parsedItems.length} {parsedItems.length === 1 ? itemLabel.toLowerCase() : itemLabelPlural.toLowerCase()} ready to import</p>
            {parsedItems.length === 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No valid items to import. Go back and check your column mapping.</AlertDescription>
              </Alert>
            )}
            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.description || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("map")}>Back</Button>
              <Button onClick={handleImport} disabled={importing || parsedItems.length === 0}>
                {importing ? "Importing..." : `Import ${parsedItems.length} ${parsedItems.length === 1 ? itemLabel : itemLabelPlural}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
