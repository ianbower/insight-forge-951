import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface NewEngagementFormProps {
  onSuccess: () => void;
}

export function NewEngagementForm({ onSuccess }: NewEngagementFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    industry: "",
    projectName: "",
    status: "Proposed",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create an engagement.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create client with ownership
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: formData.clientName,
          industry: formData.industry,
          owner_id: user.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Create project with ownership
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert({
          client_id: clientData.id,
          name: formData.projectName,
          status: formData.status,
          owner_id: user.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Add the creator as a project member with lead role
      await supabase.from("project_members").insert({
        project_id: projectData.id,
        user_id: user.id,
        role_in_project: "lead",
        can_manage: true,
      });

      toast({
        title: "Engagement created",
        description: `${formData.projectName} has been created successfully.`,
      });

      onSuccess();
    } catch (error) {
      console.error("Error creating engagement:", error);
      toast({
        title: "Error",
        description: "Failed to create engagement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="clientName">Client Name</Label>
        <Input
          id="clientName"
          value={formData.clientName}
          onChange={(e) =>
            setFormData({ ...formData, clientName: e.target.value })
          }
          placeholder="Enter client name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="industry">Industry</Label>
        <Select
          value={formData.industry}
          onValueChange={(value) =>
            setFormData({ ...formData, industry: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Financial Services">Financial Services</SelectItem>
            <SelectItem value="Healthcare">Healthcare</SelectItem>
            <SelectItem value="Technology">Technology</SelectItem>
            <SelectItem value="Manufacturing">Manufacturing</SelectItem>
            <SelectItem value="Retail">Retail</SelectItem>
            <SelectItem value="Energy">Energy</SelectItem>
            <SelectItem value="Public Sector">Public Sector</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="projectName">Project Name</Label>
        <Input
          id="projectName"
          value={formData.projectName}
          onChange={(e) =>
            setFormData({ ...formData, projectName: e.target.value })
          }
          placeholder="e.g., Digital Transformation Strategy"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Initial Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Proposed">Proposed</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={loading} className="min-w-[120px]">
          {loading ? "Creating..." : "Create Engagement"}
        </Button>
      </div>
    </form>
  );
}
