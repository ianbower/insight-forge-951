import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  user_name: string;
  action: string;
  target?: string;
  created_at: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  className?: string;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getAvatarColor = (name: string) => {
  const colors = [
    "bg-primary",
    "bg-accent",
    "bg-info",
    "bg-warning",
    "bg-success",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card h-full flex flex-col", className)}>
      <div className="border-b border-border p-4">
        <h3 className="font-semibold font-display">Recent Activity</h3>
      </div>
      <ScrollArea className="h-[320px]">
        <div className="divide-y divide-border">
          {activities.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No recent activity</p>
            </div>
          ) : (
            activities.map((activity, index) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/50 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Avatar className={`h-9 w-9 ${getAvatarColor(activity.user_name)}`}>
                  <AvatarFallback className="text-xs font-medium text-primary-foreground">
                    {getInitials(activity.user_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user_name}</span>{" "}
                    <span className="text-muted-foreground">{activity.action}</span>
                    {activity.target && (
                      <span className="font-medium text-primary"> {activity.target}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
