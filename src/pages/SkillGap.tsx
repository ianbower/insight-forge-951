import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Users, AlertTriangle, GraduationCap, Target, BookOpen } from "lucide-react";

const SKILL_CATEGORIES = ["Strategy", "Data & Analytics", "Digital", "Operations", "Change Management", "Technical", "Industry Knowledge", "Leadership"];

export default function SkillGap() {
  const { data: teamMembers } = useQuery({
    queryKey: ["team-skill-analysis"],
    queryFn: async () => { const { data } = await supabase.from("team_members").select("*").order("name"); return data || []; },
  });

  const { data: assignments } = useQuery({
    queryKey: ["project-assignments-skills"],
    queryFn: async () => { const { data } = await supabase.from("project_team_assignments").select("*, projects(name, project_type, status), team_members(name, role, skills)").eq("assignment_status", "confirmed"); return data || []; },
  });

  const skillAnalysis = useMemo(() => {
    if (!teamMembers?.length) return { categories: [], gaps: [], strengths: [], teamRadar: [] };
    const categoryScores: Record<string, { total: number; count: number; members: string[] }> = {};
    SKILL_CATEGORIES.forEach(c => categoryScores[c] = { total: 0, count: 0, members: [] });

    teamMembers.forEach(m => {
      const skills = (m.skills as any) || {};
      if (Array.isArray(skills)) {
        skills.forEach((s: any) => {
          const cat = SKILL_CATEGORIES.find(c => c.toLowerCase().includes(String(s.category || s.name || "").toLowerCase())) || "Technical";
          if (categoryScores[cat]) { categoryScores[cat].total += (s.level || s.proficiency || 3); categoryScores[cat].count += 1; categoryScores[cat].members.push(m.name); }
        });
      }
    });

    const categories = SKILL_CATEGORIES.map(c => ({ name: c, avgScore: categoryScores[c].count > 0 ? categoryScores[c].total / categoryScores[c].count : 2, coverage: categoryScores[c].count, targetScore: 4, members: categoryScores[c].members }));
    const gaps = categories.filter(c => c.avgScore < 3 || c.coverage < 2).sort((a, b) => a.avgScore - b.avgScore);
    const strengths = categories.filter(c => c.avgScore >= 3.5 && c.coverage >= 2).sort((a, b) => b.avgScore - a.avgScore);
    const teamRadar = categories.map(c => ({ skill: c.name, current: Math.round(c.avgScore * 20), target: 80 }));
    return { categories, gaps, strengths, teamRadar };
  }, [teamMembers]);

  const utilizationByRole = useMemo(() => {
    if (!teamMembers?.length) return [];
    const roles: Record<string, { total: number; assigned: number }> = {};
    teamMembers.forEach(m => { if (!roles[m.role]) roles[m.role] = { total: 0, assigned: 0 }; roles[m.role].total += 1; });
    assignments?.forEach((a: any) => { const role = a.team_members?.role; if (role && roles[role]) roles[role].assigned += 1; });
    return Object.entries(roles).map(([role, data]) => ({ role, total: data.total, assigned: data.assigned, available: data.total - data.assigned, utilization: data.total > 0 ? Math.round((data.assigned / data.total) * 100) : 0 }));
  }, [teamMembers, assignments]);

  const trainingPaths = useMemo(() => {
    return skillAnalysis.gaps.map(gap => ({
      skill: gap.name, priority: gap.avgScore < 2 ? "Critical" : "High", currentLevel: gap.avgScore, targetLevel: gap.targetScore,
      suggestedActions: [`Hire ${gap.name} specialist`, `Internal training program for ${gap.name}`, `Partner with external ${gap.name} experts`, `Create ${gap.name} community of practice`],
    }));
  }, [skillAnalysis.gaps]);

  const barData = skillAnalysis.categories.map(c => ({ name: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name, "Current": Math.round(c.avgScore * 20), "Target": 80, "Gap": Math.max(0, 80 - Math.round(c.avgScore * 20)) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Skill Gap Analysis</h1><p className="text-muted-foreground mt-1">Identify capability gaps and plan training pathways</p></div>
        <Badge variant="outline">{teamMembers?.length || 0} team members</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><Users className="h-8 w-8 mx-auto mb-2 text-primary" /><p className="text-2xl font-bold">{teamMembers?.length || 0}</p><p className="text-xs text-muted-foreground">Team Members</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Target className="h-8 w-8 mx-auto mb-2 text-chart-2" /><p className="text-2xl font-bold">{skillAnalysis.strengths.length}</p><p className="text-xs text-muted-foreground">Strong Areas</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" /><p className="text-2xl font-bold">{skillAnalysis.gaps.length}</p><p className="text-xs text-muted-foreground">Skill Gaps</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><GraduationCap className="h-8 w-8 mx-auto mb-2 text-chart-4" /><p className="text-2xl font-bold">{trainingPaths.length}</p><p className="text-xs text-muted-foreground">Training Paths</p></CardContent></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Capability Overview</TabsTrigger>
          <TabsTrigger value="gaps">Gap Analysis</TabsTrigger>
          <TabsTrigger value="training">Training Pathways</TabsTrigger>
          <TabsTrigger value="capacity">Role Capacity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Team Capability Radar</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={skillAnalysis.teamRadar}>
                    <PolarGrid className="stroke-border" /><PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} /><PolarRadiusAxis domain={[0, 100]} />
                    <Radar name="Current" dataKey="current" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    <Radar name="Target" dataKey="target" stroke="hsl(var(--chart-2))" fill="none" strokeDasharray="5 5" /><Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Current vs Target</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis type="number" domain={[0, 100]} /><YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} /><Tooltip />
                    <Bar dataKey="Current" fill="hsl(var(--primary))" /><Bar dataKey="Gap" fill="hsl(var(--destructive))" opacity={0.3} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gaps" className="space-y-4">
          {skillAnalysis.gaps.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No significant gaps detected. Add skills to team members for detailed analysis.</CardContent></Card>
          ) : skillAnalysis.gaps.map((gap, i) => (
            <Card key={i}><CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3"><AlertTriangle className={`h-5 w-5 ${gap.avgScore < 2 ? "text-destructive" : "text-amber-500"}`} /><div><h3 className="font-semibold text-foreground">{gap.name}</h3><p className="text-xs text-muted-foreground">{gap.coverage} team member(s) with this skill</p></div></div>
                <Badge variant={gap.avgScore < 2 ? "destructive" : "secondary"}>{gap.avgScore < 2 ? "Critical" : "Needs Development"}</Badge>
              </div>
              <div className="flex items-center gap-4"><div className="flex-1"><div className="flex justify-between text-xs mb-1"><span>Current: {(gap.avgScore * 20).toFixed(0)}%</span><span>Target: 80%</span></div><Progress value={gap.avgScore * 20} className="h-2" /></div><span className="text-sm font-medium text-destructive">-{(80 - gap.avgScore * 20).toFixed(0)}%</span></div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          {trainingPaths.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No training paths needed — all skills are at target levels.</CardContent></Card>
          ) : trainingPaths.map((path, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />{path.skill} Development Path</CardTitle><Badge variant={path.priority === "Critical" ? "destructive" : "secondary"}>{path.priority}</Badge></div>
                <CardDescription>Current: {(path.currentLevel * 20).toFixed(0)}% → Target: {path.targetLevel * 20}%</CardDescription>
              </CardHeader>
              <CardContent><div className="space-y-2">{path.suggestedActions.map((action, j) => (<div key={j} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"><BookOpen className="h-4 w-4 text-muted-foreground shrink-0" /><span className="text-sm">{action}</span></div>))}</div></CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="capacity">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {utilizationByRole.map((r, i) => (
              <Card key={i}><CardContent className="pt-6">
                <h3 className="font-semibold text-foreground mb-3">{r.role}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total</span><span className="font-medium">{r.total}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Assigned</span><span className="font-medium">{r.assigned}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Available</span><span className="font-medium text-chart-2">{r.available}</span></div>
                  <Progress value={r.utilization} className="h-2 mt-2" /><p className="text-xs text-muted-foreground text-right">{r.utilization}% utilized</p>
                </div>
              </CardContent></Card>
            ))}
            {utilizationByRole.length === 0 && (<div className="col-span-full text-center py-12 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Add team members to see capacity analysis</p></div>)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}