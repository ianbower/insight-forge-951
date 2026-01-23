import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";


import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { TeamMember } from "./TeamMemberCard";
import { AvailabilityCalendar } from "./AvailabilityCalendar";
import {
  User,
  Briefcase,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Clock,
  TrendingUp,
  CheckCircle2,
  CalendarPlus,
} from "lucide-react";

interface ProjectAssignment {
  id: string;
  project_id: string;
  project_name: string;
  project_status: string;
  role_in_project: string;
  allocation_percentage: number;
  start_date: string | null;
  end_date: string | null;
  is_pipeline?: boolean;
}

interface AvailableProject {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
}

interface TeamMemberDetailSheetProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (member: TeamMember) => void;
  onUpdate: () => void;
}

const projectRoles = ["Team Lead", "Workstream Lead", "Team Member", "Subject Matter Expert", "Analyst"];

const levelColors: Record<string, string> = {
  Partner: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  Director: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Manager: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Consultant: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Analyst: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export function TeamMemberDetailSheet({
  member,
  open,
  onOpenChange,
  onEdit,
  onUpdate,
}: TeamMemberDetailSheetProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [availableProjects, setAvailableProjects] = useState<AvailableProject[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // For adding new assignment
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedRole, setSelectedRole] = useState("Team Member");
  const [allocation, setAllocation] = useState(100);
  const [addingAssignment, setAddingAssignment] = useState(false);
  
  // For future assignments
  const [futureStartDate, setFutureStartDate] = useState<Date | undefined>(undefined);
  const [futureAllocation, setFutureAllocation] = useState(100);
  const [selectedFutureProject, setSelectedFutureProject] = useState("");
  const [selectedFutureRole, setSelectedFutureRole] = useState("Team Member");

  useEffect(() => {
    if (member && open) {
      fetchAssignments();
      fetchAvailableProjects();
    }
  }, [member, open]);

  const fetchAssignments = async () => {
    if (!member) return;
    setLoadingAssignments(true);

    const { data, error } = await supabase
      .from("project_team_assignments")
      .select(`
        id,
        project_id,
        role_in_project,
        allocation_percentage,
        start_date,
        end_date,
        projects:project_id (name, status)
      `)
      .eq("team_member_id", member.id);

    if (error) {
      console.error("Error fetching assignments:", error);
    } else {
      const formatted = (data || []).map((a: any) => ({
        id: a.id,
        project_id: a.project_id,
        project_name: a.projects?.name || "Unknown",
        project_status: a.projects?.status || "Unknown",
        role_in_project: a.role_in_project,
        allocation_percentage: a.allocation_percentage,
        start_date: a.start_date,
        end_date: a.end_date,
      }));
      setAssignments(formatted);
    }
    setLoadingAssignments(false);
  };

  const fetchAvailableProjects = async () => {
    // Use the security definer function to get projects based on user's role
    const { data, error } = await supabase.rpc("get_projects_for_assignment");

    if (error) {
      console.error("Error fetching projects:", error);
      // Fallback to direct query if function doesn't exist
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("projects")
        .select("id, name, status, start_date, end_date")
        .in("status", ["Active", "Planning", "On Hold", "Proposed"])
        .order("name");
      
      if (!fallbackError && fallbackData) {
        setAvailableProjects(fallbackData);
      }
    } else {
      setAvailableProjects(data || []);
    }
  };

  const handleAddAssignment = async (isPipeline: boolean = false) => {
    if (!member || !selectedProject) return;
    setAddingAssignment(true);

    // For pipeline, set allocation to 0 and use a future start date
    const assignmentData = {
      team_member_id: member.id,
      project_id: selectedProject,
      role_in_project: selectedRole,
      allocation_percentage: isPipeline ? 0 : allocation,
      start_date: isPipeline ? null : new Date().toISOString().split('T')[0],
    };

    const { error } = await supabase.from("project_team_assignments").insert(assignmentData);

    if (error) {
      toast({ title: "Error adding assignment", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isPipeline ? "Added to pipeline" : "Assignment added" });
      fetchAssignments();
      setSelectedProject("");
      setAllocation(100);
      onUpdate();
    }
    setAddingAssignment(false);
  };

  const handleAddFutureAssignment = async () => {
    if (!member || !selectedFutureProject || !futureStartDate) return;
    setAddingAssignment(true);

    const assignmentData = {
      team_member_id: member.id,
      project_id: selectedFutureProject,
      role_in_project: selectedFutureRole,
      allocation_percentage: futureAllocation,
      start_date: format(futureStartDate, 'yyyy-MM-dd'),
    };

    const { error } = await supabase.from("project_team_assignments").insert(assignmentData);

    if (error) {
      toast({ title: "Error adding future assignment", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Future assignment scheduled" });
      fetchAssignments();
      setSelectedFutureProject("");
      setFutureStartDate(undefined);
      setFutureAllocation(100);
      onUpdate();
    }
    setAddingAssignment(false);
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    const { error } = await supabase.from("project_team_assignments").delete().eq("id", assignmentId);

    if (error) {
      toast({ title: "Error removing assignment", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Assignment removed" });
      fetchAssignments();
      onUpdate();
    }
  };

  if (!member) return null;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Separate active assignments from pipeline and future
  const today = new Date().toISOString().split('T')[0];
  const currentAssignments = assignments.filter((a) => 
    a.allocation_percentage > 0 && (!a.start_date || a.start_date <= today)
  );
  const futureAssignments = assignments.filter((a) => 
    a.allocation_percentage > 0 && a.start_date && a.start_date > today
  );
  const pipelineAssignments = assignments.filter((a) => a.allocation_percentage === 0);
  
  const totalAllocated = currentAssignments.reduce((sum, a) => sum + a.allocation_percentage, 0);
  const remainingCapacity = Math.max(0, member.availability_percentage - totalAllocated);

  // Filter out already assigned projects (both active and pipeline)
  const unassignedProjects = availableProjects.filter(
    (p) => !assignments.find((a) => a.project_id === p.id)
  );
  
  // Projects that can be started now (Active, Planning)
  const activeProjects = unassignedProjects.filter((p) => 
    ["Active", "Planning", "On Hold"].includes(p.status)
  );
  
  // All projects available for future assignment

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-background shadow-lg">
              <AvatarImage src={member.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold text-lg">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl">{member.name}</SheetTitle>
              <p className="text-sm text-muted-foreground">{member.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={cn("font-medium", levelColors[member.level])}>
                  {member.level}
                </Badge>
                <Badge variant="secondary">{member.role}</Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="overview" className="gap-2">
              <User className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="availability" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Availability
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                {member.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {member.skills.map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="bg-background/50">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No skills added</p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">${member.hourly_rate || "—"}/hr</div>
                  <p className="text-sm text-muted-foreground">Hourly Rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full",
                        remainingCapacity >= 50
                          ? "bg-emerald-500"
                          : remainingCapacity >= 20
                          ? "bg-amber-500"
                          : "bg-red-500"
                      )}
                    />
                    <div className="text-2xl font-bold">{remainingCapacity}%</div>
                  </div>
                  <p className="text-sm text-muted-foreground">Available Capacity</p>
                </CardContent>
              </Card>
            </div>

            <Button className="w-full" onClick={() => onEdit(member)}>
              Edit Details
            </Button>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="mt-4 space-y-4">
            {/* Current Assignments */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Current Assignments</h3>
              {loadingAssignments ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : currentAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active project assignments</p>
              ) : (
                currentAssignments.map((assignment) => (
                  <Card key={assignment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{assignment.project_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {assignment.role_in_project}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {assignment.allocation_percentage}% allocated
                            </span>
                          </div>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "mt-2 text-xs",
                              assignment.project_status === "Active" && "bg-emerald-500/20 text-emerald-400"
                            )}
                          >
                            {assignment.project_status}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveAssignment(assignment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Pipeline Assignments */}
            {pipelineAssignments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pipeline (Future Projects)
                  </h3>
                  {pipelineAssignments.map((assignment) => (
                    <Card key={assignment.id} className="border-dashed">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{assignment.project_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {assignment.role_in_project}
                              </Badge>
                              <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400">
                                Pipeline
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveAssignment(assignment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            <Separator />

            {/* Add New Assignment */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Add to Project</h3>

              {unassignedProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No available projects</p>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {projectRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Allocation (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={allocation}
                        onChange={(e) => setAllocation(parseInt(e.target.value) || 0)}
                        className="bg-background"
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={() => handleAddAssignment(false)}
                    disabled={!selectedProject || addingAssignment}
                  >
                    <Plus className="h-4 w-4" />
                    Add Assignment
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Availability Tab */}
          <TabsContent value="availability" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Capacity Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Availability</span>
                    <span className="font-medium">{member.availability_percentage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${member.availability_percentage}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Currently Allocated</span>
                    <span className="font-medium">{totalAllocated}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        totalAllocated > member.availability_percentage
                          ? "bg-destructive"
                          : "bg-amber-500"
                      )}
                      style={{ width: `${Math.min(totalAllocated, 100)}%` }}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="font-medium">Remaining Capacity</span>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full",
                        remainingCapacity >= 50
                          ? "bg-emerald-500"
                          : remainingCapacity >= 20
                          ? "bg-amber-500"
                          : "bg-red-500"
                      )}
                    />
                    <span className="text-lg font-bold">{remainingCapacity}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Availability Calendar */}
            <AvailabilityCalendar
              assignments={assignments}
              totalAvailability={member.availability_percentage}
            />

            {/* Upcoming/Future Assignments */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4" />
                  Upcoming Assignments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {futureAssignments.length === 0 && pipelineAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming assignments scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {/* Future dated assignments */}
                    {futureAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/20"
                      >
                        <div>
                          <p className="font-medium text-sm">{assignment.project_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {assignment.role_in_project}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {assignment.allocation_percentage}%
                            </span>
                          </div>
                          {assignment.start_date && (
                            <p className="text-xs text-primary mt-1">
                              Starts {format(new Date(assignment.start_date), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveAssignment(assignment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {/* Pipeline (0% allocation) assignments */}
                    {pipelineAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10 border border-blue-500/20"
                      >
                        <div>
                          <p className="font-medium text-sm">{assignment.project_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {assignment.role_in_project}
                            </Badge>
                            <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400">
                              Pipeline
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveAssignment(assignment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />
              </CardContent>
            </Card>

            {/* Schedule Future Assignment - Separate Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4" />
                  Schedule Future Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {unassignedProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No projects available</p>
                ) : (
                  <>
                    <Select value={selectedFutureProject} onValueChange={setSelectedFutureProject}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {unassignedProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} ({project.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="space-y-1">
                      <Label className="text-xs">Start Date</Label>
                      <Input
                        type="date"
                        value={futureStartDate ? format(futureStartDate, "yyyy-MM-dd") : ""}
                        onChange={(e) => setFutureStartDate(e.target.value ? new Date(e.target.value) : undefined)}
                        min={format(new Date(), "yyyy-MM-dd")}
                        className="bg-background"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Allocation (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={futureAllocation}
                          onChange={(e) => setFutureAllocation(parseInt(e.target.value) || 0)}
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Role</Label>
                        <Select value={selectedFutureRole} onValueChange={setSelectedFutureRole}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {projectRoles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Button
                      className="w-full gap-2"
                      onClick={handleAddFutureAssignment}
                      disabled={!selectedFutureProject || !futureStartDate || addingAssignment}
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Schedule Assignment
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* When Next Available */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  When Next Available
                </CardTitle>
              </CardHeader>
              <CardContent>
                {remainingCapacity >= 50 ? (
                  <p className="text-sm text-emerald-500 font-medium">Available now ({remainingCapacity}% capacity)</p>
                ) : remainingCapacity >= 20 ? (
                  <p className="text-sm text-amber-500 font-medium">Partially available ({remainingCapacity}% capacity)</p>
                ) : currentAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active assignments</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-red-400 font-medium">Fully allocated ({remainingCapacity}% remaining)</p>
                    <p className="text-xs text-muted-foreground">
                      Capacity will free up when current projects complete.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
