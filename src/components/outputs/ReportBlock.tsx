import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type BlockType = 
  | "heading1" 
  | "heading2" 
  | "paragraph" 
  | "bullet-list" 
  | "numbered-list" 
  | "image" 
  | "quote"
  | "divider";

export interface ReportBlockData {
  id: string;
  type: BlockType;
  content: string;
  imageUrl?: string;
  imageCaption?: string;
  listItems?: string[];
}

interface ReportBlockProps {
  block: ReportBlockData;
  onUpdate: (id: string, updates: Partial<ReportBlockData>) => void;
  onDelete: (id: string) => void;
  images: { id: string; src: string; caption: string }[];
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
}

const blockTypeIcons: Record<BlockType, React.ReactNode> = {
  "heading1": <Heading1 className="h-3.5 w-3.5" />,
  "heading2": <Heading2 className="h-3.5 w-3.5" />,
  "paragraph": <Type className="h-3.5 w-3.5" />,
  "bullet-list": <List className="h-3.5 w-3.5" />,
  "numbered-list": <ListOrdered className="h-3.5 w-3.5" />,
  "image": <ImageIcon className="h-3.5 w-3.5" />,
  "quote": <Quote className="h-3.5 w-3.5" />,
  "divider": <Minus className="h-3.5 w-3.5" />,
};

const blockTypeLabels: Record<BlockType, string> = {
  "heading1": "Heading 1",
  "heading2": "Heading 2",
  "paragraph": "Paragraph",
  "bullet-list": "Bullet List",
  "numbered-list": "Numbered List",
  "image": "Image",
  "quote": "Quote",
  "divider": "Divider",
};

export function ReportBlock({ 
  block, 
  onUpdate, 
  onDelete, 
  images,
  isEditing,
  onStartEdit,
  onEndEdit
}: ReportBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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

    if (block.type === "image") {
      return (
        <div className="space-y-2">
          {block.imageUrl ? (
            <div className="relative">
              <img 
                src={block.imageUrl} 
                alt={block.imageCaption || "Report image"} 
                className="max-w-full rounded-lg border shadow-sm"
              />
              {isEditing && (
                <Input
                  value={block.imageCaption || ""}
                  onChange={(e) => onUpdate(block.id, { imageCaption: e.target.value })}
                  placeholder="Image caption..."
                  className="mt-2 text-sm"
                />
              )}
              {!isEditing && block.imageCaption && (
                <p className="text-sm text-muted-foreground text-center mt-2 italic">
                  {block.imageCaption}
                </p>
              )}
            </div>
          ) : isEditing ? (
            <div className="grid grid-cols-4 gap-2 p-4 border-2 border-dashed rounded-lg bg-muted/30">
              <p className="col-span-4 text-sm text-muted-foreground mb-2">Select an image:</p>
              {images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => onUpdate(block.id, { imageUrl: img.src, imageCaption: img.caption })}
                  className="aspect-video rounded border-2 border-transparent hover:border-primary overflow-hidden transition-colors"
                >
                  <img src={img.src} alt={img.caption} className="w-full h-full object-cover" />
                </button>
              ))}
              {images.length === 0 && (
                <p className="col-span-4 text-sm text-muted-foreground text-center py-4">
                  No images available. Add images in the Images tab first.
                </p>
              )}
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed rounded-lg bg-muted/30 text-center">
              <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddListItem}
                className="mt-2"
              >
                Add Item
              </Button>
            </>
          ) : (
            <ul className={cn(
              "space-y-1 pl-6",
              block.type === "numbered-list" ? "list-decimal" : "list-disc"
            )}>
              {items.filter(Boolean).map((item, index) => (
                <li key={index} className="text-muted-foreground">{item}</li>
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
        <blockquote className="border-l-4 border-primary pl-4 py-2 italic text-muted-foreground bg-muted/30 rounded-r-lg">
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
        <h2 className="text-xl font-display font-semibold text-foreground">
          {block.content || "Untitled Section"}
        </h2>
      );
    }
    if (block.type === "heading2") {
      return (
        <h3 className="text-lg font-display font-medium text-foreground">
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
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-background rounded-lg border transition-all",
        isDragging && "opacity-50 shadow-lg z-50",
        isEditing && "ring-2 ring-primary ring-offset-2"
      )}
    >
      {/* Toolbar */}
      <div className={cn(
        "absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
        isDragging && "opacity-100"
      )}>
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="p-4">
        {/* Block type indicator */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {blockTypeIcons[block.type]}
            <span>{blockTypeLabels[block.type]}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isEditing && block.type !== "divider" && (
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onStartEdit}>
                Edit
              </Button>
            )}
            {isEditing && (
              <Button variant="default" size="sm" className="h-7 px-2" onClick={onEndEdit}>
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

        {/* Block content */}
        {renderBlockContent()}
      </div>
    </div>
  );
}