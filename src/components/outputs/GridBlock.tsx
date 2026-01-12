import { useState, useCallback } from "react";
import {
  GripVertical,
  Trash2,
  Type,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Image as ImageIcon,
  Quote,
  Minus,
  Columns,
  LayoutGrid,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export type BlockType =
  | "heading1"
  | "heading2"
  | "paragraph"
  | "bullet-list"
  | "numbered-list"
  | "image"
  | "quote"
  | "divider"
  | "spacer"
  | "callout"
  | "two-column";

export interface GridBlockData {
  id: string;
  type: BlockType;
  content: string;
  imageUrl?: string;
  imageCaption?: string;
  listItems?: string[];
  width: number; // 1-12 grid columns
  columnContent?: { left: string; right: string };
  calloutStyle?: "info" | "warning" | "success";
}

interface GridBlockProps {
  block: GridBlockData;
  onUpdate: (id: string, updates: Partial<GridBlockData>) => void;
  onDelete: (id: string) => void;
  images: { id: string; src: string; caption: string }[];
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

const blockTypeIcons: Record<BlockType, React.ReactNode> = {
  heading1: <Heading1 className="h-3.5 w-3.5" />,
  heading2: <Heading2 className="h-3.5 w-3.5" />,
  paragraph: <Type className="h-3.5 w-3.5" />,
  "bullet-list": <List className="h-3.5 w-3.5" />,
  "numbered-list": <ListOrdered className="h-3.5 w-3.5" />,
  image: <ImageIcon className="h-3.5 w-3.5" />,
  quote: <Quote className="h-3.5 w-3.5" />,
  divider: <Minus className="h-3.5 w-3.5" />,
  spacer: <ArrowLeftRight className="h-3.5 w-3.5 rotate-90" />,
  callout: <LayoutGrid className="h-3.5 w-3.5" />,
  "two-column": <Columns className="h-3.5 w-3.5" />,
};

const blockTypeLabels: Record<BlockType, string> = {
  heading1: "Heading 1",
  heading2: "Heading 2",
  paragraph: "Paragraph",
  "bullet-list": "Bullet List",
  "numbered-list": "Numbered List",
  image: "Image",
  quote: "Quote",
  divider: "Divider",
  spacer: "Spacer",
  callout: "Callout Box",
  "two-column": "Two Column",
};

const widthPresets = [
  { label: "1/3", value: 4 },
  { label: "1/2", value: 6 },
  { label: "2/3", value: 8 },
  { label: "Full", value: 12 },
];

export function GridBlock({
  block,
  onUpdate,
  onDelete,
  images,
  isEditing,
  onStartEdit,
  onEndEdit,
  isDragging,
  dragHandleProps,
}: GridBlockProps) {
  const [isResizing, setIsResizing] = useState(false);

  const handleListItemChange = (index: number, value: string) => {
    const newItems = [...(block.listItems || [])];
    newItems[index] = value;
    onUpdate(block.id, { listItems: newItems });
  };

  const handleAddListItem = () => {
    onUpdate(block.id, { listItems: [...(block.listItems || []), ""] });
  };

  const handleRemoveListItem = (index: number) => {
    const newItems = (block.listItems || []).filter((_, i) => i !== index);
    onUpdate(block.id, { listItems: newItems });
  };

  const renderBlockContent = () => {
    if (block.type === "divider") {
      return <hr className="border-t-2 border-muted my-4" />;
    }

    if (block.type === "spacer") {
      return <div className="h-8 flex items-center justify-center text-muted-foreground/50 text-xs">Spacer</div>;
    }

    if (block.type === "callout") {
      const styleColors = {
        info: "border-info bg-info/5 text-info",
        warning: "border-warning bg-warning/5 text-warning",
        success: "border-success bg-success/5 text-success",
      };
      const style = block.calloutStyle || "info";

      return isEditing ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["info", "warning", "success"] as const).map((s) => (
              <button
                key={s}
                onClick={() => onUpdate(block.id, { calloutStyle: s })}
                className={cn(
                  "px-3 py-1 rounded-full text-xs capitalize border-2 transition-all",
                  s === style ? styleColors[s] : "border-muted text-muted-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <Textarea
            value={block.content}
            onChange={(e) => onUpdate(block.id, { content: e.target.value })}
            placeholder="Callout content..."
            rows={3}
          />
        </div>
      ) : (
        <div className={cn("p-4 rounded-lg border-l-4", styleColors[style])}>
          {block.content || "Empty callout"}
        </div>
      );
    }

    if (block.type === "two-column") {
      const cols = block.columnContent || { left: "", right: "" };
      return isEditing ? (
        <div className="grid grid-cols-2 gap-4">
          <Textarea
            value={cols.left}
            onChange={(e) =>
              onUpdate(block.id, { columnContent: { ...cols, left: e.target.value } })
            }
            placeholder="Left column..."
            rows={4}
          />
          <Textarea
            value={cols.right}
            onChange={(e) =>
              onUpdate(block.id, { columnContent: { ...cols, right: e.target.value } })
            }
            placeholder="Right column..."
            rows={4}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {cols.left || "Left column"}
          </div>
          <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {cols.right || "Right column"}
          </div>
        </div>
      );
    }

    if (block.type === "image") {
      return (
        <div className="space-y-2">
          {block.imageUrl ? (
            <div className="relative">
              <img
                src={block.imageUrl}
                alt={block.imageCaption || "Report image"}
                className="w-full rounded-lg border shadow-sm object-cover"
              />
              {isEditing && (
                <div className="mt-3 space-y-2">
                  <Input
                    value={block.imageCaption || ""}
                    onChange={(e) => onUpdate(block.id, { imageCaption: e.target.value })}
                    placeholder="Image caption..."
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdate(block.id, { imageUrl: undefined, imageCaption: undefined })}
                  >
                    Change Image
                  </Button>
                </div>
              )}
              {!isEditing && block.imageCaption && (
                <p className="text-sm text-muted-foreground text-center mt-3 italic">
                  {block.imageCaption}
                </p>
              )}
            </div>
          ) : isEditing ? (
            <div className="grid grid-cols-3 gap-3 p-4 border-2 border-dashed rounded-lg bg-muted/30">
              <p className="col-span-3 text-sm text-muted-foreground mb-2">Select an image:</p>
              {images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => onUpdate(block.id, { imageUrl: img.src, imageCaption: img.caption })}
                  className="aspect-video rounded-lg border-2 border-transparent hover:border-primary overflow-hidden transition-all hover:scale-105"
                >
                  <img src={img.src} alt={img.caption} className="w-full h-full object-cover" />
                </button>
              ))}
              {images.length === 0 && (
                <p className="col-span-3 text-sm text-muted-foreground text-center py-6">
                  No images available. Add images in the Images tab first.
                </p>
              )}
            </div>
          ) : (
            <div className="p-12 border-2 border-dashed rounded-lg bg-muted/30 text-center">
              <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No image selected</p>
            </div>
          )}
        </div>
      );
    }

    if (block.type === "bullet-list" || block.type === "numbered-list") {
      const items = block.listItems || [""];
      return (
        <div className="space-y-1">
          {isEditing ? (
            <>
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-muted-foreground w-6 text-right">
                    {block.type === "numbered-list" ? `${index + 1}.` : "•"}
                  </span>
                  <Input
                    value={item}
                    onChange={(e) => handleListItemChange(index, e.target.value)}
                    placeholder="List item..."
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveListItem(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddListItem} className="mt-2">
                Add Item
              </Button>
            </>
          ) : (
            <ul
              className={cn(
                "space-y-1.5 pl-6",
                block.type === "numbered-list" ? "list-decimal" : "list-disc"
              )}
            >
              {items.filter(Boolean).map((item, index) => (
                <li key={index} className="text-muted-foreground">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (block.type === "quote") {
      return isEditing ? (
        <Textarea
          value={block.content}
          onChange={(e) => onUpdate(block.id, { content: e.target.value })}
          placeholder="Enter quote..."
          rows={3}
          className="italic"
        />
      ) : (
        <blockquote className="border-l-4 border-accent pl-5 py-3 italic text-muted-foreground bg-gradient-to-r from-accent/5 to-transparent rounded-r-lg">
          {block.content || "Empty quote"}
        </blockquote>
      );
    }

    // Headings and paragraphs
    if (isEditing) {
      if (block.type === "heading1" || block.type === "heading2") {
        return (
          <Input
            value={block.content}
            onChange={(e) => onUpdate(block.id, { content: e.target.value })}
            placeholder={block.type === "heading1" ? "Section heading..." : "Subheading..."}
            className={cn(
              "font-display",
              block.type === "heading1" && "text-xl font-semibold",
              block.type === "heading2" && "text-lg font-medium"
            )}
          />
        );
      }
      return (
        <Textarea
          value={block.content}
          onChange={(e) => onUpdate(block.id, { content: e.target.value })}
          placeholder="Enter text..."
          rows={4}
        />
      );
    }

    // Display mode
    if (block.type === "heading1") {
      return (
        <h2 className="text-2xl font-display font-semibold text-foreground">
          {block.content || "Untitled Section"}
        </h2>
      );
    }
    if (block.type === "heading2") {
      return (
        <h3 className="text-xl font-display font-medium text-foreground">
          {block.content || "Untitled Subsection"}
        </h3>
      );
    }
    return (
      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {block.content || "Empty paragraph"}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "group relative bg-background rounded-xl border transition-all duration-200",
        isDragging && "opacity-50 shadow-2xl z-50 scale-[1.02]",
        isEditing && "ring-2 ring-primary ring-offset-2",
        "hover:shadow-lg"
      )}
    >
      {/* Drag Handle */}
      <div
        {...dragHandleProps}
        className={cn(
          "absolute -left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-muted/80 backdrop-blur-sm cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-primary-foreground",
          isDragging && "opacity-100"
        )}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="p-5">
        {/* Block header with type, width controls, and actions */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
              {blockTypeIcons[block.type]}
              <span>{blockTypeLabels[block.type]}</span>
            </div>

            {/* Width presets */}
            {block.type !== "divider" && block.type !== "spacer" && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {widthPresets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => onUpdate(block.id, { width: preset.value })}
                    className={cn(
                      "px-2 py-0.5 text-xs rounded transition-colors",
                      block.width === preset.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isEditing && block.type !== "divider" && block.type !== "spacer" && (
              <Button variant="ghost" size="sm" className="h-7 px-2.5" onClick={onStartEdit}>
                Edit
              </Button>
            )}
            {isEditing && (
              <Button variant="default" size="sm" className="h-7 px-2.5" onClick={onEndEdit}>
                Done
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(block.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Width slider for fine control */}
        {isResizing && block.type !== "divider" && block.type !== "spacer" && (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Width:</span>
            <Slider
              value={[block.width]}
              min={3}
              max={12}
              step={1}
              onValueChange={([val]) => onUpdate(block.id, { width: val })}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-8">{block.width}/12</span>
          </div>
        )}

        {/* Block content */}
        {renderBlockContent()}
      </div>

      {/* Resize toggle */}
      {block.type !== "divider" && block.type !== "spacer" && (
        <button
          onClick={() => setIsResizing(!isResizing)}
          className={cn(
            "absolute -right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-muted border opacity-0 group-hover:opacity-100 transition-all hover:bg-accent hover:text-accent-foreground",
            isResizing && "opacity-100 bg-accent text-accent-foreground"
          )}
          title="Resize block"
        >
          <ArrowLeftRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
