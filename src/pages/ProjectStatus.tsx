import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusDashboard } from "@/components/dashboard/StatusDashboard";
import { MilestoneForm } from "@/components/project/MilestoneForm";
import { RiskForm } from "@/components/project/RiskForm";
import { IssueForm } from "@/components/project/IssueForm";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Settings, Share2 } from "lucide-react";
import type { Milestone } from "@/components/project/MilestoneTimeline";
import type { Risk } from "@/components/project/RiskMatrix";
import type { Issue } from "@/components/project/RAIDLog";
import type { TeamMember } from "@/components/team/TeamMemberCard";

export default function ProjectStatus() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<{ id: string; status: string }[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Form states
  const [milestoneFormOpen, setMilestoneFormOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [riskFormOpen, setRiskFormOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [issueFormOpen, setIssueFormOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchAllData();
    }
  }, [projectId]);

  const fetchAllData = async () => {
    setLoading(true);

    // Fetch project
    const { data: projectData } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectData) setProject(projectData);

    // Fetch tasks
    const { data: tasksData } = await supabase
      .from("project_tasks")
      .select("id, status")
      .eq("project_id", projectId);

    setTasks(tasksData || []);

    // Fetch milestones
    const { data: milestonesData } = await supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("target_date", { ascending: true });

    setMilestones((milestonesData || []) as unknown as Milestone[]);

    // Fetch risks
    const { data: risksData } = await supabase
      .from("project_risks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    setRisks((risksData || []) as unknown as Risk[]);

    // Fetch issues
    const { data: issuesData } = await supabase
      .from("project_issues")
      .select("*")
      .eq("project_id", projectId)
      .order("raised_date", { ascending: false });

    setIssues((issuesData || []) as unknown as Issue[]);

    // Fetch team assignments with members
    const { data: assignmentsData } = await supabase
      .from("project_team_assignments")
      .select(`
        *,
        team_member:team_members(*)
      `)
      .eq("project_id", projectId);

    const members = (assignmentsData || [])
      .map((a: any) => a.team_member)
      .filter(Boolean)
      .map((m: any) => ({
        ...m,
        skills: Array.isArray(m.skills) ? m.skills : [],
      }));

    setTeamMembers(members);
    setLoading(false);
  };

  // Milestone handlers
  const handleSaveMilestone = async (milestone: Omit<Milestone, "id"> & { id?: string }) => {
    if (milestone.id) {
      const { error } = await supabase
        .from("project_milestones")
        .update({
          title: milestone.title,
          description: milestone.description,
          target_date: milestone.target_date,
          status: milestone.status,
          completed_date: milestone.completed_date,
        })
        .eq("id", milestone.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Milestone updated" });
        fetchAllData();
      }
    } else {
      const { error } = await supabase.from("project_milestones").insert({
        project_id: projectId,
        title: milestone.title,
        description: milestone.description,
        target_date: milestone.target_date,
        status: milestone.status,
        order_index: milestones.length,
      });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Milestone added" });
        fetchAllData();
      }
    }
    setEditingMilestone(null);
  };

  const handleDeleteMilestone = async (id: string) => {
    const { error } = await supabase.from("project_milestones").delete().eq("id", id);
    if (!error) {
      toast({ title: "Milestone deleted" });
      fetchAllData();
    }
  };

  // Risk handlers
  const handleSaveRisk = async (risk: Omit<Risk, "id"> & { id?: string }) => {
    if (risk.id) {
      const { error } = await supabase
        .from("project_risks")
        .update({
          title: risk.title,
          description: risk.description,
          category: risk.category,
          likelihood: risk.likelihood,
          impact: risk.impact,
          status: risk.status,
          mitigation_plan: risk.mitigation_plan,
        })
        .eq("id", risk.id);

      if (!error) {
        toast({ title: "Risk updated" });
        fetchAllData();
      }
    } else {
      const { error } = await supabase.from("project_risks").insert({
        project_id: projectId,
        title: risk.title,
        description: risk.description,
        category: risk.category,
        likelihood: risk.likelihood,
        impact: risk.impact,
        status: risk.status,
        mitigation_plan: risk.mitigation_plan,
      });

      if (!error) {
        toast({ title: "Risk added" });
        fetchAllData();
      }
    }
    setEditingRisk(null);
  };

  const handleDeleteRisk = async (id: string) => {
    const { error } = await supabase.from("project_risks").delete().eq("id", id);
    if (!error) {
      toast({ title: "Risk deleted" });
      fetchAllData();
    }
  };

  // Issue handlers
  const handleSaveIssue = async (issue: Omit<Issue, "id"> & { id?: string }) => {
    if (issue.id) {
      const { error } = await supabase
        .from("project_issues")
        .update({
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          status: issue.status,
          resolution: issue.resolution,
          target_resolution_date: issue.target_resolution_date,
          resolved_date: issue.resolved_date,
        })
        .eq("id", issue.id);

      if (!error) {
        toast({ title: "Issue updated" });
        fetchAllData();
      }
    } else {
      const { error } = await supabase.from("project_issues").insert({
        project_id: projectId,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        status: issue.status,
        raised_date: issue.raised_date,
        target_resolution_date: issue.target_resolution_date,
      });

      if (!error) {
        toast({ title: "Issue added" });
        fetchAllData();
      }
    }
    setEditingIssue(null);
  };

  const handleDeleteIssue = async (id: string) => {
    const { error } = await supabase.from("project_issues").delete().eq("id", id);
    if (!error) {
      toast({ title: "Issue deleted" });
      fetchAllData();
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(`/projects/${projectId}`)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Project
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Dashboard */}
        <StatusDashboard
          project={project}
          tasks={tasks}
          milestones={milestones}
          risks={risks}
          issues={issues}
          teamMembers={teamMembers}
          onMilestoneClick={(m) => {
            setEditingMilestone(m);
            setMilestoneFormOpen(true);
          }}
          onRiskClick={(r) => {
            setEditingRisk(r);
            setRiskFormOpen(true);
          }}
        />

        {/* Forms */}
        <MilestoneForm
          open={milestoneFormOpen}
          onOpenChange={setMilestoneFormOpen}
          milestone={editingMilestone}
          projectId={projectId!}
          onSave={handleSaveMilestone}
          onDelete={handleDeleteMilestone}
        />

        <RiskForm
          open={riskFormOpen}
          onOpenChange={setRiskFormOpen}
          risk={editingRisk}
          projectId={projectId!}
          onSave={handleSaveRisk}
          onDelete={handleDeleteRisk}
        />

        <IssueForm
          open={issueFormOpen}
          onOpenChange={setIssueFormOpen}
          issue={editingIssue}
          projectId={projectId!}
          onSave={handleSaveIssue}
          onDelete={handleDeleteIssue}
        />
      </div>
    </AppLayout>
  );
}
