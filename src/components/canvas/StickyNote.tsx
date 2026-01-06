import { useState, useRef, useEffect } from "react";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface StickyNoteProps {
  id: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, position: { x: number; y: number }) => void;
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

export function StickyNote({
  id,
  content,
  color,
  position,
  onUpdate,
  onDelete,
  onMove,
  canvasRef,
  scale = 1,
}: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(!content);
  const [localContent, setLocalContent] = useState(content);
  const [isDragging, setIsDragging] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startNotePos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.note-content')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    
    startPos.current = { x: e.clientX, y: e.clientY };
    startNotePos.current = { x: position.x, y: position.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      // Calculate delta from start position
      const deltaX = (e.clientX - startPos.current.x) / scale;
      const deltaY = (e.clientY - startPos.current.y) / scale;
      
      // New position = start position + delta
      const newX = startNotePos.current.x + deltaX;
      const newY = startNotePos.current.y + deltaY;
      
      onMove(id, { 
        x: Math.max(0, newX), 
        y: Math.max(0, newY) 
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, id, onMove, scale]);

  const handleBlur = () => {
    setIsEditing(false);
    onUpdate(id, localContent);
  };

  return (
    <div
      ref={noteRef}
      className={cn(
        "absolute w-[140px] min-h-[100px] rounded-md border-2 shadow-md cursor-move select-none transition-shadow",
        color,
        isDragging && "shadow-lg z-50"
      )}
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center justify-between px-2 py-1 border-b border-black/10">
        <GripVertical className="h-3 w-3 text-black/30" />
        <button
          onClick={() => onDelete(id)}
          className="text-black/40 hover:text-black/70 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="p-2 note-content">
        {isEditing ? (
          <textarea
            autoFocus
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            onBlur={handleBlur}
            className="w-full h-16 bg-transparent resize-none text-xs focus:outline-none text-gray-800 placeholder:text-gray-500"
            placeholder="Type here..."
          />
        ) : (
          <p
            onClick={() => setIsEditing(true)}
            className="text-xs text-gray-800 whitespace-pre-wrap cursor-text min-h-[40px]"
          >
            {localContent || "Click to edit"}
          </p>
        )}
      </div>
    </div>
  );
}

export { colors as stickyColors };
