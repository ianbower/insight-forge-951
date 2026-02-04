import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ChartData {
  month: string;
  projects: number;
  revenue: number;
}

interface ProjectsChartProps {
  className?: string;
}

export function ProjectsChart({ className }: ProjectsChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: projects, error } = await supabase
          .from("projects")
          .select("created_at, budget_amount")
          .order("created_at", { ascending: true });

        if (error) throw error;

        // Group projects by month for the last 12 months
        const now = new Date();
        const monthsData: ChartData[] = [];
        
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthName = date.toLocaleDateString("en-US", { month: "short" });
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          
          const monthProjects = (projects || []).filter((p) => {
            const createdAt = new Date(p.created_at);
            return createdAt >= monthStart && createdAt <= monthEnd;
          });
          
          const revenue = monthProjects.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
          
          monthsData.push({
            month: monthName,
            projects: monthProjects.length,
            revenue: Math.round(revenue / 1000), // Convert to thousands
          });
        }
        
        setData(monthsData);
      } catch (error) {
        console.error("Error fetching chart data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className={cn("rounded-xl border border-border bg-card h-full flex flex-col", className)}>
        <div className="border-b border-border p-4">
          <h3 className="font-semibold font-display">Engagement Trend</h3>
          <p className="text-sm text-muted-foreground">Monthly project activity</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const hasData = data.some((d) => d.projects > 0 || d.revenue > 0);

  if (!hasData) {
    return (
      <div className={cn("rounded-xl border border-border bg-card h-full flex flex-col", className)}>
        <div className="border-b border-border p-4">
          <h3 className="font-semibold font-display">Engagement Trend</h3>
          <p className="text-sm text-muted-foreground">Monthly project activity</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <div className="text-muted-foreground">
            <p className="text-sm">No project data yet</p>
            <p className="text-xs mt-1">Create your first project to see trends</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card h-full flex flex-col", className)}>
      <div className="border-b border-border p-4">
        <h3 className="font-semibold font-display">Engagement Trend</h3>
        <p className="text-sm text-muted-foreground">Monthly project activity</p>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217 71% 22%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217 71% 22%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(172 66% 38%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(172 66% 38%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
            <XAxis
              dataKey="month"
              stroke="hsl(220 9% 46%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(220 9% 46%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0 0% 100%)",
                border: "1px solid hsl(220 13% 91%)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px hsl(222 47% 11% / 0.1)",
              }}
            />
            <Area
              type="monotone"
              dataKey="projects"
              stroke="hsl(217 71% 22%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorProjects)"
              name="Projects"
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(172 66% 38%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              name="Revenue ($K)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
