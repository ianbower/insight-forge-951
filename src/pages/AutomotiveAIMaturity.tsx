import { useState, useCallback } from "react";
import {
  LayoutDashboard, Activity, CheckSquare, Grid3X3, Layers, Download, Share2, FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToPDF } from "@/lib/exportUtils";
import {
  DEFAULT_COMPANIES, DEFAULT_USE_CASES, DEFAULT_DASHBOARD_CONTENT,
  Company, UseCase, DashboardContent,
} from "@/data/automotiveAIData";
import { OverviewView } from "@/components/automotive/OverviewView";
import { MaturityView } from "@/components/automotive/MaturityView";
import { UseCasesView } from "@/components/automotive/UseCasesView";
import { HeatmapView } from "@/components/automotive/HeatmapView";
import { TechStackView } from "@/components/automotive/TechStackView";
import { CompanyDetailSheet } from "@/components/automotive/CompanyDetailSheet";
import { ExcelImportExport } from "@/components/automotive/ExcelImportExport";

type ViewId = 'overview' | 'maturity' | 'usecases' | 'heatmap' | 'techstack' | 'data';

const VIEWS: { id: ViewId; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'maturity', label: 'AI Maturity', icon: Activity },
  { id: 'usecases', label: 'Use Cases', icon: CheckSquare },
  { id: 'heatmap', label: 'Heatmap', icon: Grid3X3 },
  { id: 'techstack', label: 'Tech Stacks', icon: Layers },
  { id: 'data', label: 'Data', icon: FileSpreadsheet },
];

export default function AutomotiveAIMaturity() {
  const [currentView, setCurrentView] = useState<ViewId>('overview');
  const [companies, setCompanies] = useState<Company[]>(DEFAULT_COMPANIES);
  const [useCases, setUseCases] = useState<UseCase[]>(DEFAULT_USE_CASES);
  const [content, setContent] = useState<DashboardContent>(DEFAULT_DASHBOARD_CONTENT);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const selectedCompany = selectedCompanyId ? companies.find(c => c.id === selectedCompanyId) || null : null;
  const domainsCount = new Set(useCases.map(u => u.domain)).size;

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportToPDF("automotive-ai-dashboard-content", "Automotive AI Maturity Dashboard");
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: "Automotive AI Maturity Dashboard", url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const handleImport = useCallback((newCompanies: Company[], newUseCases: UseCase[], newContent: DashboardContent) => {
    setCompanies(newCompanies);
    setUseCases(newUseCases);
    setContent(newContent);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* View tabs */}
        <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1 overflow-x-auto">
          {VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setCurrentView(v.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                currentView === v.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <v.icon className="h-3.5 w-3.5" />
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            <Download className="h-3.5 w-3.5" />
            {exporting ? "Exporting…" : "PDF"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleShare}>
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
        </div>
      </div>

      {/* Content */}
      <div id="automotive-ai-dashboard-content">
        {currentView === 'overview' && (
          <OverviewView
            companies={companies}
            useCasesCount={useCases.length}
            domainsCount={domainsCount}
            content={content}
            onSwitchView={(v) => setCurrentView(v as ViewId)}
          />
        )}
        {currentView === 'maturity' && (
          <MaturityView companies={companies} onSelectCompany={setSelectedCompanyId} />
        )}
        {currentView === 'usecases' && (
          <UseCasesView useCases={useCases} />
        )}
        {currentView === 'heatmap' && (
          <HeatmapView companies={companies} useCases={useCases} />
        )}
        {currentView === 'techstack' && (
          <TechStackView companies={companies} onSelectCompany={setSelectedCompanyId} />
        )}
        {currentView === 'data' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl text-primary">Data Management</h2>
              <p className="text-sm text-muted-foreground mt-1">Import and export dashboard data via Excel for easy data capture and updates</p>
            </div>
            <ExcelImportExport
              companies={companies}
              useCases={useCases}
              content={content}
              onImport={handleImport}
            />
          </div>
        )}
      </div>

      {/* Company Detail Sheet */}
      <CompanyDetailSheet
        company={selectedCompany}
        useCases={useCases}
        open={!!selectedCompanyId}
        onClose={() => setSelectedCompanyId(null)}
      />
    </div>
  );
}
