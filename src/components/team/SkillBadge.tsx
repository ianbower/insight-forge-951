import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SkillBadgeProps {
  name: string;
  proficiency?: number;
  size?: "sm" | "md";
}

export function SkillBadge({ name, proficiency, size = "md" }: SkillBadgeProps) {
  const getProficiencyColor = (level?: number) => {
    if (!level) return "bg-muted text-muted-foreground";
    if (level >= 80) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (level >= 60) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (level >= 40) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal transition-colors",
        getProficiencyColor(proficiency),
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1"
      )}
    >
      {name}
      {proficiency !== undefined && (
        <span className="ml-1.5 opacity-70">{proficiency}%</span>
      )}
    </Badge>
  );
}
