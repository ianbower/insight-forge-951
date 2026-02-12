import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Brain, Plus, Trash2, Check, Loader2 } from "lucide-react";

interface LLMConfigRow {
  id: string;
  provider: string;
  model: string | null;
  endpoint_url: string;
  api_key_secret_name: string | null;
  is_active: boolean;
  label: string;
  created_at: string;
  updated_at: string;
}

const LOVABLE_AI_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Fast)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Balanced)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Best)" },
  { value: "google/gemini-3-pro-preview", label: "Gemini 3 Pro (Next-gen)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (Balanced)" },
  { value: "openai/gpt-5", label: "GPT-5 (Powerful)" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano (Fast)" },
];

export function LLMSettings() {
  const [configs, setConfigs] = useState<LLMConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    const { data, error } = await supabase
      .from("llm_config")
      .select("*")
      .order("created_at");

    if (error) {
      toast.error("Failed to load LLM configurations");
      console.error(error);
    } else {
      setConfigs((data as unknown as LLMConfigRow[]) || []);
    }
    setLoading(false);
  };

  const setActive = async (id: string) => {
    setSaving(id);
    // Deactivate all, then activate selected
    const { error: deactivateError } = await supabase
      .from("llm_config")
      .update({ is_active: false } as any)
      .neq("id", id);

    if (!deactivateError) {
      const { error: activateError } = await supabase
        .from("llm_config")
        .update({ is_active: true } as any)
        .eq("id", id);

      if (!activateError) {
        toast.success("Active LLM updated");
        await fetchConfigs();
      } else {
        toast.error("Failed to activate configuration");
      }
    }
    setSaving(null);
  };

  const addConfig = async (provider: string) => {
    const defaults: Record<string, Partial<LLMConfigRow>> = {
      axet: {
        label: "Axet LLM",
        endpoint_url: "https://axet.nttdata.com/flows/cloud/hackthon-be/v1/chat/completions",
        model: null,
        api_key_secret_name: null,
      },
      lovable_ai: {
        label: "Lovable AI",
        endpoint_url: "https://ai.gateway.lovable.dev/v1/chat/completions",
        model: "google/gemini-3-flash-preview",
        api_key_secret_name: null,
      },
      custom: {
        label: "Custom Endpoint",
        endpoint_url: "",
        model: null,
        api_key_secret_name: null,
      },
    };

    const config = defaults[provider];
    const { error } = await supabase
      .from("llm_config")
      .insert({
        provider,
        label: config.label,
        endpoint_url: config.endpoint_url,
        model: config.model,
        api_key_secret_name: config.api_key_secret_name,
        is_active: false,
      } as any);

    if (error) {
      toast.error("Failed to add configuration");
    } else {
      toast.success("Configuration added");
      await fetchConfigs();
    }
  };

  const updateConfig = async (id: string, updates: Partial<LLMConfigRow>) => {
    const { error } = await supabase
      .from("llm_config")
      .update(updates as any)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update");
    } else {
      setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    }
  };

  const deleteConfig = async (id: string) => {
    const config = configs.find(c => c.id === id);
    if (config?.is_active) {
      toast.error("Cannot delete the active configuration");
      return;
    }
    const { error } = await supabase.from("llm_config").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Configuration deleted");
      setConfigs(prev => prev.filter(c => c.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-semibold font-display">LLM Provider Configuration</h3>
          </div>
          <Select onValueChange={addConfig}>
            <SelectTrigger className="w-[180px]">
              <Plus className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Add provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="axet">Axet LLM</SelectItem>
              <SelectItem value="lovable_ai">Lovable AI</SelectItem>
              <SelectItem value="custom">Custom Endpoint</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Configure which LLM provider is used across all AI features. The active configuration applies globally to all backend functions.
        </p>

        <div className="space-y-4">
          {configs.map((config) => (
            <Card key={config.id} className={`p-4 ${config.is_active ? "border-primary bg-primary/5" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{config.label}</span>
                  <Badge variant={config.provider === "axet" ? "default" : config.provider === "lovable_ai" ? "secondary" : "outline"}>
                    {config.provider === "lovable_ai" ? "Lovable AI" : config.provider === "axet" ? "Axet" : "Custom"}
                  </Badge>
                  {config.is_active && (
                    <Badge variant="default" className="bg-green-600">Active</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!config.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActive(config.id)}
                      disabled={saving === config.id}
                    >
                      {saving === config.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Set Active
                    </Button>
                  )}
                  {!config.is_active && (
                    <Button size="sm" variant="ghost" onClick={() => deleteConfig(config.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={config.label}
                    onChange={(e) => updateConfig(config.id, { label: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                {config.provider === "lovable_ai" && (
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Model</Label>
                    <Select
                      value={config.model || "google/gemini-3-flash-preview"}
                      onValueChange={(value) => updateConfig(config.id, { model: value })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOVABLE_AI_MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {config.provider === "custom" && (
                  <>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Endpoint URL</Label>
                      <Input
                        value={config.endpoint_url}
                        onChange={(e) => updateConfig(config.id, { endpoint_url: e.target.value })}
                        placeholder="https://api.example.com/v1/chat/completions"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Model (optional)</Label>
                      <Input
                        value={config.model || ""}
                        onChange={(e) => updateConfig(config.id, { model: e.target.value || null })}
                        placeholder="e.g. gpt-4o"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">API Key Secret Name (environment variable)</Label>
                      <Input
                        value={config.api_key_secret_name || ""}
                        onChange={(e) => updateConfig(config.id, { api_key_secret_name: e.target.value || null })}
                        placeholder="e.g. CUSTOM_LLM_API_KEY"
                        className="h-8 text-sm"
                      />
                    </div>
                  </>
                )}

                {config.provider !== "custom" && (
                  <div className="text-xs text-muted-foreground">
                    Endpoint: {config.endpoint_url}
                  </div>
                )}
              </div>
            </Card>
          ))}

          {configs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No LLM configurations found. Add a provider to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
