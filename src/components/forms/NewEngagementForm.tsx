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

interface NewEngagementFormProps {
  onSuccess: () => void;
}

export function NewEngagementForm({ onSuccess }: NewEngagementFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clientType, setClientType] = useState<"existing" | "new">("new");
  const [formData, setFormData] = useState({
    clientName: "",
    industry: "",
    projectName: "",
    status: "Proposed",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create or select client
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: formData.clientName,
          industry: formData.industry,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Create project
      const { error: projectError } = await supabase.from("projects").insert({
        client_id: clientData.id,
        name: formData.projectName,
        status: formData.status,
      });

      if (projectError) throw projectError;

      toast({
        title: "Engagement created",
        description: `${formData.projectName} has been created successfully.`,
      });

      onSuccess();
    } catch (error) {
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
