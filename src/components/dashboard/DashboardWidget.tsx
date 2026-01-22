import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardWidgetProps {
  id: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  isEditing?: boolean;
  isHidden?: boolean;
  onRemove?: () => void;
  onToggleVisibility?: () => void;
  className?: string;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function DashboardWidget({
  id,
  title,
  icon,
  children,
  isEditing,
  isHidden,
  onRemove,
  onToggleVisibility,
  className,
  dragHandleProps,
}: DashboardWidgetProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all",
        isEditing && "ring-2 ring-primary/20 ring-offset-2",
        isHidden && "opacity-50",
        className
      )}
    >
      {isEditing && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          {onToggleVisibility && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleVisibility}
            >
              {isHidden ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {isEditing && (
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-muted rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          {icon}
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
