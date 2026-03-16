import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { Company, UseCase, DashboardContent, DIM_KEYS, DIM_NAMES, DOMAINS } from "@/data/automotiveAIData";
import { toast } from "@/hooks/use-toast";

interface Props {
  companies: Company[];
  useCases: UseCase[];
  content: DashboardContent;
  onImport: (companies: Company[], useCases: UseCase[], content: DashboardContent) => void;
}

export function ExcelImportExport({ companies, useCases, content, onImport }: Props) {
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Dashboard Info
    const infoData = [
      ['Field', 'Value'],
      ['Overview Title', content.overviewTitle],
      ['Overview Subtitle', content.overviewSubtitle],
      ['Hero Eyebrow', content.heroEyebrow],
      ['Hero Title', content.heroTitle],
      ['Hero Copy', content.heroCopy],
      ['Hero Stat 1', content.heroStat1],
      ['Hero Stat 2', content.heroStat2],
      ['Hero Stat 3', content.heroStat3],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(infoData);
    ws1['!cols'] = [{ wch: 20 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Dashboard Info');

    // Sheet 2: Companies
    const companyHeaders = ['ID', 'Name', 'Region', 'Overall Score', 'Tier', 'Description',
      'Autonomy', 'Manufacturing', 'Software', 'Supply Chain', 'Customer', 'Sustainability',
      'Tags', 'Investment Level', 'AI Leader', 'Key Use Cases', 'Sources'];
    const companyRows = companies.map(c => [
      c.id, c.name, c.region, c.overallScore, c.tier, c.description,
      c.dims.autonomy, c.dims.manufacturing, c.dims.software, c.dims.supply_chain, c.dims.customer, c.dims.sustainability,
      c.tags.join('; '), c.investmentLevel, c.aiLeader, c.keyUseCases.join('; '),
      c.sources.map(s => `${s.label}: ${s.url}`).join('; '),
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([companyHeaders, ...companyRows]);
    ws2['!cols'] = companyHeaders.map((_, i) => ({ wch: i === 5 ? 60 : i >= 15 ? 50 : 18 }));
    XLSX.utils.book_append_sheet(wb, ws2, 'Companies');

    // Sheet 3: Tech Stacks
    const techHeaders = ['Company', 'Tech Name', 'Category', 'Description'];
    const techRows = companies.flatMap(c =>
      c.techStack.map(t => [c.name, t.name, t.cat, t.desc])
    );
    const ws3 = XLSX.utils.aoa_to_sheet([techHeaders, ...techRows]);
    ws3['!cols'] = techHeaders.map(() => ({ wch: 30 }));
    XLSX.utils.book_append_sheet(wb, ws3, 'Tech Stacks');

    // Sheet 4: Use Cases
    const ucHeaders = ['ID', 'Title', 'Domain', 'Agentic Level', 'Description', 'Challenge', 'Solution',
      'Benefits', 'Key AI Tasks', 'Adopters', 'Value', 'Complexity', 'Tech Stack', 'Example'];
    const ucRows = useCases.map(uc => [
      uc.id, uc.title, uc.domain, uc.agenticLevel, uc.description, uc.challenge, uc.solution,
      uc.benefits, uc.keyAiTasks, uc.adopters.join('; '), uc.value, uc.complexity,
      uc.techStack.join('; '), uc.example,
    ]);
    const ws4 = XLSX.utils.aoa_to_sheet([ucHeaders, ...ucRows]);
    ws4['!cols'] = ucHeaders.map((_, i) => ({ wch: [4, 5, 6, 7, 13].includes(i) ? 50 : 20 }));
    XLSX.utils.book_append_sheet(wb, ws4, 'Use Cases');

    XLSX.writeFile(wb, 'Automotive_AI_Maturity_Dashboard.xlsx');
    toast({ title: "Exported", description: "Excel file downloaded successfully." });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);

      // Parse Dashboard Info
      const infoSheet = wb.Sheets['Dashboard Info'];
      const newContent = { ...content };
      if (infoSheet) {
        const infoRows = XLSX.utils.sheet_to_json<string[]>(infoSheet, { header: 1 });
        const fieldMap: Record<string, keyof DashboardContent> = {
          'Overview Title': 'overviewTitle', 'Overview Subtitle': 'overviewSubtitle',
          'Hero Eyebrow': 'heroEyebrow', 'Hero Title': 'heroTitle', 'Hero Copy': 'heroCopy',
          'Hero Stat 1': 'heroStat1', 'Hero Stat 2': 'heroStat2', 'Hero Stat 3': 'heroStat3',
        };
        infoRows.slice(1).forEach(row => {
          const key = fieldMap[row[0]];
          if (key && row[1]) newContent[key] = String(row[1]);
        });
      }

      // Parse Companies
      const compSheet = wb.Sheets['Companies'];
      let newCompanies = companies;
      if (compSheet) {
        const rows = XLSX.utils.sheet_to_json<any>(compSheet);
        newCompanies = rows.map((r: any) => ({
          id: r['ID'] || r['id'] || '',
          name: r['Name'] || '',
          region: r['Region'] || '',
          overallScore: Number(r['Overall Score']) || 0,
          tier: r['Tier'] || 'Developer',
          description: r['Description'] || '',
          dims: {
            autonomy: Number(r['Autonomy']) || 0,
            manufacturing: Number(r['Manufacturing']) || 0,
            software: Number(r['Software']) || 0,
            supply_chain: Number(r['Supply Chain']) || 0,
            customer: Number(r['Customer']) || 0,
            sustainability: Number(r['Sustainability']) || 0,
          },
          tags: (r['Tags'] || '').split(';').map((t: string) => t.trim()).filter(Boolean),
          investmentLevel: r['Investment Level'] || '',
          aiLeader: r['AI Leader'] || '',
          keyUseCases: (r['Key Use Cases'] || '').split(';').map((t: string) => t.trim()).filter(Boolean),
          techStack: [], // Will be populated from Tech Stacks sheet
          sources: (r['Sources'] || '').split(';').map((s: string) => {
            const parts = s.trim().split(': ');
            return parts.length >= 2 ? { label: parts[0], url: parts.slice(1).join(': ') } : null;
          }).filter(Boolean),
        }));

        // Parse Tech Stacks and attach to companies
        const techSheet = wb.Sheets['Tech Stacks'];
        if (techSheet) {
          const techRows = XLSX.utils.sheet_to_json<any>(techSheet);
          techRows.forEach((t: any) => {
            const comp = newCompanies.find(c => c.name === t['Company']);
            if (comp) {
              comp.techStack.push({ name: t['Tech Name'] || '', cat: t['Category'] || 'tp-custom', desc: t['Description'] || '' });
            }
          });
        }
      }

      // Parse Use Cases
      const ucSheet = wb.Sheets['Use Cases'];
      let newUseCases = useCases;
      if (ucSheet) {
        const rows = XLSX.utils.sheet_to_json<any>(ucSheet);
        newUseCases = rows.map((r: any) => ({
          id: r['ID'] || '',
          title: r['Title'] || '',
          domain: r['Domain'] || '',
          agenticLevel: Number(r['Agentic Level']) || 1,
          description: r['Description'] || '',
          challenge: r['Challenge'] || '',
          solution: r['Solution'] || '',
          benefits: r['Benefits'] || '',
          keyAiTasks: r['Key AI Tasks'] || '',
          adopters: (r['Adopters'] || '').split(';').map((t: string) => t.trim()).filter(Boolean),
          value: Number(r['Value']) || 0,
          complexity: Number(r['Complexity']) || 0,
          techStack: (r['Tech Stack'] || '').split(';').map((t: string) => t.trim()).filter(Boolean),
          example: r['Example'] || '',
        }));
      }

      onImport(newCompanies, newUseCases, newContent);
      toast({ title: "Imported", description: `Loaded ${newCompanies.length} companies and ${newUseCases.length} use cases.` });
    } catch (err) {
      console.error(err);
      toast({ title: "Import failed", description: "Could not parse the Excel file. Please check the format.", variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Card className="enterprise-card rounded-[1.75rem]">
      <CardHeader className="pb-3">
        <CardTitle className="text-primary text-lg flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Data Import / Export
        </CardTitle>
        <p className="text-xs text-muted-foreground">Download the current dashboard data as an Excel workbook, or upload a modified version to update the dashboard.</p>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing} className="gap-2">
          <Upload className="h-4 w-4" />
          {importing ? 'Importing...' : 'Import from Excel'}
        </Button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
      </CardContent>
    </Card>
  );
}
