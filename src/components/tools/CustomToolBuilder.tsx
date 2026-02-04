import { useState, useRef } from "react";
import { ArrowLeft, Upload, Image, Save, Globe, Lock, FileText, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

// Set up PDF.js worker using Vite URL import for v5.x
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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
  const { user } = useAuth();
  const [name, setName] = useState(existingTool?.name || "");
  const [description, setDescription] = useState(existingTool?.description || "");
  const [category, setCategory] = useState(existingTool?.category || "Custom");
  const [visibility, setVisibility] = useState<"private" | "team" | "public">(
    existingTool?.is_public ? "public" : "private"
  );
  const [imageUrl, setImageUrl] = useState<string | null>(existingTool?.canvas_image_url || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [selectedPage, setSelectedPage] = useState(0);
  const [showPageSelector, setShowPageSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderPdfPage = async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<string> => {
    const page = await pdf.getPage(pageNum);
    const scale = 2; // Higher scale for better quality
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    }).promise;

    return canvas.toDataURL("image/png");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      toast.error("Please upload an image or PDF file");
      return;
    }

    // Validate file size (max 10MB for PDFs, 5MB for images)
    const maxSize = isPdf ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File must be smaller than ${isPdf ? "10MB" : "5MB"}`);
      return;
    }

    setUploading(true);
    try {
      if (isPdf) {
        // Convert PDF to images
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;

        toast.info(`Processing ${numPages} page${numPages > 1 ? "s" : ""}...`);

        const pageImages: string[] = [];
        for (let i = 1; i <= numPages; i++) {
          const pageImage = await renderPdfPage(pdf, i);
          pageImages.push(pageImage);
        }

        setPdfPages(pageImages);
        setSelectedPage(0);

        if (numPages > 1) {
          setShowPageSelector(true);
          toast.success(`PDF loaded! Select which page to use as your canvas.`);
        } else {
          // Single page PDF - upload directly
          await uploadBase64Image(pageImages[0]);
        }
      } else {
        // Handle image upload - use user-scoped path for RLS compliance
        if (!user) {
          toast.error("You must be logged in to upload images");
          return;
        }
        
        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        // User-scoped path: {user_id}/canvas-backgrounds/{filename}
        const filePath = `${user.id}/canvas-backgrounds/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("tool-images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Use signed URL since bucket is now private
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("tool-images")
          .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

        if (signedUrlError) throw signedUrlError;

        setImageUrl(signedUrlData.signedUrl);
        setPdfPages([]);
        setShowPageSelector(false);
        toast.success("Image uploaded successfully");
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Failed to process file");
    } finally {
      setUploading(false);
    }
  };

  const uploadBase64Image = async (base64: string) => {
    try {
      if (!user) {
        toast.error("You must be logged in to upload images");
        return;
      }
      
      // Convert base64 to blob
      const response = await fetch(base64);
      const blob = await response.blob();

      const fileName = `${crypto.randomUUID()}.png`;
      // User-scoped path: {user_id}/canvas-backgrounds/{filename}
      const filePath = `${user.id}/canvas-backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("tool-images")
        .upload(filePath, blob, { contentType: "image/png" });

      if (uploadError) throw uploadError;

      // Use signed URL since bucket is now private
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("tool-images")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

      if (signedUrlError) throw signedUrlError;

      setImageUrl(signedUrlData.signedUrl);
      setPdfPages([]);
      setShowPageSelector(false);
      toast.success("Page uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    }
  };

  const handlePageSelect = async () => {
    if (pdfPages[selectedPage]) {
      setUploading(true);
      await uploadBase64Image(pdfPages[selectedPage]);
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a tool name");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to save tools");
      return;
    }

    setSaving(true);
    try {
      const toolData = {
        name: name.trim(),
        description: description.trim() || null,
        category,
        canvas_image_url: imageUrl,
        visibility,
        is_public: visibility === "public",
        owner_id: user.id,
      };

      let savedTool;
      
      if (existingTool?.id) {
        // Don't update owner_id on edit
        const { owner_id, ...updateData } = toolData;
        const { data, error } = await supabase
          .from("custom_tools")
          .update(updateData)
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
            Design your own canvas with a custom background image or PDF
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

          <div className="space-y-2">
            <Label>Visibility</Label>
            <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
              <div className="flex items-center space-x-2 rounded-lg border border-border p-3">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Private</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Only visible to you</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border border-border p-3">
                <RadioGroupItem value="team" id="team" />
                <Label htmlFor="team" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Team</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Visible to all authenticated users</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border border-border p-3">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Public</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Anyone on the platform can use this tool</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : existingTool ? "Update Tool" : "Create Tool"}
          </Button>
        </div>

        {/* Image/PDF Upload Section */}
        <div className="space-y-4">
          <Label>Canvas Background (Image or PDF)</Label>
          
          {showPageSelector && pdfPages.length > 1 ? (
            // PDF Page Selector
            <div className="space-y-4">
              <div className="relative min-h-[400px] rounded-xl border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                <img
                  src={pdfPages[selectedPage]}
                  alt={`Page ${selectedPage + 1}`}
                  className="max-w-full max-h-[400px] object-contain"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedPage((p) => Math.max(0, p - 1))}
                  disabled={selectedPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  Page {selectedPage + 1} of {pdfPages.length}
                </span>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedPage((p) => Math.min(pdfPages.length - 1, p + 1))}
                  disabled={selectedPage === pdfPages.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button onClick={handlePageSelect} disabled={uploading} className="flex-1">
                  {uploading ? "Uploading..." : "Use This Page"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPdfPages([]);
                    setShowPageSelector(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            // File Upload Area
            <>
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
                        <p className="text-muted-foreground">Processing...</p>
                      </div>
                    ) : (
                      <>
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                          <div className="flex -space-x-2">
                            <Image className="h-6 w-6 text-muted-foreground" />
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          </div>
                        </div>
                        <p className="font-medium">Upload Canvas Background</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Click to upload an image or PDF
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          PNG, JPG, SVG (max 5MB) or PDF (max 10MB)
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
              {imageUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Replace Background
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
