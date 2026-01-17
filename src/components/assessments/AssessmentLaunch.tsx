import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Send,
  Plus,
  Trash2,
  Copy,
  Mail,
  Link,
  Users,
  Settings,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Recipient {
  id?: string;
  email: string;
  name: string;
  organization: string;
  industry: string;
  role: string;
  status: string;
  token?: string;
}

interface AssessmentLaunchProps {
  templateId: string;
  templateName: string;
  onClose: () => void;
  onViewResults?: (instanceId: string, instanceName: string) => void;
}

export function AssessmentLaunch({ templateId, templateName, onClose, onViewResults }: AssessmentLaunchProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [instance, setInstance] = useState<any>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [addRecipientOpen, setAddRecipientOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  // Instance form
  const [instanceForm, setInstanceForm] = useState({
    name: `${templateName} - ${new Date().toLocaleDateString()}`,
    description: "",
    project_id: "",
    allow_anonymous: false,
  });

  // New recipient form
  const [newRecipient, setNewRecipient] = useState<Recipient>({
    email: "",
    name: "",
    organization: "",
    industry: "",
    role: "",
    status: "pending",
  });

  // Bulk import
  const [bulkEmails, setBulkEmails] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("id, name").order("name");
    setProjects(data || []);
  };

  const handleCreateInstance = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("assessment_instances")
      .insert({
        assessment_template_id: templateId,
        name: instanceForm.name,
        description: instanceForm.description || null,
        project_id: instanceForm.project_id || null,
        allow_anonymous: instanceForm.allow_anonymous,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setInstance(data);
      toast({ title: "Assessment instance created" });
    }

    setLoading(false);
  };

  const handleAddRecipient = async () => {
    if (!instance) return;

    const { data, error } = await supabase
      .from("assessment_recipients")
      .insert({
        assessment_instance_id: instance.id,
        email: newRecipient.email,
        name: newRecipient.name || null,
        organization: newRecipient.organization || null,
        industry: newRecipient.industry || null,
        role: newRecipient.role || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRecipients([...recipients, { ...newRecipient, id: data.id, token: data.token }]);
      setNewRecipient({ email: "", name: "", organization: "", industry: "", role: "", status: "pending" });
      setAddRecipientOpen(false);
      toast({ title: "Recipient added" });
    }
  };

  const handleBulkImport = async () => {
    if (!instance) return;

    const emails = bulkEmails
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter((e) => e && e.includes("@"));

    if (emails.length === 0) {
      toast({ title: "No valid emails found", variant: "destructive" });
      return;
    }

    const recipientsToAdd = emails.map((email) => ({
      assessment_instance_id: instance.id,
      email,
      status: "pending",
    }));

    const { data, error } = await supabase
      .from("assessment_recipients")
      .insert(recipientsToAdd)
      .select();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const newRecipients = (data || []).map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name || "",
        organization: r.organization || "",
        industry: r.industry || "",
        role: r.role || "",
        status: r.status,
        token: r.token,
      }));
      setRecipients([...recipients, ...newRecipients]);
      setBulkEmails("");
      setBulkImportOpen(false);
      toast({ title: `${emails.length} recipients added` });
    }
  };

  const handleDeleteRecipient = async (recipientId: string) => {
    const { error } = await supabase
      .from("assessment_recipients")
      .delete()
      .eq("id", recipientId);

    if (!error) {
      setRecipients(recipients.filter((r) => r.id !== recipientId));
      toast({ title: "Recipient removed" });
    }
  };

  const handleActivate = async () => {
    if (!instance) return;

    const { error } = await supabase
      .from("assessment_instances")
      .update({ status: "active", start_date: new Date().toISOString() })
      .eq("id", instance.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
    setInstance({ ...instance, status: "active" });
      toast({ title: "Assessment activated", description: "Recipients can now complete the assessment" });
    }
  };

  const handleSendEmails = async (recipientIds?: string[]) => {
    if (!instance) return;

    setSendingEmails(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-assessment-emails", {
        body: {
          instanceId: instance.id,
          recipientIds,
          baseUrl: window.location.origin,
        },
      });

      if (error) throw error;

      toast({
        title: "Emails sent",
        description: `Successfully sent ${data.sent} email(s)${data.failed > 0 ? `, ${data.failed} failed` : ""}`,
      });
    } catch (error: any) {
      toast({ title: "Error sending emails", description: error.message, variant: "destructive" });
    } finally {
      setSendingEmails(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/assess/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "started":
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const completedCount = recipients.filter((r) => r.status === "completed").length;

  // Show instance creation form if no instance exists
  if (!instance) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Launch Assessment</h2>
          <p className="text-sm text-muted-foreground">
            Based on: {templateName}
          </p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Assessment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Assessment Name</Label>
              <Input
                value={instanceForm.name}
                onChange={(e) => setInstanceForm({ ...instanceForm, name: e.target.value })}
                placeholder="e.g., Q1 2025 Digital Maturity Assessment"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={instanceForm.description}
                onChange={(e) => setInstanceForm({ ...instanceForm, description: e.target.value })}
                placeholder="Add context for recipients..."
              />
            </div>
            <div className="space-y-2">
              <Label>Link to Project (Optional)</Label>
              <Select
                value={instanceForm.project_id}
                onValueChange={(value) => setInstanceForm({ ...instanceForm, project_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Allow Anonymous Responses</Label>
                <p className="text-xs text-muted-foreground">
                  Recipients can complete without identifying themselves
                </p>
              </div>
              <Switch
                checked={instanceForm.allow_anonymous}
                onCheckedChange={(checked) => setInstanceForm({ ...instanceForm, allow_anonymous: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreateInstance} disabled={loading || !instanceForm.name}>
            Create & Add Recipients
          </Button>
        </div>
      </div>
    );
  }

  // Show recipients management
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{instance.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={cn(
              instance.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10"
            )}>
              {instance.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {recipients.length} recipients • {completedCount} completed
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {completedCount > 0 && onViewResults && (
            <Button
              variant="outline"
              onClick={() => onViewResults(instance.id, instance.name)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              View Results
            </Button>
          )}
          {instance.status === "draft" && (
            <Button onClick={handleActivate} className="gap-2" disabled={recipients.length === 0}>
              <Play className="h-4 w-4" />
              Activate
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Recipients Section */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recipients</CardTitle>
            <CardDescription>Add people to receive and complete this assessment</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleSendEmails()} 
              disabled={sendingEmails || recipients.filter(r => r.status === "pending").length === 0}
              className="gap-2"
            >
              {sendingEmails ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send All Invites
            </Button>
            <Button variant="outline" size="sm" onClick={() => setBulkImportOpen(true)} className="gap-2">
              <Mail className="h-4 w-4" />
              Bulk Import
            </Button>
            <Button size="sm" onClick={() => setAddRecipientOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Recipient
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recipients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recipients added yet</p>
              <p className="text-sm">Add recipients to share assessment links</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell>{getStatusIcon(recipient.status)}</TableCell>
                    <TableCell className="font-medium">{recipient.email}</TableCell>
                    <TableCell>{recipient.name || "-"}</TableCell>
                    <TableCell>{recipient.organization || "-"}</TableCell>
                    <TableCell>{recipient.industry || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => recipient.token && copyLink(recipient.token)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => recipient.id && handleDeleteRecipient(recipient.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Recipient Dialog */}
      <Dialog open={addRecipientOpen} onOpenChange={setAddRecipientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Recipient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newRecipient.email}
                onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                placeholder="recipient@company.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newRecipient.name}
                  onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={newRecipient.role}
                  onChange={(e) => setNewRecipient({ ...newRecipient, role: e.target.value })}
                  placeholder="CTO"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organization</Label>
                <Input
                  value={newRecipient.organization}
                  onChange={(e) => setNewRecipient({ ...newRecipient, organization: e.target.value })}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input
                  value={newRecipient.industry}
                  onChange={(e) => setNewRecipient({ ...newRecipient, industry: e.target.value })}
                  placeholder="Financial Services"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRecipientOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRecipient} disabled={!newRecipient.email}>
              Add Recipient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Import Recipients</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Addresses</Label>
              <Textarea
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                placeholder="Enter email addresses separated by commas, semicolons, or new lines..."
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Paste emails separated by commas, semicolons, or new lines
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkImport} disabled={!bulkEmails.trim()}>
              Import Recipients
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
