import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { MetricCounter } from "./MetricCounter";
import type { Milestone } from "@/components/project/MilestoneTimeline";
import type { Risk } from "@/components/project/RiskMatrix";
import type { TeamMember } from "@/components/team/TeamMemberCard";
import {
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Target,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Calendar,
  Users,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from "recharts";

interface PresentationModeProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    status: string;
    start_date?: string;
    end_date?: string;
  };
  tasks: { id: string; status: string }[];
  milestones: Milestone[];
  risks: Risk[];
  issues: { id: string; status: string; priority: string }[];
  teamMembers: TeamMember[];
}

const SLIDE_DURATION = 8000; // 8 seconds per slide

export function PresentationMode({
  isOpen,
  onClose,
  project,
  tasks,
  milestones,
  risks,
  issues,
  teamMembers,
}: PresentationModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  // Calculate metrics
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const overallProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const openRisks = risks.filter((r) => r.status !== "Closed").length;
  const highRisks = risks.filter((r) => r.status !== "Closed" && (r.likelihood === "High" || r.impact === "High")).length;

  const openIssues = issues.filter((i) => i.status !== "Resolved").length;
  const criticalIssues = issues.filter((i) => i.status !== "Resolved" && i.priority === "Critical").length;

  const completedMilestones = milestones.filter((m) => m.status === "completed").length;
  const upcomingMilestones = milestones
    .filter((m) => m.status !== "completed")
    .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
    .slice(0, 3);

  // RAG status
  const getRAGStatus = () => {
    if (criticalIssues > 0 || highRisks > 3) return "red";
    if (openIssues > 3 || highRisks > 1) return "amber";
    return "green";
  };
  const ragStatus = getRAGStatus();

  const ragColors = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  const ragLabels = {
    green: "On Track",
    amber: "At Risk",
    red: "Critical",
  };

  // Task distribution for pie chart
  const taskDistribution = [
    { name: "Completed", value: completedTasks, color: "hsl(142, 76%, 36%)" },
    { name: "In Progress", value: inProgressTasks, color: "hsl(var(--primary))" },
    { name: "Pending", value: Math.max(0, tasks.length - completedTasks - inProgressTasks), color: "hsl(var(--muted))" },
  ].filter(d => d.value > 0);

  // Progress trend data
  const progressData = [
    { week: "W1", value: 10 },
    { week: "W2", value: 20 },
    { week: "W3", value: 35 },
    { week: "W4", value: 50 },
    { week: "W5", value: 65 },
    { week: "W6", value: overallProgress },
  ];

  // Define slides
  const slides = [
    {
      id: "overview",
      title: "Project Overview",
      icon: Target,
    },
    {
      id: "progress",
      title: "Progress & Tasks",
      icon: TrendingUp,
    },
    {
      id: "milestones",
      title: "Key Milestones",
      icon: Calendar,
    },
    {
      id: "risks",
      title: "Risks & Issues",
      icon: AlertTriangle,
    },
    {
      id: "team",
      title: "Project Team",
      icon: Users,
    },
  ];

  const totalSlides = slides.length;

  // Auto-advance slides
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlide((s) => (s + 1) % totalSlides);
          return 0;
        }
        return prev + (100 / (SLIDE_DURATION / 100));
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, [isOpen, isPlaying, totalSlides]);

  // Reset progress when slide changes manually
  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setProgress(0);
  }, []);

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % totalSlides);
  }, [currentSlide, totalSlides, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
  }, [currentSlide, totalSlides, goToSlide]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case " ":
          nextSlide();
          break;
        case "ArrowLeft":
          prevSlide();
          break;
        case "Escape":
          onClose();
          break;
        case "p":
          setIsPlaying((p) => !p);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, nextSlide, prevSlide, onClose]);

  if (!isOpen) return null;

  const CurrentIcon = slides[currentSlide].icon;

  const renderSlideContent = () => {
    switch (slides[currentSlide].id) {
      case "overview":
        return (
          <div className="flex flex-col items-center justify-center h-full gap-12">
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className={cn("h-6 w-6 rounded-full animate-pulse", ragColors[ragStatus])} />
                <Badge variant="outline" className="text-xl px-4 py-2 capitalize">
                  {ragLabels[ragStatus]}
                </Badge>
              </div>
              <h1 className="text-6xl font-bold mb-4">{project.name}</h1>
              <p className="text-2xl text-muted-foreground">Project Status Report</p>
            </div>

            <div className="grid grid-cols-4 gap-8 w-full max-w-4xl">
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardContent className="pt-8 pb-8 text-center">
                  <Target className="h-10 w-10 mx-auto mb-4 text-primary" />
                  <MetricCounter value={overallProgress} suffix="%" className="text-5xl font-bold" />
                  <p className="text-muted-foreground mt-2">Progress</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardContent className="pt-8 pb-8 text-center">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-4 text-emerald-500" />
                  <MetricCounter value={completedTasks} className="text-5xl font-bold" />
                  <p className="text-muted-foreground mt-2">Tasks Done</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardContent className="pt-8 pb-8 text-center">
                  <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-amber-500" />
                  <MetricCounter value={openRisks} className="text-5xl font-bold" />
                  <p className="text-muted-foreground mt-2">Open Risks</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardContent className="pt-8 pb-8 text-center">
                  <Activity className="h-10 w-10 mx-auto mb-4 text-blue-500" />
                  <MetricCounter value={openIssues} className="text-5xl font-bold" />
                  <p className="text-muted-foreground mt-2">Open Issues</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "progress":
        return (
          <div className="flex flex-col items-center justify-center h-full gap-8">
            <div className="text-center mb-4">
              <h2 className="text-4xl font-bold mb-2">Progress & Tasks</h2>
              <p className="text-xl text-muted-foreground">
                {completedTasks} of {tasks.length} tasks completed
              </p>
            </div>

            <div className="grid grid-cols-2 gap-12 w-full max-w-5xl">
              {/* Progress Chart */}
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-4">Progress Trend</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={progressData}>
                        <defs>
                          <linearGradient id="presGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={14} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={14} />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          fill="url(#presGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Task Distribution */}
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-4">Task Distribution</h3>
                  <div className="h-[250px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={taskDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {taskDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-4xl font-bold">{overallProgress}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    {taskDistribution.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-base">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "milestones":
        return (
          <div className="flex flex-col items-center justify-center h-full gap-8">
            <div className="text-center mb-4">
              <h2 className="text-4xl font-bold mb-2">Key Milestones</h2>
              <p className="text-xl text-muted-foreground">
                {completedMilestones} of {milestones.length} milestones completed
              </p>
            </div>

            <div className="w-full max-w-4xl">
              {/* Milestone Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Milestone Progress</span>
                  <span>{milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0}%</span>
                </div>
                <Progress 
                  value={milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0} 
                  className="h-4"
                />
              </div>

              {/* Upcoming Milestones */}
              <h3 className="text-2xl font-semibold mb-4">Upcoming Milestones</h3>
              <div className="space-y-4">
                {upcomingMilestones.map((milestone, index) => (
                  <Card key={milestone.id} className="bg-card/50 backdrop-blur border-border/50">
                    <CardContent className="py-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold",
                          milestone.status === "at_risk" 
                            ? "bg-amber-500/20 text-amber-500" 
                            : "bg-primary/20 text-primary"
                        )}>
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="text-xl font-semibold">{milestone.title}</h4>
                          {milestone.description && (
                            <p className="text-muted-foreground">{milestone.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-base px-3 py-1",
                            milestone.status === "at_risk" && "border-amber-500 text-amber-500"
                          )}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          {new Date(milestone.target_date).toLocaleDateString()}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {upcomingMilestones.length === 0 && (
                  <Card className="bg-card/50 backdrop-blur border-border/50">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                      <p className="text-xl">All milestones completed!</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        );

      case "risks":
        return (
          <div className="flex flex-col items-center justify-center h-full gap-8">
            <div className="text-center mb-4">
              <h2 className="text-4xl font-bold mb-2">Risks & Issues</h2>
              <p className="text-xl text-muted-foreground">
                Current risk and issue status
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 w-full max-w-4xl">
              {/* Risks Card */}
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardContent className="pt-8 pb-8">
                  <div className="flex items-center gap-4 mb-6">
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                    <h3 className="text-2xl font-semibold">Risks</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center p-6 rounded-lg bg-background/50">
                      <MetricCounter value={openRisks} className="text-5xl font-bold" />
                      <p className="text-muted-foreground mt-2">Open Risks</p>
                    </div>
                    <div className="text-center p-6 rounded-lg bg-red-500/10">
                      <MetricCounter value={highRisks} className="text-5xl font-bold text-red-500" />
                      <p className="text-muted-foreground mt-2">High Priority</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Mitigation Progress</span>
                      <span>{risks.length > 0 ? Math.round(((risks.length - openRisks) / risks.length) * 100) : 0}%</span>
                    </div>
                    <Progress 
                      value={risks.length > 0 ? ((risks.length - openRisks) / risks.length) * 100 : 100} 
                      className="h-3"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Issues Card */}
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardContent className="pt-8 pb-8">
                  <div className="flex items-center gap-4 mb-6">
                    <Activity className="h-8 w-8 text-blue-500" />
                    <h3 className="text-2xl font-semibold">Issues</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center p-6 rounded-lg bg-background/50">
                      <MetricCounter value={openIssues} className="text-5xl font-bold" />
                      <p className="text-muted-foreground mt-2">Open Issues</p>
                    </div>
                    <div className="text-center p-6 rounded-lg bg-red-500/10">
                      <MetricCounter value={criticalIssues} className="text-5xl font-bold text-red-500" />
                      <p className="text-muted-foreground mt-2">Critical</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Resolution Progress</span>
                      <span>{issues.length > 0 ? Math.round(((issues.length - openIssues) / issues.length) * 100) : 0}%</span>
                    </div>
                    <Progress 
                      value={issues.length > 0 ? ((issues.length - openIssues) / issues.length) * 100 : 100} 
                      className="h-3"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "team":
        return (
          <div className="flex flex-col items-center justify-center h-full gap-8">
            <div className="text-center mb-4">
              <h2 className="text-4xl font-bold mb-2">Project Team</h2>
              <p className="text-xl text-muted-foreground">
                {teamMembers.length} team member{teamMembers.length !== 1 ? "s" : ""} assigned
              </p>
            </div>

            <div className="grid grid-cols-4 gap-6 w-full max-w-5xl">
              {teamMembers.slice(0, 8).map((member) => (
                <Card key={member.id} className="bg-card/50 backdrop-blur border-border/50">
                  <CardContent className="pt-6 pb-6 text-center">
                    <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary">
                      {member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <h4 className="font-semibold text-lg">{member.name}</h4>
                    <p className="text-muted-foreground">{member.role}</p>
                    <Badge variant="outline" className="mt-2">{member.level}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            {teamMembers.length > 8 && (
              <p className="text-muted-foreground">
                +{teamMembers.length - 8} additional team members
              </p>
            )}

            {teamMembers.length === 0 && (
              <Card className="bg-card/50 backdrop-blur border-border/50 w-full max-w-md">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-xl">No team members assigned yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-4">
          <CurrentIcon className="h-5 w-5 text-primary" />
          <span className="font-medium">{slides[currentSlide].title}</span>
        </div>

        <div className="flex items-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => goToSlide(index)}
              className={cn(
                "h-2 rounded-full transition-all",
                index === currentSlide 
                  ? "w-8 bg-primary" 
                  : "w-2 bg-muted hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Slide Content */}
      <div className="flex-1 p-8 overflow-auto">
        {renderSlideContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between p-4 border-t border-border/50">
        <Button variant="ghost" onClick={prevSlide} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <span className="text-sm text-muted-foreground">
          Slide {currentSlide + 1} of {totalSlides} • Press Space or Arrow keys to navigate
        </span>

        <Button variant="ghost" onClick={nextSlide} className="gap-2">
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}