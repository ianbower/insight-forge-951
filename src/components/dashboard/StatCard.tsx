import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  variant?: "default" | "primary" | "accent";
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative h-full overflow-hidden rounded-[1.75rem] border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-lg",
        variant === "default" && "enterprise-card border-border/80",
        variant === "primary" && "navy-panel border-white/10 text-primary-foreground",
        variant === "accent" && "border-accent/70 bg-accent text-accent-foreground",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary to-accent opacity-80" />
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p
            className={cn(
              "text-sm font-medium",
              variant === "default" ? "text-muted-foreground" : "opacity-80"
            )}
          >
            {title}
          </p>
          <p className="font-display text-4xl tracking-tight">{value}</p>
          {subtitle && (
            <p
              className={cn(
                "text-sm",
                variant === "default" ? "text-muted-foreground" : "opacity-70"
              )}
            >
              {subtitle}
            </p>
          )}
          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                trend.positive
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110",
            variant === "default" && "bg-primary/10",
            variant === "primary" && "bg-white/10",
            variant === "accent" && "bg-accent-foreground/20"
          )}
        >
          <Icon
            className={cn(
              "h-6 w-6",
              variant === "default" && "text-primary",
              variant === "primary" && "text-primary-foreground",
              variant === "accent" && "text-accent-foreground"
            )}
          />
        </div>
      </div>
    </div>
  );
}
