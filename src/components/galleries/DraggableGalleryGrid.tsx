import React from "react";
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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableGalleryItem } from "./SortableGalleryItem";
import { Gallery } from "@/lib/hooks/query/useGalleries";
import { updateGalleryImageOrder } from "@/lib/hooks/query/useGalleries";
import { toast } from "@/components/ui/use-toast";

interface DraggableGalleryGridProps {
  gallery: Gallery;
  onOrderChange: () => void;
  onImageSelect: (image: any) => void;
}

export function DraggableGalleryGrid({
  gallery,
  onOrderChange,
  onImageSelect,
}: DraggableGalleryGridProps) {
  const [items, setItems] = React.useState(() => {
    // Initialize items from gallery.orderedImages or create from imageIds
    return (
      gallery.orderedImages ||
      gallery.imageIds.map((id, index) => ({ id, order: index }))
    );
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex).map(
        (item, index) => ({
          ...item,
          order: index,
        })
      );

      setItems(newItems);

      try {
        await updateGalleryImageOrder(gallery._id, newItems);
        onOrderChange();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update image order",
          variant: "destructive",
        });
        // Revert to previous order on error
        setItems(items);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const image = gallery.images?.find(
              (img: any) => img._id === item.id
            );
            if (!image) return null;

            return (
              <SortableGalleryItem
                key={item.id}
                id={item.id}
                image={image}
                onDelete={onImageSelect}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
