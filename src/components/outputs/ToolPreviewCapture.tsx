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
        useCORS: true,
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

    // SWOT Analysis - Improved layout
    if (toolName === "SWOT Analysis") {
      const sections = [
        { key: "strengths", label: "Strengths", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", textColor: "text-emerald-800", labelBg: "bg-emerald-100" },
        { key: "weaknesses", label: "Weaknesses", bgColor: "bg-rose-50", borderColor: "border-rose-200", textColor: "text-rose-800", labelBg: "bg-rose-100" },
        { key: "opportunities", label: "Opportunities", bgColor: "bg-sky-50", borderColor: "border-sky-200", textColor: "text-sky-800", labelBg: "bg-sky-100" },
        { key: "threats", label: "Threats", bgColor: "bg-amber-50", borderColor: "border-amber-200", textColor: "text-amber-800", labelBg: "bg-amber-100" },
      ];

      return (
        <div className="grid grid-cols-2 gap-3 p-4">
          {sections.map(({ key, label, bgColor, borderColor, textColor, labelBg }) => (
            <div key={key} className={cn("rounded-lg border-2 p-3 min-h-[100px]", bgColor, borderColor)}>
              <div className={cn("inline-block px-2 py-0.5 rounded text-xs font-bold mb-2", labelBg, textColor)}>
                {label}
              </div>
              <div className="space-y-1.5">
                {(toolData[key] || []).slice(0, 5).map((item: any, i: number) => (
                  <div key={i} className="text-xs text-gray-700 leading-relaxed">
                    <span className={cn("font-medium", textColor)}>•</span>{" "}
                    <span className="break-words">{item.content || item}</span>
                  </div>
                ))}
                {(toolData[key]?.length || 0) === 0 && (
                  <div className="text-xs text-gray-400 italic">No items added</div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Business Model Canvas - Improved layout
    if (toolName === "Business Model Canvas") {
      const topRow = [
        { key: "key-partners", label: "Key Partners", color: "bg-violet-50 border-violet-200" },
        { key: "key-activities", label: "Key Activities", color: "bg-blue-50 border-blue-200" },
        { key: "value-propositions", label: "Value Propositions", color: "bg-emerald-50 border-emerald-200" },
        { key: "customer-relationships", label: "Customer Relationships", color: "bg-orange-50 border-orange-200" },
        { key: "customer-segments", label: "Customer Segments", color: "bg-rose-50 border-rose-200" },
      ];
      const middleRow = [
        { key: "key-resources", label: "Key Resources", color: "bg-indigo-50 border-indigo-200" },
        { key: "channels", label: "Channels", color: "bg-amber-50 border-amber-200" },
      ];
      const bottomRow = [
        { key: "cost-structure", label: "Cost Structure", color: "bg-slate-50 border-slate-200" },
        { key: "revenue-streams", label: "Revenue Streams", color: "bg-green-50 border-green-200" },
      ];

      const renderSection = (key: string, label: string, colorClass: string) => (
        <div key={key} className={cn("rounded-lg border p-2.5 min-h-[70px]", colorClass)}>
          <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-1.5">{label}</div>
          <div className="space-y-1">
            {(toolData[key] || []).slice(0, 3).map((item: any, i: number) => (
              <div key={i} className="text-xs text-gray-600 break-words leading-relaxed">
                • {item.content || item}
              </div>
            ))}
            {(toolData[key]?.length || 0) === 0 && (
              <div className="text-[10px] text-gray-400 italic">Empty</div>
            )}
          </div>
        </div>
      );

      return (
        <div className="p-4 space-y-2">
          <div className="grid grid-cols-5 gap-2">
            {topRow.map(({ key, label, color }) => renderSection(key, label, color))}
          </div>
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-1">{renderSection(middleRow[0].key, middleRow[0].label, middleRow[0].color)}</div>
            <div className="col-span-3"></div>
            <div className="col-span-1">{renderSection(middleRow[1].key, middleRow[1].label, middleRow[1].color)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {bottomRow.map(({ key, label, color }) => renderSection(key, label, color))}
          </div>
        </div>
      );
    }

    // 7S Framework - Improved layout
    if (toolName === "7S Framework") {
      const sections = [
        { key: "strategy", label: "Strategy", color: "bg-blue-50 border-blue-200 text-blue-700" },
        { key: "structure", label: "Structure", color: "bg-green-50 border-green-200 text-green-700" },
        { key: "systems", label: "Systems", color: "bg-purple-50 border-purple-200 text-purple-700" },
        { key: "shared-values", label: "Shared Values", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
        { key: "style", label: "Style", color: "bg-pink-50 border-pink-200 text-pink-700" },
        { key: "staff", label: "Staff", color: "bg-orange-50 border-orange-200 text-orange-700" },
        { key: "skills", label: "Skills", color: "bg-teal-50 border-teal-200 text-teal-700" },
      ];

      return (
        <div className="p-4">
          {/* Center - Shared Values */}
          <div className="flex justify-center mb-3">
            <div className={cn("rounded-lg border-2 p-3 w-48 text-center", sections[3].color.replace("text-", "border-").split(" ")[0], sections[3].color)}>
              <div className="text-xs font-bold uppercase tracking-wide mb-1">Shared Values</div>
              <div className="space-y-1">
                {(toolData["shared-values"] || []).slice(0, 3).map((item: any, i: number) => (
                  <div key={i} className="text-xs text-gray-600 break-words">{item.content || item}</div>
                ))}
              </div>
            </div>
          </div>
          {/* Other 6 S's around */}
          <div className="grid grid-cols-3 gap-2">
            {sections.filter(s => s.key !== "shared-values").map(({ key, label, color }) => (
              <div key={key} className={cn("rounded-lg border p-2.5 min-h-[60px]", color)}>
                <div className="text-[10px] font-bold uppercase tracking-wide mb-1">{label}</div>
                <div className="space-y-1">
                  {(toolData[key] || []).slice(0, 3).map((item: any, i: number) => (
                    <div key={i} className="text-xs text-gray-600 break-words">{item.content || item}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Operating Model Canvas - Improved layout
    if (toolName === "Operating Model Canvas") {
      const sections = [
        { key: "value-chain", label: "Value Chain", color: "bg-blue-50 border-blue-300" },
        { key: "organization", label: "Organization", color: "bg-emerald-50 border-emerald-300" },
        { key: "information", label: "Information", color: "bg-purple-50 border-purple-300" },
        { key: "suppliers", label: "Suppliers", color: "bg-orange-50 border-orange-300" },
        { key: "management-system", label: "Management System", color: "bg-rose-50 border-rose-300" },
        { key: "location", label: "Location", color: "bg-slate-50 border-slate-300" },
      ];

      return (
        <div className="grid grid-cols-3 gap-3 p-4">
          {sections.map(({ key, label, color }) => (
            <div key={key} className={cn("rounded-lg border-2 p-3 min-h-[80px]", color)}>
              <div className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">{label}</div>
              <div className="space-y-1.5">
                {(toolData[key] || []).slice(0, 4).map((item: any, i: number) => (
                  <div key={i} className="text-xs text-gray-600 break-words leading-relaxed">
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

    // Transformation Roadmap - Improved layout
    if (toolName === "Transformation Roadmap") {
      const tracks = toolData.tracks || ["Strategy", "Technology", "People", "Process"];
      const items = toolData.items || [];
      const trackColors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-orange-500"];

      return (
        <div className="p-4">
          {/* Timeline header */}
          <div className="flex items-center gap-2 mb-3 ml-24">
            {["Q1", "Q2", "Q3", "Q4"].map((q, i) => (
              <div key={q} className="flex-1 text-center text-xs font-medium text-gray-500 border-b border-gray-200 pb-1">
                {q}
              </div>
            ))}
          </div>
          {/* Tracks */}
          <div className="space-y-2">
            {tracks.slice(0, 4).map((track: string, i: number) => (
              <div key={track} className="flex items-center gap-3">
                <div className="w-20 text-xs font-semibold text-gray-700 truncate">{track}</div>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg relative overflow-hidden">
                  {items
                    .filter((item: any) => item.track === track)
                    .slice(0, 4)
                    .map((item: any, j: number) => {
                      const left = Math.min((item.startMonth / 12) * 100, 90);
                      const width = Math.max((item.duration / 12) * 100, 20);
                      return (
                        <div
                          key={j}
                          className={cn(
                            "absolute top-1 h-6 rounded-md text-[9px] text-white px-2 flex items-center truncate shadow-sm",
                            trackColors[i % trackColors.length]
                          )}
                          style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
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

    // Generic fallback - improved layout
    return (
      <div className="p-4">
        <div className="text-sm font-semibold text-gray-700 mb-3">{toolName}</div>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(toolData).slice(0, 8).map(([key, value]) => (
            <div key={key} className="bg-gray-50 rounded-lg p-2.5 border">
              <div className="text-xs font-medium text-gray-600 capitalize mb-1">
                {key.replace(/[-_]/g, " ")}
              </div>
              <div className="text-xs text-gray-500">
                {Array.isArray(value) 
                  ? value.slice(0, 3).map((v: any, i: number) => (
                      <div key={i} className="truncate">• {v.content || v.title || String(v)}</div>
                    ))
                  : typeof value === "object"
                  ? <span className="italic">Complex data</span>
                  : String(value).slice(0, 80)
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Preview Container - Larger and more spacious */}
      <div
        ref={previewRef}
        className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden"
        style={{ minHeight: 280, minWidth: 400 }}
      >
        <div className="bg-gradient-to-r from-slate-100 to-slate-50 border-b px-4 py-2.5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">{toolName}</h3>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Strategic Analysis</span>
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
