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
import { Slider } from "@/components/ui/slider";
import { Search, ZoomIn, ZoomOut } from "lucide-react";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

interface DraggableGalleryGridProps {
  gallery: Gallery;
  onOrderChange: (gallery: Gallery) => void;
  onImageSelect: (image: any) => void;
}

export function DraggableGalleryGrid({
  gallery,
  onOrderChange,
  onImageSelect,
}: DraggableGalleryGridProps) {
  const getOrderedItems = React.useCallback((gallery: Gallery) => {
    if (
      Array.isArray(gallery.orderedImages) &&
      gallery.orderedImages.length > 0
    ) {
      return gallery.orderedImages;
    }

    if (Array.isArray(gallery.imageIds)) {
      return gallery.imageIds.map((id, index) => ({ id, order: index }));
    }

    return [];
  }, []);

  const [items, setItems] = React.useState(() => getOrderedItems(gallery));

  // Keep track of the last successful order to handle errors
  const lastSuccessfulOrder = React.useRef(items);

  // Responsive grid columns based on screen size
  const isSmall = useMediaQuery("(max-width: 640px)");
  const isMedium = useMediaQuery("(max-width: 1024px)");

  const getDefaultColumns = () => {
    if (isSmall) return 2;
    if (isMedium) return 3;
    return 4;
  };

  const [gridColumns, setGridColumns] = React.useState(getDefaultColumns());

  // Update grid columns when screen size changes
  React.useEffect(() => {
    setGridColumns(getDefaultColumns());
  }, [isSmall, isMedium]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update lastSuccessfulOrder when gallery changes
  React.useEffect(() => {
    const newItems = getOrderedItems(gallery);
    lastSuccessfulOrder.current = newItems;
    setItems(newItems);
  }, [gallery, getOrderedItems]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newItems = arrayMove(items, oldIndex, newIndex).map(
      (item, index) => ({
        ...item,
        order: index,
      })
    );

    // Optimistically update the UI
    setItems(newItems);

    try {
      // Update the backend
      await updateGalleryImageOrder(gallery._id, newItems);
      // Update the last successful order
      lastSuccessfulOrder.current = newItems;
      // Notify parent of change with updated gallery data
      onOrderChange({
        ...gallery,
        orderedImages: newItems,
      });
    } catch (error) {
      // On error, revert to the last successful order
      setItems(lastSuccessfulOrder.current);
      toast({
        title: "Error",
        description: "Failed to update image order",
        variant: "destructive",
      });
    }
  };

  const handleZoomChange = (value: number[]) => {
    setGridColumns(value[0]);
  };

  // If there are no items to display, show a message
  if (!items.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No images to display
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 px-2">
        <ZoomOut className="h-4 w-4 text-muted-foreground" />
        <Slider
          defaultValue={[gridColumns]}
          min={isSmall ? 1 : 2}
          max={isSmall ? 4 : 8}
          step={1}
          value={[gridColumns]}
          onValueChange={handleZoomChange}
          className="w-[200px]"
        />
        <ZoomIn className="h-4 w-4 text-muted-foreground" />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={rectSortingStrategy}
        >
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
            }}
          >
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
    </div>
  );
}
