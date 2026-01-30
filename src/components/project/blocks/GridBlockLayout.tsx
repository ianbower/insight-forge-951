import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { GridLayout } from "react-grid-layout";
import type { LayoutItem, Layout } from "react-grid-layout";
import { Trash2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StepBlock, GridPosition } from "./BlockTypes";
import { BlockRenderer } from "./BlockRenderer";
import "react-grid-layout/css/styles.css";

interface GridBlockLayoutProps {
  blocks: StepBlock[];
  isEditing: boolean;
  onBlocksChange: (blocks: StepBlock[]) => void;
  onBlockUpdate: (block: StepBlock) => void;
  onBlockDelete: (blockId: string) => void;
  onAddBlock: (afterBlockId: string, type: StepBlock['type']) => void;
  onOpenTool?: (toolName: string) => void;
  projectId?: string;
  stepId?: string;
  // Custom renderers for special blocks
  renderDeliverables?: (block: StepBlock) => React.ReactNode;
  renderNotes?: (block: StepBlock) => React.ReactNode;
  renderAIChat?: (block: StepBlock) => React.ReactNode;
}

const getDefaultHeight = (type: StepBlock['type']): number => {
  switch (type) {
    case 'heading': return 2;
    case 'text': return 3;
    case 'divider': return 1;
    case 'tool': return 8;
    case 'checklist': return 5;
    case 'form': return 6;
    case 'poll': return 5;
    case 'ai-chat': return 8;
    case 'deliverables': return 5;
    case 'notes': return 5;
    case 'image': return 5;
    case 'video': return 5;
    default: return 3;
  }
};

export function GridBlockLayout({
  blocks,
  isEditing,
  onBlocksChange,
  onBlockUpdate,
  onBlockDelete,
  onAddBlock,
  onOpenTool,
  projectId,
  stepId,
  renderDeliverables,
  renderNotes,
  renderAIChat,
}: GridBlockLayoutProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(900);

  // Measure container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Convert blocks to react-grid-layout format
  const layout: Layout = useMemo(() => {
    const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);
    
    return sortedBlocks.map((block, index) => {
      const gridPos = block.gridPosition || {
        x: 0,
        y: index * getDefaultHeight(block.type),
        w: 12,
        h: getDefaultHeight(block.type)
      };
      
      return {
        i: block.id,
        x: gridPos.x,
        y: gridPos.y,
        w: gridPos.w,
        h: gridPos.h,
        minW: 3,
        minH: 1,
        maxW: 12,
      };
    });
  }, [blocks]);

  const handleLayoutChange = useCallback((newLayout: Layout) => {
    if (!isEditing) return;

    const updatedBlocks = blocks.map((block) => {
      const layoutItem = newLayout.find((l) => l.i === block.id);
      if (!layoutItem) return block;

      return {
        ...block,
        gridPosition: {
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h,
        },
        order: layoutItem.y * 12 + layoutItem.x,
      };
    });

    onBlocksChange(updatedBlocks);
  }, [blocks, isEditing, onBlocksChange]);

  const handleDeleteBlock = useCallback((blockId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onBlockDelete(blockId);
    setSelectedBlockId(null);
  }, [onBlockDelete]);

  const handleBlockClick = useCallback((blockId: string) => {
    if (isEditing) {
      setSelectedBlockId(selectedBlockId === blockId ? null : blockId);
    }
  }, [isEditing, selectedBlockId]);

  const renderBlockContent = (block: StepBlock) => {
    if (block.type === 'deliverables' && renderDeliverables) {
      return renderDeliverables(block);
    }
    if (block.type === 'notes' && renderNotes) {
      return renderNotes(block);
    }
    if (block.type === 'ai-chat' && renderAIChat) {
      return renderAIChat(block);
    }

    return (
      <BlockRenderer
        block={block}
        isEditing={isEditing}
        onUpdate={onBlockUpdate}
        onDelete={() => {}}
        onAddBlock={onAddBlock}
        onOpenTool={onOpenTool}
        projectId={projectId}
        stepId={stepId}
      />
    );
  };

  // In view mode, use CSS grid to preserve horizontal positions with auto-height
  if (!isEditing) {
    // Group blocks by row (y position) and sort
    const sortedBlocks = [...blocks].sort((a, b) => {
      const aY = a.gridPosition?.y ?? a.order;
      const bY = b.gridPosition?.y ?? b.order;
      if (aY !== bY) return aY - bY;
      const aX = a.gridPosition?.x ?? 0;
      const bX = b.gridPosition?.x ?? 0;
      return aX - bX;
    });

    // Group blocks into rows based on y position
    const rows: { y: number; blocks: typeof blocks }[] = [];
    sortedBlocks.forEach(block => {
      const y = block.gridPosition?.y ?? block.order * 10;
      const existingRow = rows.find(r => Math.abs(r.y - y) < 3); // Blocks within 3 units are same row
      if (existingRow) {
        existingRow.blocks.push(block);
      } else {
        rows.push({ y, blocks: [block] });
      }
    });

    return (
      <div ref={containerRef} className="relative w-full space-y-4">
        {blocks.length === 0 ? (
          <div className="flex items-center justify-center py-16 border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">No blocks yet. Add your first block above.</p>
          </div>
        ) : (
          rows.map((row, rowIndex) => (
            <div 
              key={rowIndex} 
              className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}
            >
              {row.blocks
                .sort((a, b) => (a.gridPosition?.x ?? 0) - (b.gridPosition?.x ?? 0))
                .map((block) => {
                  const colStart = (block.gridPosition?.x ?? 0) + 1;
                  const colSpan = block.gridPosition?.w ?? 12;
                  return (
                    <div 
                      key={block.id}
                      style={{ 
                        gridColumn: `${colStart} / span ${colSpan}`,
                      }}
                    >
                      {renderBlockContent(block)}
                    </div>
                  );
                })}
            </div>
          ))
        )}
      </div>
    );
  }

  // Edit mode: use grid layout for drag/resize
  return (
    <div ref={containerRef} className="relative w-full">
      {/* Grid background guide (only in edit mode) */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div 
          className="h-full w-full"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: `${containerWidth / 12}px 40px`,
          }}
        />
      </div>

      <GridLayout
        className="layout"
        layout={layout}
        width={containerWidth}
        gridConfig={{
          cols: 12,
          rowHeight: 40,
          margin: [16, 16] as const,
          containerPadding: [0, 0] as const,
        }}
        dragConfig={{
          enabled: true,
          handle: '.grid-drag-handle',
        }}
        resizeConfig={{
          enabled: true,
          handles: ['se'] as const,
        }}
        onLayoutChange={handleLayoutChange}
      >
        {blocks.map((block) => (
          <div
            key={block.id}
            className={cn(
              "relative bg-background rounded-lg transition-all overflow-hidden",
              "border-2 border-dashed border-border hover:border-primary/50",
              selectedBlockId === block.id && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => handleBlockClick(block.id)}
          >
            {/* Edit mode overlay controls */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-muted/80 backdrop-blur-sm flex items-center justify-between px-2 z-10 grid-drag-handle cursor-grab active:cursor-grabbing">
              <span className="text-xs font-medium text-muted-foreground capitalize truncate">
                {block.type.replace('-', ' ')}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleDeleteBlock(block.id, e)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Block content */}
            <div className="h-full overflow-auto pt-8 px-2 pb-2">
              {renderBlockContent(block)}
            </div>

            {/* Resize indicator (bottom-right corner) */}
            <div className="absolute bottom-1 right-1 w-4 h-4 opacity-50 pointer-events-none">
              <Maximize2 className="h-3 w-3 text-muted-foreground rotate-90" />
            </div>
          </div>
        ))}
      </GridLayout>

      {blocks.length === 0 && (
        <div className="flex items-center justify-center py-16 border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">No blocks yet. Add your first block above.</p>
        </div>
      )}
    </div>
  );
}
