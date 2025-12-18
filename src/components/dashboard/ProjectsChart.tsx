import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { month: "Jan", projects: 4, revenue: 120 },
  { month: "Feb", projects: 6, revenue: 180 },
  { month: "Mar", projects: 5, revenue: 150 },
  { month: "Apr", projects: 8, revenue: 240 },
  { month: "May", projects: 7, revenue: 210 },
  { month: "Jun", projects: 9, revenue: 270 },
  { month: "Jul", projects: 11, revenue: 330 },
  { month: "Aug", projects: 10, revenue: 300 },
  { month: "Sep", projects: 12, revenue: 360 },
  { month: "Oct", projects: 14, revenue: 420 },
  { month: "Nov", projects: 13, revenue: 390 },
  { month: "Dec", projects: 15, revenue: 450 },
];

export function ProjectsChart() {
  return (
    <div className="rounded-xl border border-border bg-card">
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
