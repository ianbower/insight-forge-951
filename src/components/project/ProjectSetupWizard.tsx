import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Building2,
  FileText,
  Users,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Upload,
  X,
  DollarSign,
  Calendar,
  Briefcase,
} from "lucide-react";

interface ProjectSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Deliverable {
  id: string;
  title: string;
  description: string;
  dueDate: string;
}

interface TeamAssignment {
  memberId: string;
  memberName: string;
  role: string;
  allocation: number;
}

interface FormData {
  // Step 1: Project Details
  clientId: string;
  clientName: string;
  isNewClient: boolean;
  clientIndustry: string;
  projectName: string;
  projectType: "time_materials" | "fixed_price" | "internal";
  description: string;
  startDate: string;
  endDate: string;
  budgetAmount: string;
  currency: string;
  status: string;
  // Step 2: Deliverables
  deliverables: Deliverable[];
  // Step 3: SOW
  sowFile: File | null;
  // Step 4: Team
  teamAssignments: TeamAssignment[];
  // Step 5: Runbooks & Assessments
  selectedRunbookId: string;
  selectedAssessmentIds: string[];
}

const WIZARD_STEPS = [
  { id: 1, title: "Project Details", icon: Building2 },
  { id: 2, title: "Deliverables", icon: FileText },
  { id: 3, title: "Team", icon: Users },
  { id: 4, title: "Runbooks", icon: BookOpen },
  { id: 5, title: "Review", icon: CheckCircle2 },
];

const PROJECT_TYPES = [
  { value: "time_materials", label: "Time & Materials", description: "Bill based on hours worked" },
  { value: "fixed_price", label: "Fixed Price", description: "Set project fee" },
  { value: "internal", label: "Internal", description: "Non-billable internal project" },
];

const INDUSTRIES = [
  "Financial Services",
  "Healthcare",
  "Technology",
  "Manufacturing",
  "Retail",
  "Energy",
  "Public Sector",
  "Telecommunications",
  "Other",
];

const PROJECT_ROLES = ["Project Lead", "Workstream Lead", "Team Member", "Subject Matter Expert", "Analyst"];

export function ProjectSetupWizard({ open, onOpenChange, onSuccess }: ProjectSetupWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Data for dropdowns
  const [existingClients, setExistingClients] = useState<{ id: string; name: string; industry: string }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [runbooks, setRunbooks] = useState<{ id: string; name: string }[]>([]);
  const [assessments, setAssessments] = useState<{ id: string; name: string }[]>([]);

  const [formData, setFormData] = useState<FormData>({
    clientId: "",
    clientName: "",
    isNewClient: true,
    clientIndustry: "",
    projectName: "",
    projectType: "time_materials",
    description: "",
    startDate: "",
    endDate: "",
    budgetAmount: "",
    currency: "USD",
    status: "Proposed",
    deliverables: [],
    sowFile: null,
    teamAssignments: [],
    selectedRunbookId: "",
    selectedAssessmentIds: [],
  });

  useEffect(() => {
    if (open) {
      fetchInitialData();
    }
  }, [open]);

  const fetchInitialData = async () => {
    const [clientsRes, membersRes, runbooksRes, assessmentsRes] = await Promise.all([
      supabase.from("clients").select("id, name, industry").order("name"),
      supabase.from("team_members").select("id, name, role").order("name"),
      supabase.from("runbook_templates").select("id, name").order("name"),
      supabase.from("assessment_templates").select("id, name").order("name"),
    ]);

    if (clientsRes.data) setExistingClients(clientsRes.data);
    if (membersRes.data) setTeamMembers(membersRes.data);
    if (runbooksRes.data) setRunbooks(runbooksRes.data);
    if (assessmentsRes.data) setAssessments(assessmentsRes.data);
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.projectName.trim() !== "" &&
          ((formData.isNewClient && formData.clientName.trim() !== "") || (!formData.isNewClient && formData.clientId !== ""))
        );
      default:
        return true;
    }
  };

  const addDeliverable = () => {
    setFormData({
      ...formData,
      deliverables: [
        ...formData.deliverables,
        { id: crypto.randomUUID(), title: "", description: "", dueDate: "" },
      ],
    });
  };

  const updateDeliverable = (id: string, field: keyof Deliverable, value: string) => {
    setFormData({
      ...formData,
      deliverables: formData.deliverables.map((d) =>
        d.id === id ? { ...d, [field]: value } : d
      ),
    });
  };

  const removeDeliverable = (id: string) => {
    setFormData({
      ...formData,
      deliverables: formData.deliverables.filter((d) => d.id !== id),
    });
  };

  const addTeamMember = (memberId: string) => {
    const member = teamMembers.find((m) => m.id === memberId);
    if (member && !formData.teamAssignments.find((a) => a.memberId === memberId)) {
      setFormData({
        ...formData,
        teamAssignments: [
          ...formData.teamAssignments,
          { memberId, memberName: member.name, role: "Team Member", allocation: 100 },
        ],
      });
    }
  };

  const updateTeamAssignment = (memberId: string, field: "role" | "allocation", value: string | number) => {
    setFormData({
      ...formData,
      teamAssignments: formData.teamAssignments.map((a) =>
        a.memberId === memberId ? { ...a, [field]: value } : a
      ),
    });
  };

  const removeTeamAssignment = (memberId: string) => {
    setFormData({
      ...formData,
      teamAssignments: formData.teamAssignments.filter((a) => a.memberId !== memberId),
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, sowFile: file });
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create or get client
      let clientId = formData.clientId;
      if (formData.isNewClient && formData.clientName) {
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .insert({
            name: formData.clientName,
            industry: formData.clientIndustry,
            owner_id: user.id,
            created_by: user.id,
          })
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = clientData.id;
      }

      // Step 2: Upload SOW file if provided
      let sowFileUrl = null;
      let sowFileName = null;
      if (formData.sowFile) {
        const fileExt = formData.sowFile.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("project-documents")
          .upload(filePath, formData.sowFile);

        if (uploadError) {
          console.error("Error uploading SOW:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from("project-documents")
            .getPublicUrl(filePath);
          sowFileUrl = urlData.publicUrl;
          sowFileName = formData.sowFile.name;
        }
      }

      // Step 3: Create project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert({
          client_id: clientId || null,
          name: formData.projectName,
          status: formData.status,
          project_type: formData.projectType,
          description: formData.description,
          start_date: formData.startDate || null,
          end_date: formData.endDate || null,
          budget_amount: formData.budgetAmount ? parseFloat(formData.budgetAmount) : null,
          currency: formData.currency,
          sow_file_url: sowFileUrl,
          sow_file_name: sowFileName,
          runbook_id: formData.selectedRunbookId || null,
          owner_id: user.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Step 4: Add creator as project member
      await supabase.from("project_members").insert({
        project_id: projectData.id,
        user_id: user.id,
        role_in_project: "lead",
        can_manage: true,
      });

      // Step 5: Create deliverables
      if (formData.deliverables.length > 0) {
        const deliverablesData = formData.deliverables
          .filter((d) => d.title.trim())
          .map((d, index) => ({
            project_id: projectData.id,
            title: d.title,
            description: d.description || null,
            due_date: d.dueDate || null,
            order_index: index,
          }));

        if (deliverablesData.length > 0) {
          await supabase.from("project_deliverables").insert(deliverablesData);
        }
      }

      // Step 6: Create team assignments
      if (formData.teamAssignments.length > 0) {
        const assignmentsData = formData.teamAssignments.map((a) => ({
          project_id: projectData.id,
          team_member_id: a.memberId,
          role_in_project: a.role,
          allocation_percentage: a.allocation,
          start_date: formData.startDate || null,
          assignment_status: "confirmed",
        }));

        await supabase.from("project_team_assignments").insert(assignmentsData);
      }

      // Step 7: Create runbook tasks if runbook selected
      if (formData.selectedRunbookId) {
        const { data: runbookData } = await supabase
          .from("runbook_templates")
          .select("workflow_json")
          .eq("id", formData.selectedRunbookId)
          .single();

        if (runbookData?.workflow_json) {
          const steps = runbookData.workflow_json as any[];
          const tasksData = steps.map((step: any, index: number) => ({
            project_id: projectData.id,
            title: step.title || step.name || `Step ${index + 1}`,
            description: step.description || null,
            status: "pending",
            order_index: index,
            tool_link: step.tool || null,
          }));

          if (tasksData.length > 0) {
            await supabase.from("project_tasks").insert(tasksData);
          }
        }
      }

      toast({
        title: "Project created",
        description: `${formData.projectName} has been set up successfully.`,
      });

      // Reset and close
      resetForm();
      onOpenChange(false);
      onSuccess();
      
      // Navigate to the new project
      navigate(`/projects/${projectData.id}`);
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast({
        title: "Error creating project",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      clientId: "",
      clientName: "",
      isNewClient: true,
      clientIndustry: "",
      projectName: "",
      projectType: "time_materials",
      description: "",
      startDate: "",
      endDate: "",
      budgetAmount: "",
      currency: "USD",
      status: "Proposed",
      deliverables: [],
      sowFile: null,
      teamAssignments: [],
      selectedRunbookId: "",
      selectedAssessmentIds: [],
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Client Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label className="text-muted-foreground">Client</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.isNewClient ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, isNewClient: true, clientId: "" })}
                  >
                    New Client
                  </Button>
                  <Button
                    type="button"
                    variant={!formData.isNewClient ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, isNewClient: false, clientName: "" })}
                  >
                    Existing Client
                  </Button>
                </div>
              </div>

              {formData.isNewClient ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client Name *</Label>
                    <Input
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      placeholder="Enter client name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select
                      value={formData.clientIndustry}
                      onValueChange={(v) => setFormData({ ...formData, clientIndustry: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((ind) => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Select Client *</Label>
                  <Select
                    value={formData.clientId}
                    onValueChange={(v) => setFormData({ ...formData, clientId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} {client.industry && `(${client.industry})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Separator />

            {/* Project Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Project Name *</Label>
                <Input
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  placeholder="e.g., Digital Transformation Strategy"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief project overview..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Project Type *</Label>
                <div className="grid grid-cols-3 gap-3">
                  {PROJECT_TYPES.map((type) => (
                    <Card
                      key={type.value}
                      className={cn(
                        "cursor-pointer transition-all hover:border-primary/50",
                        formData.projectType === type.value && "border-primary bg-primary/5"
                      )}
                      onClick={() => setFormData({ ...formData, projectType: type.value as any })}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={formData.projectType === type.value} />
                          <div>
                            <p className="font-medium text-sm">{type.label}</p>
                            <p className="text-xs text-muted-foreground">{type.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Start Date
                  </Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> End Date
                  </Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              {formData.projectType !== "internal" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> Budget Amount
                    </Label>
                    <Input
                      type="number"
                      value={formData.budgetAmount}
                      onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(v) => setFormData({ ...formData, currency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="AUD">AUD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Initial Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Proposed">Proposed</SelectItem>
                    <SelectItem value="Planning">Planning</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* SOW Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Statement of Work
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  {formData.sowFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {formData.sowFile.name}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setFormData({ ...formData, sowFile: null })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Project Deliverables</h3>
                <p className="text-sm text-muted-foreground">Define the key outputs of this project</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addDeliverable}>
                <Plus className="h-4 w-4 mr-2" /> Add Deliverable
              </Button>
            </div>

            {formData.deliverables.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No deliverables added yet</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addDeliverable}>
                    <Plus className="h-4 w-4 mr-2" /> Add First Deliverable
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {formData.deliverables.map((deliverable, index) => (
                  <Card key={deliverable.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <span className="text-sm font-medium text-muted-foreground mt-2">
                          {index + 1}.
                        </span>
                        <div className="flex-1 space-y-3">
                          <Input
                            value={deliverable.title}
                            onChange={(e) => updateDeliverable(deliverable.id, "title", e.target.value)}
                            placeholder="Deliverable title"
                          />
                          <Textarea
                            value={deliverable.description}
                            onChange={(e) => updateDeliverable(deliverable.id, "description", e.target.value)}
                            placeholder="Description (optional)"
                            rows={2}
                          />
                          <Input
                            type="date"
                            value={deliverable.dueDate}
                            onChange={(e) => updateDeliverable(deliverable.id, "dueDate", e.target.value)}
                            className="max-w-[200px]"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeDeliverable(deliverable.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Team Assignment</h3>
                <p className="text-sm text-muted-foreground">Assign team members from your library</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Add Team Member</Label>
              <Select onValueChange={addTeamMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member..." />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers
                    .filter((m) => !formData.teamAssignments.find((a) => a.memberId === m.id))
                    .map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} ({member.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {formData.teamAssignments.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No team members assigned yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {formData.teamAssignments.map((assignment) => (
                  <Card key={assignment.memberId}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <p className="font-medium">{assignment.memberName}</p>
                        </div>
                        <Select
                          value={assignment.role}
                          onValueChange={(v) => updateTeamAssignment(assignment.memberId, "role", v)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROJECT_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>{role}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={assignment.allocation}
                            onChange={(e) => updateTeamAssignment(assignment.memberId, "allocation", parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeTeamAssignment(assignment.memberId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-medium">Runbook Template</h3>
              <p className="text-sm text-muted-foreground mb-4">Select a runbook to pre-populate project workflow</p>
              
              <Select
                value={formData.selectedRunbookId}
                onValueChange={(v) => setFormData({ ...formData, selectedRunbookId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a runbook template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {runbooks.map((runbook) => (
                    <SelectItem key={runbook.id} value={runbook.id}>
                      {runbook.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium">Assessments</h3>
              <p className="text-sm text-muted-foreground mb-4">Link assessment templates to this project</p>
              
              {assessments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assessment templates available</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {assessments.map((assessment) => (
                    <Card
                      key={assessment.id}
                      className={cn(
                        "cursor-pointer transition-all hover:border-primary/50",
                        formData.selectedAssessmentIds.includes(assessment.id) && "border-primary bg-primary/5"
                      )}
                      onClick={() => {
                        const newIds = formData.selectedAssessmentIds.includes(assessment.id)
                          ? formData.selectedAssessmentIds.filter((id) => id !== assessment.id)
                          : [...formData.selectedAssessmentIds, assessment.id];
                        setFormData({ ...formData, selectedAssessmentIds: newIds });
                      }}
                    >
                      <CardContent className="p-3 flex items-center gap-2">
                        <Checkbox checked={formData.selectedAssessmentIds.includes(assessment.id)} />
                        <span className="text-sm">{assessment.name}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center pb-4">
              <CheckCircle2 className="h-12 w-12 mx-auto text-primary mb-3" />
              <h3 className="text-lg font-medium">Review Project Setup</h3>
              <p className="text-sm text-muted-foreground">Confirm the details before creating</p>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">
                    {formData.isNewClient ? formData.clientName : existingClients.find((c) => c.id === formData.clientId)?.name || "—"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project Name</span>
                  <span className="font-medium">{formData.projectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="outline">
                    {PROJECT_TYPES.find((t) => t.value === formData.projectType)?.label}
                  </Badge>
                </div>
                {formData.startDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timeline</span>
                    <span className="font-medium">
                      {format(new Date(formData.startDate), "MMM d, yyyy")}
                      {formData.endDate && ` - ${format(new Date(formData.endDate), "MMM d, yyyy")}`}
                    </span>
                  </div>
                )}
                {formData.budgetAmount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="font-medium">
                      {formData.currency} {parseFloat(formData.budgetAmount).toLocaleString()}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deliverables</span>
                  <span className="font-medium">{formData.deliverables.filter((d) => d.title).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Team Members</span>
                  <span className="font-medium">{formData.teamAssignments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Runbook</span>
                  <span className="font-medium">
                    {formData.selectedRunbookId
                      ? runbooks.find((r) => r.id === formData.selectedRunbookId)?.name
                      : "None"}
                  </span>
                </div>
                {formData.sowFile && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SOW Document</span>
                    <span className="font-medium text-sm">{formData.sowFile.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            New Project Setup
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-lg">
          {WIZARD_STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "bg-primary/20 text-primary",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}
                >
                  <StepIcon className="h-4 w-4" />
                  <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4 px-1">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {currentStep < WIZARD_STEPS.length ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Creating..." : "Create Project"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
