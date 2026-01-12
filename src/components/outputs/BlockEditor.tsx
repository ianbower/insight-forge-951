import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Plus,
  Type,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Image as ImageIcon,
  Quote,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ReportBlock, ReportBlockData, BlockType } from "./ReportBlock";
import { cn } from "@/lib/utils";

interface BlockEditorProps {
  blocks: ReportBlockData[];
  onBlocksChange: (blocks: ReportBlockData[]) => void;
  images: { id: string; src: string; caption: string }[];
}

const blockOptions: { type: BlockType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: "heading1", label: "Heading 1", icon: <Heading1 className="h-4 w-4" />, description: "Large section heading" },
  { type: "heading2", label: "Heading 2", icon: <Heading2 className="h-4 w-4" />, description: "Smaller subsection heading" },
  { type: "paragraph", label: "Paragraph", icon: <Type className="h-4 w-4" />, description: "Plain text content" },
  { type: "bullet-list", label: "Bullet List", icon: <List className="h-4 w-4" />, description: "Unordered list items" },
  { type: "numbered-list", label: "Numbered List", icon: <ListOrdered className="h-4 w-4" />, description: "Ordered list items" },
  { type: "image", label: "Image", icon: <ImageIcon className="h-4 w-4" />, description: "Insert an image" },
  { type: "quote", label: "Quote", icon: <Quote className="h-4 w-4" />, description: "Highlighted quote" },
  { type: "divider", label: "Divider", icon: <Minus className="h-4 w-4" />, description: "Horizontal line separator" },
];

export function BlockEditor({ blocks, onBlocksChange, images }: BlockEditorProps) {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      onBlocksChange(arrayMove(blocks, oldIndex, newIndex));
    }
  };

  const handleAddBlock = useCallback((type: BlockType, insertIndex?: number) => {
    const newBlock: ReportBlockData = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: "",
      listItems: type === "bullet-list" || type === "numbered-list" ? [""] : undefined,
    };

    if (insertIndex !== undefined) {
      const newBlocks = [...blocks];
      newBlocks.splice(insertIndex, 0, newBlock);
      onBlocksChange(newBlocks);
    } else {
      onBlocksChange([...blocks, newBlock]);
    }

    // Auto-edit new blocks except dividers
    if (type !== "divider") {
      setEditingBlockId(newBlock.id);
    }
  }, [blocks, onBlocksChange]);

  const handleUpdateBlock = useCallback((id: string, updates: Partial<ReportBlockData>) => {
    onBlocksChange(
      blocks.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  }, [blocks, onBlocksChange]);

  const handleDeleteBlock = useCallback((id: string) => {
    onBlocksChange(blocks.filter((b) => b.id !== id));
    if (editingBlockId === id) {
      setEditingBlockId(null);
    }
  }, [blocks, onBlocksChange, editingBlockId]);

  const AddBlockButton = ({ insertIndex }: { insertIndex?: number }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 border-dashed",
            insertIndex === undefined && "w-full"
          )}
        >
          <Plus className="h-4 w-4" />
          Add Block
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Insert Block</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {blockOptions.map((option) => (
          <DropdownMenuItem
            key={option.type}
            onClick={() => handleAddBlock(option.type, insertIndex)}
            className="flex items-start gap-3 py-2"
          >
            <div className="mt-0.5 text-muted-foreground">{option.icon}</div>
            <div>
              <div className="font-medium">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (blocks.length === 0) {
    return (
      <div className="border-2 border-dashed rounded-xl p-12 text-center bg-muted/20">
        <Type className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <h3 className="font-display font-semibold mb-2">Start building your report</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Add headings, paragraphs, images, and more to create your custom deliverable.
        </p>
        <AddBlockButton />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 pl-10">
            {blocks.map((block, index) => (
              <div key={block.id}>
                <ReportBlock
                  block={block}
                  onUpdate={handleUpdateBlock}
                  onDelete={handleDeleteBlock}
                  images={images}
                  isEditing={editingBlockId === block.id}
                  onStartEdit={() => setEditingBlockId(block.id)}
                  onEndEdit={() => setEditingBlockId(null)}
                />
                {/* Insert point between blocks */}
                <div className="flex justify-center py-1 opacity-0 hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors">
                        <Plus className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-56">
                      <DropdownMenuLabel>Insert Block</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {blockOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.type}
                          onClick={() => handleAddBlock(option.type, index + 1)}
                          className="flex items-start gap-3 py-2"
                        >
                          <div className="mt-0.5 text-muted-foreground">{option.icon}</div>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="pl-10 pt-4">
        <AddBlockButton />
      </div>
    </div>
  );
}