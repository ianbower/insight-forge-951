import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  activeProjects: number;
  totalProjects: number;
  teamMembers: number;
  avgUtilization: number;
  activeAssessments: number;
  pendingResponses: number;
  completedResponses: number;
  upcomingMilestones: number;
  openRisks: number;
  openIssues: number;
}

interface ActivityItem {
  id: string;
  user_name: string;
  action: string;
  target: string | null;
  created_at: string;
}

interface ProjectProgress {
  id: string;
  name: string;
  progress: number;
  status: string;
}

interface TeamMemberSummary {
  id: string;
  name: string;
  role: string;
  availability: number;
  projectCount: number;
}

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    totalProjects: 0,
    teamMembers: 0,
    avgUtilization: 0,
    activeAssessments: 0,
    pendingResponses: 0,
    completedResponses: 0,
    upcomingMilestones: 0,
    openRisks: 0,
    openIssues: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [projectProgress, setProjectProgress] = useState<ProjectProgress[]>([]);
  const [teamSummary, setTeamSummary] = useState<TeamMemberSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all data in parallel
        const [
          projectsResult,
          teamResult,
          activitiesResult,
          assessmentsResult,
          recipientsResult,
          milestonesResult,
          risksResult,
          issuesResult,
          assignmentsResult,
        ] = await Promise.all([
          supabase.from("projects").select("id, name, status, progress_percentage"),
          supabase.from("team_members").select("id, name, role, availability_percentage"),
          supabase.from("activity_feed").select("*").order("created_at", { ascending: false }).limit(10),
          supabase.from("assessment_instances").select("id, status").eq("status", "active"),
          supabase.from("assessment_recipients").select("id, status"),
          supabase.from("project_milestones").select("id, status, target_date").gte("target_date", new Date().toISOString().split("T")[0]).lte("target_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
          supabase.from("project_risks").select("id, status").eq("status", "Open"),
          supabase.from("project_issues").select("id, status").eq("status", "Open"),
          supabase.from("project_team_assignments").select("team_member_id, allocation_percentage"),
        ]);

        // Calculate stats
        const projects = projectsResult.data || [];
        const team = teamResult.data || [];
        const assignments = assignmentsResult.data || [];
        const recipients = recipientsResult.data || [];

        // Calculate utilization per team member
        const utilizationMap = new Map<string, number>();
        assignments.forEach((a) => {
          const current = utilizationMap.get(a.team_member_id) || 0;
          utilizationMap.set(a.team_member_id, current + (a.allocation_percentage || 0));
        });

        const avgUtilization =
          team.length > 0
            ? Math.round(
                Array.from(utilizationMap.values()).reduce((sum, val) => sum + Math.min(val, 100), 0) /
                  team.length
              )
            : 0;

        // Team summary with project counts
        const memberProjectCounts = new Map<string, number>();
        assignments.forEach((a) => {
          const current = memberProjectCounts.get(a.team_member_id) || 0;
          memberProjectCounts.set(a.team_member_id, current + 1);
        });

        setStats({
          activeProjects: projects.filter((p) => p.status === "Active").length,
          totalProjects: projects.length,
          teamMembers: team.length,
          avgUtilization,
          activeAssessments: assessmentsResult.data?.length || 0,
          pendingResponses: recipients.filter((r) => r.status === "pending" || r.status === "started").length,
          completedResponses: recipients.filter((r) => r.status === "completed").length,
          upcomingMilestones: milestonesResult.data?.length || 0,
          openRisks: risksResult.data?.length || 0,
          openIssues: issuesResult.data?.length || 0,
        });

        setActivities(activitiesResult.data || []);

        setProjectProgress(
          projects.map((p) => ({
            id: p.id,
            name: p.name,
            progress: p.progress_percentage || 0,
            status: p.status,
          }))
        );

        setTeamSummary(
          team.map((m) => ({
            id: m.id,
            name: m.name,
            role: m.role,
            availability: m.availability_percentage || 100,
            projectCount: memberProjectCounts.get(m.id) || 0,
          }))
        );
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    stats,
    activities,
    projectProgress,
    teamSummary,
    loading,
  };
}
