import { useEffect, useState } from "react";
import { Briefcase, Clock, Users, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ProjectCalendar } from "@/components/dashboard/ProjectCalendar";
import { ProjectsChart } from "@/components/dashboard/ProjectsChart";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeProjects: 0,
    billableHours: 1284,
    teamMembers: 12,
    utilization: 87,
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch active projects count
        const { count: projectCount } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("status", "Active");

        // Fetch recent activities
        const { data: activityData } = await supabase
          .from("activity_feed")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        setStats((prev) => ({
          ...prev,
          activeProjects: projectCount || 0,
        }));

        setActivities(activityData || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Mock activities if none exist
  const displayActivities =
    activities.length > 0
      ? activities
      : [
          {
            id: "1",
            user_name: "Sarah Chen",
            action: "completed assessment for",
            target: "Digital Transformation",
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: "2",
            user_name: "Michael Brooks",
            action: "uploaded deliverable to",
            target: "Operating Model Review",
            created_at: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: "3",
            user_name: "Emma Wilson",
            action: "started new engagement",
            target: "M&A Integration",
            created_at: new Date(Date.now() - 14400000).toISOString(),
          },
          {
            id: "4",
            user_name: "David Kim",
            action: "shared SWOT analysis for",
            target: "Market Entry Strategy",
            created_at: new Date(Date.now() - 28800000).toISOString(),
          },
        ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome back. Here's your consulting practice overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Projects"
          value={stats.activeProjects || 8}
          subtitle="Across 5 clients"
          icon={Briefcase}
          trend={{ value: 12, positive: true }}
          variant="primary"
        />
        <StatCard
          title="Billable Hours"
          value={stats.billableHours.toLocaleString()}
          subtitle="This month"
          icon={Clock}
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          title="Team Members"
          value={stats.teamMembers}
          subtitle="Active consultants"
          icon={Users}
        />
        <StatCard
          title="Utilization"
          value={`${stats.utilization}%`}
          subtitle="Target: 85%"
          icon={TrendingUp}
          trend={{ value: 3, positive: true }}
          variant="accent"
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProjectsChart />
        </div>
        <div>
          <ActivityFeed activities={displayActivities} />
        </div>
      </div>

      {/* Calendar Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ProjectCalendar />
        </div>
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold font-display mb-4">Quick Actions</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-left transition-all hover:bg-muted hover:shadow-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">New Business Case</p>
                <p className="text-sm text-muted-foreground">
                  Create financial model
                </p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-left transition-all hover:bg-muted hover:shadow-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-medium">Market Analysis</p>
                <p className="text-sm text-muted-foreground">
                  Start competitive review
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
