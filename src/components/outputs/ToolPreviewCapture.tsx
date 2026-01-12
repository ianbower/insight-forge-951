import { useRef, useState } from "react";
import { Camera, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";

interface ToolPreviewCaptureProps {
  toolName: string;
  toolData: any;
  onCapture: (imageData: string) => void;
}

export function ToolPreviewCapture({ toolName, toolData, onCapture }: ToolPreviewCaptureProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState(false);

  const handleCapture = async () => {
    if (!previewRef.current) return;
    
    setCapturing(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imageData = canvas.toDataURL("image/png");
      onCapture(imageData);
      setCaptured(true);
      setTimeout(() => setCaptured(false), 2000);
    } catch (error) {
      console.error("Failed to capture:", error);
    } finally {
      setCapturing(false);
    }
  };

  const renderToolPreview = () => {
    if (!toolData) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          No data available
        </div>
      );
    }

    // SWOT Analysis
    if (toolName === "SWOT Analysis") {
      const sections = [
        { key: "strengths", label: "Strengths", color: "bg-green-100 border-green-300" },
        { key: "weaknesses", label: "Weaknesses", color: "bg-red-100 border-red-300" },
        { key: "opportunities", label: "Opportunities", color: "bg-blue-100 border-blue-300" },
        { key: "threats", label: "Threats", color: "bg-yellow-100 border-yellow-300" },
      ];

      return (
        <div className="grid grid-cols-2 gap-2 p-3">
          {sections.map(({ key, label, color }) => (
            <div key={key} className={cn("rounded-lg border-2 p-2", color)}>
              <h4 className="text-xs font-bold text-gray-700 mb-1">{label}</h4>
              <div className="space-y-0.5">
                {(toolData[key] || []).slice(0, 4).map((item: any, i: number) => (
                  <div key={i} className="text-[10px] text-gray-600 truncate">
                    • {item.content || item}
                  </div>
                ))}
                {(toolData[key]?.length || 0) === 0 && (
                  <div className="text-[10px] text-gray-400 italic">No items</div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Business Model Canvas
    if (toolName === "Business Model Canvas") {
      const sections = [
        "key-partners", "key-activities", "key-resources", "value-propositions",
        "customer-relationships", "channels", "customer-segments", "cost-structure", "revenue-streams"
      ];
      const labels: Record<string, string> = {
        "key-partners": "Partners",
        "key-activities": "Activities",
        "key-resources": "Resources",
        "value-propositions": "Value Prop",
        "customer-relationships": "Relationships",
        "channels": "Channels",
        "customer-segments": "Segments",
        "cost-structure": "Costs",
        "revenue-streams": "Revenue",
      };

      return (
        <div className="grid grid-cols-5 gap-1 p-2 text-[8px]">
          {sections.slice(0, 5).map((key) => (
            <div key={key} className="bg-slate-100 rounded p-1 min-h-[40px]">
              <div className="font-bold text-gray-700 mb-0.5">{labels[key]}</div>
              {(toolData[key] || []).slice(0, 2).map((item: any, i: number) => (
                <div key={i} className="text-gray-500 truncate">{item.content || item}</div>
              ))}
            </div>
          ))}
          {sections.slice(5).map((key) => (
            <div key={key} className="bg-slate-100 rounded p-1 min-h-[30px]">
              <div className="font-bold text-gray-700 mb-0.5">{labels[key]}</div>
              {(toolData[key] || []).slice(0, 2).map((item: any, i: number) => (
                <div key={i} className="text-gray-500 truncate">{item.content || item}</div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    // 7S Framework
    if (toolName === "7S Framework") {
      const sections = ["strategy", "structure", "systems", "shared-values", "style", "staff", "skills"];
      const colors = ["bg-blue-100", "bg-green-100", "bg-purple-100", "bg-yellow-100", "bg-pink-100", "bg-orange-100", "bg-teal-100"];

      return (
        <div className="grid grid-cols-3 gap-1 p-2">
          {sections.map((key, i) => (
            <div key={key} className={cn("rounded p-1.5", colors[i % colors.length])}>
              <div className="text-[9px] font-bold text-gray-700 capitalize mb-0.5">
                {key.replace("-", " ")}
              </div>
              {(toolData[key] || []).slice(0, 2).map((item: any, j: number) => (
                <div key={j} className="text-[8px] text-gray-600 truncate">
                  {item.content || item}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    // Operating Model Canvas
    if (toolName === "Operating Model Canvas") {
      const sections = ["value-chain", "organization", "information", "suppliers", "management-system", "location"];
      
      return (
        <div className="grid grid-cols-3 gap-1 p-2">
          {sections.map((key) => (
            <div key={key} className="bg-indigo-50 rounded p-1.5 border border-indigo-200">
              <div className="text-[9px] font-bold text-gray-700 capitalize mb-0.5">
                {key.replace("-", " ")}
              </div>
              {(toolData[key] || []).slice(0, 2).map((item: any, i: number) => (
                <div key={i} className="text-[8px] text-gray-600 truncate">
                  {item.content || item}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    // Transformation Roadmap
    if (toolName === "Transformation Roadmap") {
      const tracks = toolData.tracks || ["Strategy", "Technology", "People", "Process"];
      const items = toolData.items || [];

      return (
        <div className="p-2">
          <div className="space-y-1">
            {tracks.slice(0, 4).map((track: string, i: number) => (
              <div key={track} className="flex items-center gap-2">
                <div className="w-16 text-[8px] font-medium text-gray-600 truncate">{track}</div>
                <div className="flex-1 h-4 bg-slate-100 rounded relative overflow-hidden">
                  {items.filter((item: any) => item.track === track).slice(0, 3).map((item: any, j: number) => {
                    const colors = ["bg-blue-400", "bg-emerald-400", "bg-purple-400", "bg-orange-400"];
                    const left = (item.startMonth / 12) * 100;
                    const width = (item.duration / 12) * 100;
                    return (
                      <div
                        key={j}
                        className={cn("absolute top-0.5 h-3 rounded text-[6px] text-white px-1 truncate", colors[i % 4])}
                        style={{ left: `${left}%`, width: `${Math.max(width, 15)}%` }}
                      >
                        {item.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Generic fallback - show data as structured list
    return (
      <div className="p-3 text-[10px]">
        <div className="font-bold text-gray-700 mb-2">{toolName}</div>
        {Object.entries(toolData).slice(0, 6).map(([key, value]) => (
          <div key={key} className="mb-1">
            <span className="font-medium text-gray-600 capitalize">{key.replace(/[-_]/g, " ")}: </span>
            <span className="text-gray-500">
              {Array.isArray(value) 
                ? `${value.length} items`
                : typeof value === "object"
                ? JSON.stringify(value).slice(0, 50)
                : String(value).slice(0, 50)
              }
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Preview Container */}
      <div
        ref={previewRef}
        className="bg-white rounded-lg border shadow-sm overflow-hidden"
        style={{ minHeight: 160 }}
      >
        <div className="bg-slate-50 border-b px-3 py-1.5">
          <h3 className="text-xs font-semibold text-gray-700">{toolName}</h3>
        </div>
        {renderToolPreview()}
      </div>

      {/* Capture Button */}
      <Button
        variant={captured ? "default" : "outline"}
        size="sm"
        onClick={handleCapture}
        disabled={capturing}
        className={cn("w-full gap-2", captured && "bg-green-600 hover:bg-green-700")}
      >
        {capturing ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Capturing...
          </>
        ) : captured ? (
          <>
            <Check className="h-3 w-3" />
            Captured!
          </>
        ) : (
          <>
            <Camera className="h-3 w-3" />
            Capture Screenshot
          </>
        )}
      </Button>
    </div>
  );
}
