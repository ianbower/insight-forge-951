import { useState, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  Columns,
  LayoutGrid,
  ArrowLeftRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { GridBlock, GridBlockData, BlockType } from "./GridBlock";
import { cn } from "@/lib/utils";

interface GridBlockEditorProps {
  blocks: GridBlockData[];
  onBlocksChange: (blocks: GridBlockData[]) => void;
  images: { id: string; src: string; caption: string }[];
}

const blockCategories = {
  text: {
    label: "Text",
    items: [
      { type: "heading1" as BlockType, label: "Heading 1", icon: <Heading1 className="h-4 w-4" />, description: "Large section heading" },
      { type: "heading2" as BlockType, label: "Heading 2", icon: <Heading2 className="h-4 w-4" />, description: "Smaller subsection heading" },
      { type: "paragraph" as BlockType, label: "Paragraph", icon: <Type className="h-4 w-4" />, description: "Plain text content" },
    ],
  },
  lists: {
    label: "Lists",
    items: [
      { type: "bullet-list" as BlockType, label: "Bullet List", icon: <List className="h-4 w-4" />, description: "Unordered list items" },
      { type: "numbered-list" as BlockType, label: "Numbered List", icon: <ListOrdered className="h-4 w-4" />, description: "Ordered list items" },
    ],
  },
  media: {
    label: "Media",
    items: [
      { type: "image" as BlockType, label: "Image", icon: <ImageIcon className="h-4 w-4" />, description: "Insert an image" },
    ],
  },
  layout: {
    label: "Layout",
    items: [
      { type: "two-column" as BlockType, label: "Two Column", icon: <Columns className="h-4 w-4" />, description: "Side-by-side columns" },
      { type: "callout" as BlockType, label: "Callout Box", icon: <LayoutGrid className="h-4 w-4" />, description: "Highlighted info box" },
      { type: "quote" as BlockType, label: "Quote", icon: <Quote className="h-4 w-4" />, description: "Highlighted quote" },
      { type: "divider" as BlockType, label: "Divider", icon: <Minus className="h-4 w-4" />, description: "Horizontal separator" },
      { type: "spacer" as BlockType, label: "Spacer", icon: <ArrowLeftRight className="h-4 w-4 rotate-90" />, description: "Vertical spacing" },
    ],
  },
};

function SortableBlock({
  block,
  onUpdate,
  onDelete,
  images,
  editingBlockId,
  onStartEdit,
  onEndEdit,
}: {
  block: GridBlockData;
  onUpdate: (id: string, updates: Partial<GridBlockData>) => void;
  onDelete: (id: string) => void;
  images: { id: string; src: string; caption: string }[];
  editingBlockId: string | null;
  onStartEdit: (id: string) => void;
  onEndEdit: () => void;
}) {
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

  // Calculate grid column span based on block width
  const getGridSpan = () => {
    const width = block.width || 12;
    if (width <= 4) return "col-span-12 md:col-span-4";
    if (width <= 6) return "col-span-12 md:col-span-6";
    if (width <= 8) return "col-span-12 md:col-span-8";
    return "col-span-12";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(getGridSpan())}
      {...attributes}
    >
      <GridBlock
        block={block}
        onUpdate={onUpdate}
        onDelete={onDelete}
        images={images}
        isEditing={editingBlockId === block.id}
        onStartEdit={() => onStartEdit(block.id)}
        onEndEdit={onEndEdit}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function GridBlockEditor({ blocks, onBlocksChange, images }: GridBlockEditorProps) {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      onBlocksChange(arrayMove(blocks, oldIndex, newIndex));
    }
  };

  const handleAddBlock = useCallback(
    (type: BlockType, insertIndex?: number) => {
      const newBlock: GridBlockData = {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        content: "",
        width: type === "image" ? 6 : type === "two-column" ? 12 : 12,
        listItems: type === "bullet-list" || type === "numbered-list" ? [""] : undefined,
        columnContent: type === "two-column" ? { left: "", right: "" } : undefined,
        calloutStyle: type === "callout" ? "info" : undefined,
      };

      if (insertIndex !== undefined) {
        const newBlocks = [...blocks];
        newBlocks.splice(insertIndex, 0, newBlock);
        onBlocksChange(newBlocks);
      } else {
        onBlocksChange([...blocks, newBlock]);
      }

      // Auto-edit new blocks except dividers and spacers
      if (type !== "divider" && type !== "spacer") {
        setEditingBlockId(newBlock.id);
      }
    },
    [blocks, onBlocksChange]
  );

  const handleUpdateBlock = useCallback(
    (id: string, updates: Partial<GridBlockData>) => {
      onBlocksChange(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    },
    [blocks, onBlocksChange]
  );

  const handleDeleteBlock = useCallback(
    (id: string) => {
      onBlocksChange(blocks.filter((b) => b.id !== id));
      if (editingBlockId === id) {
        setEditingBlockId(null);
      }
    },
    [blocks, onBlocksChange, editingBlockId]
  );

  const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null;

  const AddBlockButton = ({ insertIndex, className }: { insertIndex?: number; className?: string }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2 border-dashed hover:border-solid hover:border-primary", className)}
        >
          <Plus className="h-4 w-4" />
          Add Block
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          Insert Block
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(blockCategories).map(([key, category]) => (
          <DropdownMenuGroup key={key}>
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
              {category.label}
            </DropdownMenuLabel>
            {category.items.map((option) => (
              <DropdownMenuItem
                key={option.type}
                onClick={() => handleAddBlock(option.type, insertIndex)}
                className="flex items-start gap-3 py-2.5 cursor-pointer"
              >
                <div className="mt-0.5 text-accent">{option.icon}</div>
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (blocks.length === 0) {
    return (
      <div className="border-2 border-dashed rounded-2xl p-16 text-center bg-gradient-to-br from-muted/20 to-muted/40">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto mb-6">
          <LayoutGrid className="h-8 w-8 text-accent" />
        </div>
        <h3 className="font-display text-xl font-semibold mb-3">Start building your report</h3>
        <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
          Add headings, paragraphs, images, and layout blocks to create a premium deliverable with
          side-by-side elements.
        </p>
        <AddBlockButton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={blocks.map((b) => b.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-12 gap-4">
            {blocks.map((block, index) => (
              <SortableBlock
                key={block.id}
                block={block}
                onUpdate={handleUpdateBlock}
                onDelete={handleDeleteBlock}
                images={images}
                editingBlockId={editingBlockId}
                onStartEdit={setEditingBlockId}
                onEndEdit={() => setEditingBlockId(null)}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeBlock ? (
            <div className="opacity-90 shadow-2xl rotate-2">
              <GridBlock
                block={activeBlock}
                onUpdate={() => {}}
                onDelete={() => {}}
                images={images}
                isEditing={false}
                onStartEdit={() => {}}
                onEndEdit={() => {}}
                isDragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="flex justify-center pt-4">
        <AddBlockButton className="w-full max-w-md" />
      </div>
    </div>
  );
}
