import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

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
        "relative group rounded-lg overflow-hidden bg-background border border-border",
        "aspect-[16/9] shadow-sm hover:shadow-md transition-all duration-200",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary"
      )}
    >
      <div className="relative w-full h-full">
        <Image
          src={image.url}
          alt={image.filename || "Gallery image"}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover"
          priority={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 bg-background/80 rounded-full hover:bg-background shadow-sm hover:shadow-md transition-all duration-200"
          >
            <GripVertical className="h-4 w-4 text-foreground" />
          </button>
          <button
            onClick={() => onDelete(image)}
            className="p-1.5 bg-background/80 rounded-full hover:bg-destructive/90 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Trash2 className="h-4 w-4 text-destructive hover:text-destructive-foreground" />
          </button>
        </div>
        {image.filename && (
          <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <p className="text-xs text-white truncate px-2">{image.filename}</p>
          </div>
        )}
      </div>
    </div>
  );
}
