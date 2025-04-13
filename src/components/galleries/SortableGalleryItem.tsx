import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableGalleryItemProps {
  id: string;
  image: {
    _id: string;
    url: string;
    filename?: string;
    metadata?: {
      description?: string;
      [key: string]: any;
    };
  };
  onDelete: (image: any) => void;
}

export function SortableGalleryItem({
  id,
  image,
  onDelete,
}: SortableGalleryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group rounded-md overflow-hidden bg-muted",
        isDragging && "opacity-50"
      )}
    >
      <div className="relative">
        <img
          src={image.url}
          alt={image.filename || "Gallery image"}
          className="w-full h-auto object-contain"
        />
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100">
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 bg-background/80 rounded-full hover:bg-background/90 transition-colors"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(image)}
            className="p-1.5 bg-background/80 rounded-full hover:bg-background/90 transition-colors"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </button>
        </div>
      </div>
    </div>
  );
}
