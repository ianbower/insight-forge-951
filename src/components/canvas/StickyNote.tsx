import { useState, useRef, useEffect } from "react";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface StickyNoteProps {
  id: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, position: { x: number; y: number }) => void;
  onResize?: (id: string, size: { width: number; height: number }) => void;
  canvasRef?: React.RefObject<HTMLDivElement>;
  scale?: number;
}

const colors = [
  "bg-yellow-200 border-yellow-300",
  "bg-blue-200 border-blue-300",
  "bg-green-200 border-green-300",
  "bg-pink-200 border-pink-300",
  "bg-purple-200 border-purple-300",
  "bg-orange-200 border-orange-300",
];

const MIN_WIDTH = 60;
const MIN_HEIGHT = 50;
const MAX_WIDTH = 400;
const MAX_HEIGHT = 400;

export function StickyNote({
  id,
  content,
  color,
  position,
  size = { width: 140, height: 100 },
  onUpdate,
  onDelete,
  onMove,
  onResize,
  canvasRef,
  scale = 1,
}: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(!content);
  const [localContent, setLocalContent] = useState(content);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startNotePos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 140, height: 100 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.note-content')) return;
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    
    startPos.current = { x: e.clientX, y: e.clientY };
    startNotePos.current = { x: position.x, y: position.y };
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { width: size.width, height: size.height };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = (e.clientX - startPos.current.x) / scale;
        const deltaY = (e.clientY - startPos.current.y) / scale;
        
        const newX = startNotePos.current.x + deltaX;
        const newY = startNotePos.current.y + deltaY;
        
        onMove(id, { 
          x: Math.max(0, newX), 
          y: Math.max(0, newY) 
        });
      }
      
      if (isResizing && onResize) {
        const deltaX = (e.clientX - startPos.current.x) / scale;
        const deltaY = (e.clientY - startPos.current.y) / scale;
        
        const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startSize.current.width + deltaX));
        const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startSize.current.height + deltaY));
        
        onResize(id, { width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, id, onMove, onResize, scale]);

  const handleBlur = () => {
    setIsEditing(false);
    onUpdate(id, localContent);
  };

  // Calculate font size based on note size
  const fontSize = size.width < 80 ? 8 : size.width < 100 ? 10 : 12;
  const iconSize = size.width < 80 ? 2 : 3;

  return (
    <div
      ref={noteRef}
      className={cn(
        "absolute rounded-md border-2 shadow-md cursor-move select-none transition-shadow",
        color,
        (isDragging || isResizing) && "shadow-lg z-50"
      )}
      style={{ 
        left: position.x, 
        top: position.y,
        width: size.width,
        minHeight: size.height,
      }}
      onMouseDown={handleMouseDown}
    >
      <div 
        className="flex items-center justify-between border-b border-black/10"
        style={{ padding: size.width < 80 ? '2px 4px' : '4px 8px' }}
      >
        <GripVertical className="text-black/30" style={{ width: iconSize * 4, height: iconSize * 4 }} />
        <button
          onClick={() => onDelete(id)}
          className="text-black/40 hover:text-black/70 transition-colors"
        >
          <X style={{ width: iconSize * 4, height: iconSize * 4 }} />
        </button>
      </div>
      <div className="p-1 note-content" style={{ padding: size.width < 80 ? '4px' : '8px' }}>
        {isEditing ? (
          <textarea
            autoFocus
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            onBlur={handleBlur}
            className="w-full bg-transparent resize-none focus:outline-none text-gray-800 placeholder:text-gray-500"
            style={{ 
              fontSize: `${fontSize}px`, 
              height: Math.max(30, size.height - (size.width < 80 ? 24 : 40)),
            }}
            placeholder="Type..."
          />
        ) : (
          <p
            onClick={() => setIsEditing(true)}
            className="text-gray-800 whitespace-pre-wrap cursor-text overflow-hidden"
            style={{ 
              fontSize: `${fontSize}px`,
              minHeight: Math.max(20, size.height - (size.width < 80 ? 24 : 40)),
            }}
          >
            {localContent || "Click to edit"}
          </p>
        )}
      </div>
      
      {/* Resize handle */}
      {onResize && (
        <div
          className="resize-handle absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
          onMouseDown={handleResizeStart}
        >
          <svg 
            viewBox="0 0 10 10" 
            className="w-full h-full text-black/30"
          >
            <path d="M 8 2 L 2 8 M 8 5 L 5 8 M 8 8 L 8 8" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      )}
    </div>
  );
}

export { colors as stickyColors };
