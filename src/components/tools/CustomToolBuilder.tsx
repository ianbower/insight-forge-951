import { useState, useRef } from "react";
import { ArrowLeft, Upload, Image, Save, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CustomToolBuilderProps {
  onClose: () => void;
  onSave: (tool: {
    id: string;
    name: string;
    description: string;
    category: string;
    canvas_image_url: string | null;
    is_public: boolean;
  }) => void;
  existingTool?: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    canvas_image_url: string | null;
    is_public: boolean;
  };
}

const categories = ["Strategy", "Operations", "Planning", "Organization", "Custom"];

export function CustomToolBuilder({ onClose, onSave, existingTool }: CustomToolBuilderProps) {
  const [name, setName] = useState(existingTool?.name || "");
  const [description, setDescription] = useState(existingTool?.description || "");
  const [category, setCategory] = useState(existingTool?.category || "Custom");
  const [isPublic, setIsPublic] = useState(existingTool?.is_public ?? false);
  const [imageUrl, setImageUrl] = useState<string | null>(existingTool?.canvas_image_url || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `canvas-backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("tool-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("tool-images")
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a tool name");
      return;
    }

    setSaving(true);
    try {
      const toolData = {
        name: name.trim(),
        description: description.trim() || null,
        category,
        canvas_image_url: imageUrl,
        is_public: isPublic,
      };

      let savedTool;
      
      if (existingTool?.id) {
        const { data, error } = await supabase
          .from("custom_tools")
          .update(toolData)
          .eq("id", existingTool.id)
          .select()
          .single();

        if (error) throw error;
        savedTool = data;
      } else {
        const { data, error } = await supabase
          .from("custom_tools")
          .insert(toolData)
          .select()
          .single();

        if (error) throw error;
        savedTool = data;
      }

      toast.success(`Tool ${existingTool ? "updated" : "created"} successfully`);
      onSave(savedTool);
    } catch (error) {
      console.error("Error saving tool:", error);
      toast.error("Failed to save tool");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-display font-semibold">
            {existingTool ? "Edit Custom Tool" : "Create Custom Tool"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Design your own canvas with a custom background image
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tool Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Customer Journey Map"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this tool is used for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-5 w-5 text-primary" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  {isPublic ? "Public Tool" : "Private Tool"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isPublic
                    ? "Anyone on the platform can use this tool"
                    : "Only visible to you"}
                </p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : existingTool ? "Update Tool" : "Create Tool"}
          </Button>
        </div>

        {/* Image Upload Section */}
        <div className="space-y-4">
          <Label>Canvas Background Image</Label>
          <div
            className="relative min-h-[400px] rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Canvas background"
                className="max-w-full max-h-[400px] object-contain"
              />
            ) : (
              <div className="text-center p-8">
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-muted-foreground">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium">Upload Canvas Image</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      PNG, JPG, or SVG (max 5MB)
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          {imageUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Replace Image
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
