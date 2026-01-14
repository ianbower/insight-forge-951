import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Edit, MoreVertical, Trash2, User } from "lucide-react";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  level: string;
  role: string;
  skills: { name: string; proficiency?: number }[];
  hourly_rate?: number;
  availability_percentage: number;
}

interface TeamMemberCardProps {
  member: TeamMember;
  onEdit?: (member: TeamMember) => void;
  onDelete?: (member: TeamMember) => void;
  compact?: boolean;
}

const levelColors: Record<string, string> = {
  Partner: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  Director: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Manager: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Consultant: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Analyst: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export function TeamMemberCard({ member, onEdit, onDelete, compact = false }: TeamMemberCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
        <Avatar className="h-8 w-8">
          <AvatarImage src={member.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{member.name}</p>
          <p className="text-xs text-muted-foreground truncate">{member.role}</p>
        </div>
        <Badge variant="outline" className={cn("text-xs", levelColors[member.level])}>
          {member.level}
        </Badge>
      </div>
    );
  }

  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-background shadow-lg">
              <AvatarImage src={member.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-foreground">{member.name}</h3>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border">
              <DropdownMenuItem onClick={() => onEdit?.(member)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete?.(member)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className={cn("font-medium", levelColors[member.level])}>
            {member.level}
          </Badge>
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            {member.role}
          </Badge>
        </div>

        {member.skills && member.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {member.skills.slice(0, 4).map((skill, idx) => (
              <Badge key={idx} variant="outline" className="text-xs bg-background/50">
                {skill.name}
              </Badge>
            ))}
            {member.skills.length > 4 && (
              <Badge variant="outline" className="text-xs bg-background/50 text-muted-foreground">
                +{member.skills.length - 4} more
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full",
              member.availability_percentage >= 80 ? "bg-emerald-500" :
              member.availability_percentage >= 50 ? "bg-amber-500" : "bg-red-500"
            )} />
            <span className="text-xs text-muted-foreground">
              {member.availability_percentage}% Available
            </span>
          </div>
          {member.hourly_rate && (
            <span className="text-xs text-muted-foreground">
              ${member.hourly_rate}/hr
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
