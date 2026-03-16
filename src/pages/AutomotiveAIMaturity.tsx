import { useState } from "react";
import {
  ArrowUpRight,
  BrainCircuit,
  CarFront,
  Download,
  Factory,
  GaugeCircle,
  GitBranch,
  Link2,
  Radar,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportToPDF } from "@/lib/exportUtils";

type MaturityBand = "Foundational" | "Scaling" | "Leading";

interface Capability {
  name: string;
  score: number;
  owner: string;
  summary: string;
}

const capabilities: Capability[] = [
  {
    name: "Strategy and value case",
    score: 4.2,
    owner: "Executive Steering Group",
    summary: "Clear AI priorities are tied to customer experience, engineering efficiency, and aftersales growth.",
  },
  {
    name: "Connected vehicle data",
    score: 3.8,
    owner: "Digital Platform Office",
    summary: "Vehicle, dealer, and service data are available, but product telemetry is not yet consistently productized.",
  },
  {
    name: "Manufacturing intelligence",
    score: 3.1,
    owner: "Operations Excellence",
    summary: "Pilot use cases exist for quality and maintenance, with uneven deployment across plants.",
  },
  {
    name: "Product engineering copilots",
    score: 2.9,
    owner: "Engineering Transformation",
    summary: "Teams are experimenting with AI-assisted design and software delivery but lack a shared delivery model.",
  },
  {
    name: "Governance and trust",
    score: 4.0,
    owner: "Risk and Compliance",
    summary: "Controls, review forums, and policy guardrails exist, creating a strong base for scaling regulated use cases.",
  },
  {
    name: "Workforce enablement",
    score: 3.4,
    owner: "HR and Capability Lead",
    summary: "Upskilling programs are in place, though role-based adoption plans still need better measurement.",
  },
];

const initiatives = [
  "Launch dealer and aftersales copilots in two priority markets.",
  "Stand up a reusable manufacturing AI pattern for predictive quality and maintenance.",
  "Create a model governance intake for safety-critical and customer-facing use cases.",
];

const maturityBandFor = (score: number): MaturityBand => {
  if (score >= 4) return "Leading";
  if (score >= 3) return "Scaling";
  return "Foundational";
};

const averageScore = (
  capabilities.reduce((sum, capability) => sum + capability.score, 0) / capabilities.length
).toFixed(1);

const scoreWidth = (score: number) => `${(score / 5) * 100}%`;

export default function AutomotiveAIMaturity() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportToPDF("automotive-ai-maturity-dashboard", "Automotive AI Maturity Dashboard");
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;

    if (navigator.share) {
      await navigator.share({
        title: "Automotive AI maturity dashboard",
        text: "Client-ready automotive AI maturity dashboard",
        url: shareUrl,
      });
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
  };

  return (
    <div className="space-y-6">
      <section className="navy-panel relative overflow-hidden rounded-[2rem] px-6 py-8 text-white sm:px-8">
        <div className="hero-grid absolute inset-0 opacity-25" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
              <CarFront className="h-3.5 w-3.5" />
              Reusable client asset
            </div>
            <div>
              <h1 className="font-display text-4xl text-white sm:text-5xl">
                Automotive AI maturity dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-base text-white/72 sm:text-lg">
                We assess readiness across product engineering, manufacturing, connected data, and governance so teams can scale AI with confidence.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4" />
              {exporting ? "Exporting..." : "Export PDF"}
            </Button>
            <Button variant="outline" onClick={handleShare} className="border-white/20 bg-white/5 text-white hover:bg-white hover:text-sidebar-background">
              <Share2 className="h-4 w-4" />
              Share link
            </Button>
          </div>
        </div>
      </section>

      <div id="automotive-ai-maturity-dashboard" className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
          <Card className="enterprise-card rounded-[1.75rem] border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Client snapshot</p>
                  <CardTitle className="mt-2 text-primary">Illustrative OEM benchmark</CardTitle>
                </div>
                <Badge className="bg-primary text-primary-foreground hover:bg-primary">Average {averageScore}/5</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] bg-primary/5 p-5">
                <GaugeCircle className="h-6 w-6 text-primary" />
                <p className="mt-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">Maturity band</p>
                <p className="mt-2 font-display text-3xl text-primary">{maturityBandFor(Number(averageScore))}</p>
              </div>
              <div className="rounded-[1.5rem] bg-primary/5 p-5">
                <Factory className="h-6 w-6 text-primary" />
                <p className="mt-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">Priority domain</p>
                <p className="mt-2 font-display text-3xl text-primary">Manufacturing AI</p>
              </div>
              <div className="rounded-[1.5rem] bg-primary/5 p-5">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <p className="mt-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">Strongest signal</p>
                <p className="mt-2 font-display text-3xl text-primary">Governance</p>
              </div>
            </CardContent>
          </Card>

          <Card className="navy-panel rounded-[1.75rem] border-white/10 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-white">Why this asset matters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-white/74">
              <p>
                We can use this page as a repeatable executive readout, then tailor the data, recommendations, and branding details for each client engagement.
              </p>
              <div className="grid gap-3">
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-white">
                    <Radar className="h-4 w-4 text-accent" />
                    Maturity signals
                  </div>
                  <p className="mt-2">Benchmark strategic readiness, operational adoption, and governance strength in one view.</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-white">
                    <GitBranch className="h-4 w-4 text-accent" />
                    Action plan
                  </div>
                  <p className="mt-2">Turn assessment outputs into a sequenced roadmap for plants, engineering, and commercial teams.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="enterprise-card rounded-[1.75rem] border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-primary">Capability scoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {capabilities.map((capability) => (
                <div key={capability.name} className="rounded-[1.5rem] border border-border/70 bg-white/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{capability.name}</p>
                        <Badge variant="outline">{maturityBandFor(capability.score)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{capability.summary}</p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="font-display text-3xl text-primary">{capability.score.toFixed(1)}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{capability.owner}</p>
                    </div>
                  </div>
                  <div className="mt-4 h-3 rounded-full bg-primary/10">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: scoreWidth(capability.score) }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="enterprise-card rounded-[1.75rem] border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-primary">Recommended next moves</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {initiatives.map((initiative) => (
                  <div key={initiative} className="flex gap-3 rounded-[1.25rem] bg-primary/5 p-4">
                    <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm text-foreground">{initiative}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="navy-panel rounded-[1.75rem] border-white/10 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-white">Packaging options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-white/74">
                <div className="flex items-start gap-3 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <p>Keep this as a web-based dashboard for live workshops and steering committee reviews.</p>
                </div>
                <div className="flex items-start gap-3 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <p>Export to PDF for executive readouts or adapt the same data into PowerPoint and proposal assets.</p>
                </div>
                <div className="flex items-start gap-3 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <p>Connect the page to assessment data later so the asset can be generated automatically per client.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
