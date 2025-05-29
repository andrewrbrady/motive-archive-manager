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
import { Button } from "@/components/ui/button";
import {
  Search,
  ZoomIn,
  ZoomOut,
  CheckSquare,
  Square,
  Expand,
  Palette,
  X,
} from "lucide-react";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { BatchCanvasExtensionModal } from "./BatchCanvasExtensionModal";
import { BatchImageMatteModal } from "./BatchImageMatteModal";
import { Input } from "@/components/ui/input";

interface DraggableGalleryGridProps {
  gallery: Gallery;
  onOrderChange: (gallery: Gallery) => void;
  onImageSelect: (image: any) => void;
  onImageProcessed?: (originalImageId: string, newImageData: any) => void;
}

export function DraggableGalleryGrid({
  gallery,
  onOrderChange,
  onImageSelect,
  onImageProcessed,
}: DraggableGalleryGridProps) {
  const [isBatchMode, setIsBatchMode] = React.useState(false);
  const [selectedImageIds, setSelectedImageIds] = React.useState<Set<string>>(
    new Set()
  );
  const [isBatchCanvasExtensionOpen, setIsBatchCanvasExtensionOpen] =
    React.useState(false);
  const [isBatchImageMatteOpen, setIsBatchImageMatteOpen] =
    React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

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

  // Filter items based on search query
  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return items;
    }

    const query = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      const image = gallery.images?.find((img: any) => img._id === item.id);
      if (!image) return false;

      // Search in filename
      if (image.filename?.toLowerCase().includes(query)) return true;

      // Search in metadata
      if (image.metadata) {
        const metadataString = Object.values(image.metadata)
          .filter((value) => typeof value === "string")
          .join(" ")
          .toLowerCase();
        if (metadataString.includes(query)) return true;
      }

      return false;
    });
  }, [items, searchQuery, gallery.images]);

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

  // Reset batch mode when gallery changes
  React.useEffect(() => {
    setIsBatchMode(false);
    setSelectedImageIds(new Set());
    setSearchQuery("");
  }, [gallery._id]);

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

  const handleBatchModeToggle = () => {
    setIsBatchMode(!isBatchMode);
    setSelectedImageIds(new Set());
  };

  const handleImageSelection = (imageId: string, isSelected: boolean) => {
    setSelectedImageIds((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(imageId);
      } else {
        newSet.delete(imageId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allImageIds = searchQuery
      ? filteredItems.map((item) => item.id)
      : items.map((item) => item.id);
    setSelectedImageIds(new Set(allImageIds));
  };

  const handleDeselectAll = () => {
    setSelectedImageIds(new Set());
  };

  const getSelectedImages = () => {
    const relevantItems = searchQuery ? filteredItems : items;
    return relevantItems
      .filter((item) => selectedImageIds.has(item.id))
      .map((item) => gallery.images?.find((img: any) => img._id === item.id))
      .filter(Boolean);
  };

  const getSelectedHorizontalImages = () => {
    return getSelectedImages().filter((image) => {
      // Check if we have image dimensions in metadata
      if (image.metadata?.dimensions) {
        return (
          image.metadata.dimensions.width > image.metadata.dimensions.height
        );
      }
      // If no dimensions available, we'll include it and let the processing handle it
      return true;
    });
  };

  const handleBatchCanvasExtension = () => {
    const selectedImages = getSelectedHorizontalImages();
    if (selectedImages.length === 0) {
      toast({
        title: "No Images Selected",
        description:
          "Please select at least one horizontal image for canvas extension.",
        variant: "destructive",
      });
      return;
    }
    setIsBatchCanvasExtensionOpen(true);
  };

  const handleBatchImageMatte = () => {
    const selectedImages = getSelectedImages();
    if (selectedImages.length === 0) {
      toast({
        title: "No Images Selected",
        description: "Please select at least one image for matte creation.",
        variant: "destructive",
      });
      return;
    }
    setIsBatchImageMatteOpen(true);
  };

  const handleBatchProcessingComplete = () => {
    setIsBatchMode(false);
    setSelectedImageIds(new Set());
    setIsBatchCanvasExtensionOpen(false);
    setIsBatchImageMatteOpen(false);
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
      {/* Search Input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search gallery images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchQuery && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Grid Controls */}
      <div className="flex items-center justify-between">
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

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filteredItems.length} of {items.length} images
            {searchQuery && ` matching "${searchQuery}"`}
          </span>
          <Button
            variant={isBatchMode ? "default" : "outline"}
            size="sm"
            onClick={handleBatchModeToggle}
          >
            {isBatchMode ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Exit Batch
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                Batch Select
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Show no results message when search returns no results */}
      {searchQuery && filteredItems.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No images found matching "{searchQuery}"
        </div>
      )}

      {isBatchMode && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedImageIds.size} image
              {selectedImageIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All{searchQuery ? " Filtered" : ""}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                Deselect All
              </Button>
            </div>
          </div>

          {selectedImageIds.size > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchCanvasExtension}
                className="bg-transparent hover:bg-blue-50/20 border-blue-300 text-blue-600 hover:text-blue-700"
              >
                <Expand className="h-4 w-4 mr-2" />
                Extend Canvas ({selectedImageIds.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchImageMatte}
                className="bg-transparent hover:bg-purple-50/20 border-purple-300 text-purple-600 hover:text-purple-700"
              >
                <Palette className="h-4 w-4 mr-2" />
                Create Matte ({selectedImageIds.size})
              </Button>
            </div>
          )}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredItems.map((item) => item.id)}
          strategy={rectSortingStrategy}
        >
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
              alignItems: "start",
            }}
          >
            {(() => {
              return filteredItems.map((item) => {
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
                    onImageProcessed={onImageProcessed}
                    galleryId={gallery._id}
                    isBatchMode={isBatchMode}
                    isSelected={selectedImageIds.has(item.id)}
                    onSelectionChange={(isSelected) =>
                      handleImageSelection(item.id, isSelected)
                    }
                  />
                );
              });
            })()}
          </div>
        </SortableContext>
      </DndContext>

      {/* Batch Processing Modals */}
      <BatchCanvasExtensionModal
        isOpen={isBatchCanvasExtensionOpen}
        onClose={() => setIsBatchCanvasExtensionOpen(false)}
        images={getSelectedImages()}
        galleryId={gallery._id}
        onBatchProcessingComplete={handleBatchProcessingComplete}
        onImageProcessed={onImageProcessed}
      />

      <BatchImageMatteModal
        isOpen={isBatchImageMatteOpen}
        onClose={() => setIsBatchImageMatteOpen(false)}
        images={getSelectedImages()}
        galleryId={gallery._id}
        onBatchProcessingComplete={handleBatchProcessingComplete}
        onImageProcessed={onImageProcessed}
      />
    </div>
  );
}
