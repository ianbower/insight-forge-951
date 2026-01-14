import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DollarSign, TrendingUp, TrendingDown, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import type { TeamMember } from "@/components/team/TeamMemberCard";

interface TeamAssignment {
  id: string;
  team_member_id: string;
  role_in_project: string;
  allocation_percentage: number;
  team_member?: TeamMember;
}

interface ProjectBudgetProps {
  assignments: TeamAssignment[];
  projectStartDate: string | null;
  projectEndDate: string | null;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function ProjectBudget({ assignments, projectStartDate, projectEndDate }: ProjectBudgetProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate project duration in weeks
  const getProjectWeeks = () => {
    if (!projectStartDate || !projectEndDate) return 8; // Default 8 weeks
    const start = new Date(projectStartDate);
    const end = new Date(projectEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    return Math.max(1, diffWeeks);
  };

  const projectWeeks = getProjectWeeks();
  const hoursPerWeek = 40;

  // Calculate costs per team member
  const teamCosts = assignments.map((assignment) => {
    const member = assignment.team_member;
    const hourlyRate = member?.hourly_rate || 150; // Default rate if not set
    const weeklyHours = (hoursPerWeek * assignment.allocation_percentage) / 100;
    const totalHours = weeklyHours * projectWeeks;
    const totalCost = totalHours * hourlyRate;
    const weeklyCost = weeklyHours * hourlyRate;

    return {
      id: assignment.id,
      name: member?.name || "Unknown",
      role: assignment.role_in_project,
      level: member?.level || "Unknown",
      avatar_url: member?.avatar_url,
      hourlyRate,
      allocation: assignment.allocation_percentage,
      weeklyHours,
      totalHours,
      weeklyCost,
      totalCost,
    };
  });

  // Summary calculations
  const totalProjectCost = teamCosts.reduce((sum, tc) => sum + tc.totalCost, 0);
  const totalWeeklyCost = teamCosts.reduce((sum, tc) => sum + tc.weeklyCost, 0);
  const totalHours = teamCosts.reduce((sum, tc) => sum + tc.totalHours, 0);
  const averageHourlyRate = teamCosts.length > 0
    ? teamCosts.reduce((sum, tc) => sum + tc.hourlyRate, 0) / teamCosts.length
    : 0;

  // Chart data for cost breakdown by role
  const roleBreakdown = teamCosts.reduce((acc, tc) => {
    const existing = acc.find((r) => r.role === tc.role);
    if (existing) {
      existing.cost += tc.totalCost;
    } else {
      acc.push({ role: tc.role, cost: tc.totalCost });
    }
    return acc;
  }, [] as { role: string; cost: number }[]);

  // Weekly burn rate data
  const weeklyBurnData = Array.from({ length: Math.min(projectWeeks, 12) }, (_, i) => ({
    week: `W${i + 1}`,
    cost: totalWeeklyCost,
    cumulative: totalWeeklyCost * (i + 1),
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (assignments.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No team assigned</p>
          <p className="text-sm mt-1">Assign team members to see budget calculations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Project Cost</p>
                <p className="text-2xl font-bold">{formatCurrency(totalProjectCost)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Over {projectWeeks} weeks
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Weekly Burn Rate</p>
                <p className="text-2xl font-bold">{formatCurrency(totalWeeklyCost)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-chart-2/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-chart-2" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {formatCurrency(totalWeeklyCost / 5)}/day average
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{totalHours.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-chart-3/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-chart-3" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {(totalHours / projectWeeks).toFixed(0)} hours/week
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Hourly Rate</p>
                <p className="text-2xl font-bold">{formatCurrency(averageHourlyRate)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-chart-4/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-chart-4" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {teamCosts.length} team member{teamCosts.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative Burn Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium">Projected Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyBurnData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Cumulative Cost']}
                  />
                  <Bar 
                    dataKey="cumulative" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cost by Role Pie Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium">Cost by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="cost"
                    nameKey="role"
                    label={({ role, percent }) => `${role.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {roleBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Cost']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Cost Breakdown */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium">Team Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamCosts.map((tc, index) => {
              const costPercentage = (tc.totalCost / totalProjectCost) * 100;
              return (
                <div key={tc.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={tc.avatar_url || undefined} />
                        <AvatarFallback 
                          className="text-xs"
                          style={{ backgroundColor: COLORS[index % COLORS.length] + '20', color: COLORS[index % COLORS.length] }}
                        >
                          {getInitials(tc.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{tc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tc.role} • {tc.level}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(tc.totalCost)}</p>
                      <p className="text-xs text-muted-foreground">
                        {tc.allocation}% @ {formatCurrency(tc.hourlyRate)}/hr
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress 
                      value={costPercentage} 
                      className="flex-1 h-2"
                    />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {costPercentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}