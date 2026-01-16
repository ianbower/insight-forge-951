import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ArrowLeft,
  Send,
  Plus,
  Users,
  Mail,
  Link2,
  Copy,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Settings,
  Download,
  RefreshCw,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AssessmentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  framework_type: string | null;
}

interface AssessmentInstance {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  allow_anonymous: boolean;
}

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  organization: string | null;
  industry: string | null;
  token: string;
  status: string;
  invited_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export default function AssessmentLaunch() {
  const { assessmentId, instanceId } = useParams<{ assessmentId: string; instanceId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [template, setTemplate] = useState<AssessmentTemplate | null>(null);
  const [instance, setInstance] = useState<AssessmentInstance | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  const [newRecipient, setNewRecipient] = useState({
    email: "",
    name: "",
    role: "",
    organization: "",
    industry: "Technology",
  });

  const [bulkEmails, setBulkEmails] = useState("");

  const [instanceSettings, setInstanceSettings] = useState({
    name: "",
    description: "",
    allow_anonymous: true,
    end_date: "",
  });

  useEffect(() => {
    fetchData();
  }, [assessmentId, instanceId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch template
    const { data: templateData } = await supabase
      .from("assessment_templates")
      .select("*")
      .eq("id", assessmentId)
      .single();

    if (templateData) {
      setTemplate(templateData);
      setInstanceSettings((prev) => ({
        ...prev,
        name: prev.name || `${templateData.name} - ${format(new Date(), "MMM yyyy")}`,
      }));
    }

    // Fetch or create instance
    if (instanceId) {
      const { data: instanceData } = await supabase
        .from("assessment_instances")
        .select("*")
        .eq("id", instanceId)
        .single();

      if (instanceData) {
        setInstance(instanceData);
        setInstanceSettings({
          name: instanceData.name,
          description: instanceData.description || "",
          allow_anonymous: instanceData.allow_anonymous,
          end_date: instanceData.end_date?.split("T")[0] || "",
        });

        // Fetch recipients
        const { data: recipientsData } = await supabase
          .from("assessment_recipients")
          .select("*")
          .eq("assessment_instance_id", instanceId)
          .order("invited_at", { ascending: false });

        setRecipients(recipientsData || []);
      }
    }

    setLoading(false);
  };

  const handleCreateInstance = async () => {
    const { data, error } = await supabase
      .from("assessment_instances")
      .insert({
        assessment_template_id: assessmentId,
        name: instanceSettings.name,
        description: instanceSettings.description || null,
        allow_anonymous: instanceSettings.allow_anonymous,
        end_date: instanceSettings.end_date || null,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Assessment created" });
      navigate(`/assessments/${assessmentId}/launch/${data.id}`);
    }
  };

  const handleUpdateInstance = async () => {
    if (!instance) return;

    const { error } = await supabase
      .from("assessment_instances")
      .update({
        name: instanceSettings.name,
        description: instanceSettings.description || null,
        allow_anonymous: instanceSettings.allow_anonymous,
        end_date: instanceSettings.end_date || null,
      })
      .eq("id", instance.id);

    if (!error) {
      toast({ title: "Settings updated" });
      fetchData();
    }
  };

  const handleLaunchAssessment = async () => {
    if (!instance) return;

    const { error } = await supabase
      .from("assessment_instances")
      .update({ status: "active", start_date: new Date().toISOString() })
      .eq("id", instance.id);

    if (!error) {
      toast({ title: "Assessment launched!", description: "Invitations are ready to send." });
      fetchData();
    }
  };

  const handleAddRecipient = async () => {
    if (!instance || !newRecipient.email) return;

    const { data, error } = await supabase
      .from("assessment_recipients")
      .insert({
        assessment_instance_id: instance.id,
        email: newRecipient.email,
        name: newRecipient.name || null,
        role: newRecipient.role || null,
        organization: newRecipient.organization || null,
        industry: newRecipient.industry || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRecipients([data, ...recipients]);
      setShowAddRecipient(false);
      setNewRecipient({ email: "", name: "", role: "", organization: "", industry: "Technology" });
      toast({ title: "Recipient added" });
    }
  };

  const handleBulkAdd = async () => {
    if (!instance || !bulkEmails.trim()) return;

    const emails = bulkEmails
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    const insertData = emails.map((email) => ({
      assessment_instance_id: instance.id,
      email,
    }));

    const { data, error } = await supabase
      .from("assessment_recipients")
      .insert(insertData)
      .select();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRecipients([...(data || []), ...recipients]);
      setShowBulkAdd(false);
      setBulkEmails("");
      toast({ title: `${data?.length || 0} recipients added` });
    }
  };

  const handleDeleteRecipient = async (id: string) => {
    const { error } = await supabase.from("assessment_recipients").delete().eq("id", id);
    if (!error) {
      setRecipients(recipients.filter((r) => r.id !== id));
      toast({ title: "Recipient removed" });
    }
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/assess/${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied to clipboard" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "started":
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Mail className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const stats = {
    total: recipients.length,
    pending: recipients.filter((r) => r.status === "pending").length,
    started: recipients.filter((r) => r.status === "started").length,
    completed: recipients.filter((r) => r.status === "completed").length,
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Assessment not found</p>
      </div>
    );
  }

  // Show setup form if no instance yet
  if (!instanceId || !instance) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/assessments/${assessmentId}/builder`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Builder
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Launch Assessment
            </CardTitle>
            <CardDescription>
              Configure your assessment before sending it to recipients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Assessment Name *</Label>
              <Input
                value={instanceSettings.name}
                onChange={(e) => setInstanceSettings({ ...instanceSettings, name: e.target.value })}
                placeholder="e.g., Q1 2024 Digital Maturity Assessment"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={instanceSettings.description}
                onChange={(e) =>
                  setInstanceSettings({ ...instanceSettings, description: e.target.value })
                }
                placeholder="Add context for recipients..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date (Optional)</Label>
              <Input
                type="date"
                value={instanceSettings.end_date}
                onChange={(e) =>
                  setInstanceSettings({ ...instanceSettings, end_date: e.target.value })
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label>Allow Anonymous Responses</Label>
                <p className="text-sm text-muted-foreground">
                  Recipients can complete without providing identifying info
                </p>
              </div>
              <Switch
                checked={instanceSettings.allow_anonymous}
                onCheckedChange={(checked) =>
                  setInstanceSettings({ ...instanceSettings, allow_anonymous: checked })
                }
              />
            </div>

            <Button onClick={handleCreateInstance} className="w-full gap-2">
              <Play className="h-4 w-4" />
              Create Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/assessments/${assessmentId}/builder`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">{instance.name}</h1>
            <p className="text-sm text-muted-foreground">{template.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats.completed > 0 && (
            <Button 
              variant="outline" 
              onClick={() => navigate(`/assessments/${assessmentId}/results/${instanceId}`)}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              View Results
            </Button>
          )}
          {instance.status === "draft" ? (
            <Button onClick={handleLaunchAssessment} className="gap-2">
              <Play className="h-4 w-4" />
              Launch Assessment
            </Button>
          ) : (
            <Badge
              className={cn(
                instance.status === "active"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {instance.status === "active" ? "Live" : instance.status}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Recipients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Mail className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.started}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completionRate}%</p>
                <p className="text-sm text-muted-foreground">Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="recipients" className="w-full">
        <TabsList>
          <TabsTrigger value="recipients">Recipients</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="recipients" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Recipients</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowBulkAdd(true)} className="gap-2">
                <Download className="h-4 w-4" />
                Bulk Import
              </Button>
              <Button onClick={() => setShowAddRecipient(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Recipient
              </Button>
            </div>
          </div>

          {recipients.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No recipients yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Add people who should complete this assessment
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowBulkAdd(true)}>
                    Bulk Import
                  </Button>
                  <Button onClick={() => setShowAddRecipient(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Recipient
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((recipient) => (
                    <TableRow key={recipient.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{recipient.name || recipient.email}</p>
                          {recipient.name && (
                            <p className="text-sm text-muted-foreground">{recipient.email}</p>
                          )}
                          {recipient.role && (
                            <p className="text-xs text-muted-foreground">{recipient.role}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{recipient.organization || "-"}</p>
                          {recipient.industry && (
                            <p className="text-xs text-muted-foreground">{recipient.industry}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(recipient.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyLink(recipient.token)}
                            className="gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(`/assess/${recipient.token}`, "_blank")}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteRecipient(recipient.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Assessment Name</Label>
                <Input
                  value={instanceSettings.name}
                  onChange={(e) =>
                    setInstanceSettings({ ...instanceSettings, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={instanceSettings.description}
                  onChange={(e) =>
                    setInstanceSettings({ ...instanceSettings, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={instanceSettings.end_date}
                  onChange={(e) =>
                    setInstanceSettings({ ...instanceSettings, end_date: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <Label>Allow Anonymous Responses</Label>
                  <p className="text-sm text-muted-foreground">
                    Recipients can skip providing personal info
                  </p>
                </div>
                <Switch
                  checked={instanceSettings.allow_anonymous}
                  onCheckedChange={(checked) =>
                    setInstanceSettings({ ...instanceSettings, allow_anonymous: checked })
                  }
                />
              </div>

              <Button onClick={handleUpdateInstance}>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Recipient Dialog */}
      <Dialog open={showAddRecipient} onOpenChange={setShowAddRecipient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Recipient</DialogTitle>
            <DialogDescription>
              Add a person to receive this assessment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newRecipient.email}
                onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newRecipient.name}
                onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={newRecipient.role}
                  onChange={(e) => setNewRecipient({ ...newRecipient, role: e.target.value })}
                  placeholder="CTO"
                />
              </div>
              <div className="space-y-2">
                <Label>Organization</Label>
                <Input
                  value={newRecipient.organization}
                  onChange={(e) =>
                    setNewRecipient({ ...newRecipient, organization: e.target.value })
                  }
                  placeholder="Acme Inc"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Industry</Label>
              <Select
                value={newRecipient.industry}
                onValueChange={(value) => setNewRecipient({ ...newRecipient, industry: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Financial Services">Financial Services</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Government">Government</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRecipient(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRecipient}>Add Recipient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={showBulkAdd} onOpenChange={setShowBulkAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Import Recipients</DialogTitle>
            <DialogDescription>
              Paste email addresses separated by commas, semicolons, or new lines
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Textarea
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com&#10;email3@example.com"
              rows={6}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAdd(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAdd}>Import Recipients</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
