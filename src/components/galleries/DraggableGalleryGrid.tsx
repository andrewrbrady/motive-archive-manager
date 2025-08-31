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
  ArrowUpDown,
} from "lucide-react";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { BatchCanvasExtensionModal } from "./BatchCanvasExtensionModal";
import { BatchImageMatteModal } from "./BatchImageMatteModal";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageViewModal } from "@/components/cars/ImageViewModal";
import { ImageData } from "@/app/images/columns";

interface DraggableGalleryGridProps {
  gallery: Gallery;
  onOrderChange: (gallery: Gallery) => void;
  onImageSelect: (image: any) => void;
  onImageProcessed?: (originalImageId: string, newImageData: any) => void;
  hideControls?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  sortBy?: string;
  onSortByChange?: (v: string) => void;
  sortOrder?: "asc" | "desc";
  onSortOrderChange?: (v: "asc" | "desc") => void;
  gridColumns?: number;
  onGridColumnsChange?: (v: number) => void;
  isBatchMode?: boolean;
  onBatchModeToggle?: () => void;
}

export function DraggableGalleryGrid({
  gallery,
  onOrderChange,
  onImageSelect,
  onImageProcessed,
  hideControls,
  searchQuery: controlledSearch,
  onSearchQueryChange,
  sortBy: controlledSortBy,
  onSortByChange,
  sortOrder: controlledSortOrder,
  onSortOrderChange,
  gridColumns: controlledGridColumns,
  onGridColumnsChange,
  isBatchMode: controlledBatchMode,
  onBatchModeToggle,
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
  const [sortBy, setSortBy] = React.useState<string>("manual");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  // Image view modal state
  const [isImageViewModalOpen, setIsImageViewModalOpen] = React.useState(false);
  const [selectedImageForView, setSelectedImageForView] =
    React.useState<ImageData | null>(null);

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

  // Sort items based on selected criteria
  const sortItems = React.useCallback(
    (itemsToSort: any[], sortBy: string, sortOrder: "asc" | "desc") => {
      if (sortBy === "manual") {
        return itemsToSort; // Keep manual order (drag-and-drop)
      }

      const sorted = [...itemsToSort].sort((a, b) => {
        const imageA = gallery.images?.find((img: any) => img._id === a.id);
        const imageB = gallery.images?.find((img: any) => img._id === b.id);

        if (!imageA || !imageB) return 0;

        let comparison = 0;

        switch (sortBy) {
          case "filename":
            // Use natural sorting (macOS-style) for filenames
            comparison = (imageA.filename || "").localeCompare(
              imageB.filename || "",
              undefined,
              {
                numeric: true,
                sensitivity: "base",
              }
            );
            break;
          case "createdAt":
            comparison =
              new Date(imageA.createdAt || 0).getTime() -
              new Date(imageB.createdAt || 0).getTime();
            break;
          case "updatedAt":
            comparison =
              new Date(imageA.updatedAt || 0).getTime() -
              new Date(imageB.updatedAt || 0).getTime();
            break;
          case "angle":
            comparison = (imageA.metadata?.angle || "").localeCompare(
              imageB.metadata?.angle || ""
            );
            break;
          case "view":
            comparison = (imageA.metadata?.view || "").localeCompare(
              imageB.metadata?.view || ""
            );
            break;
          case "movement":
            comparison = (imageA.metadata?.movement || "").localeCompare(
              imageB.metadata?.movement || ""
            );
            break;
          case "tod":
            comparison = (imageA.metadata?.tod || "").localeCompare(
              imageB.metadata?.tod || ""
            );
            break;
          default:
            return 0;
        }

        return sortOrder === "asc" ? comparison : -comparison;
      });

      return sorted;
    },
    [gallery.images]
  );

  // Get sorted items
  // Effective (controlled) values fall back to internal state
  const effectiveSearchQuery = controlledSearch ?? searchQuery;
  const effectiveSortBy = controlledSortBy ?? sortBy;
  const effectiveSortOrder = controlledSortOrder ?? sortOrder;
  const effectiveIsBatchMode = controlledBatchMode ?? isBatchMode;

  const sortedItems = React.useMemo(() => {
    return sortItems(items, effectiveSortBy, effectiveSortOrder);
  }, [items, effectiveSortBy, effectiveSortOrder, sortItems]);

  // Filter items based on search query
  const filteredItems = React.useMemo(() => {
    if (!effectiveSearchQuery.trim()) {
      return sortedItems;
    }

    const query = effectiveSearchQuery.toLowerCase().trim();
    return sortedItems.filter((item) => {
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
  }, [sortedItems, searchQuery, gallery.images]);

  // Build ordered list of images for the modal based on current filter/order
  const orderedFilteredImages: ImageData[] = React.useMemo(() => {
    return filteredItems
      .map((item) => gallery.images?.find((img: any) => img._id === item.id))
      .filter(Boolean) as ImageData[];
  }, [filteredItems, gallery.images]);

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

  // Effective grid columns (controlled prop fallback to internal state)
  const effectiveGridColumns = controlledGridColumns ?? gridColumns;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Only activate when in manual mode
      activationConstraint: {
        distance: effectiveSortBy === "manual" ? 8 : Infinity, // Require 8px movement when manual, impossible when sorted
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter:
        effectiveSortBy === "manual" ? sortableKeyboardCoordinates : undefined,
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

  // Handle sort change - when switching to manual, preserve current sorted order
  const handleSortChange = React.useCallback(
    (newSortBy: string) => {
      if (newSortBy === "manual" && effectiveSortBy !== "manual") {
        // User is switching from sorted view to manual - preserve the current sorted order
        const currentSortedOrder = sortItems(
          items,
          effectiveSortBy,
          effectiveSortOrder
        );
        setItems(currentSortedOrder);

        // Update the gallery's orderedImages to reflect this new order
        const newOrderedImages = currentSortedOrder.map((item, index) => ({
          id: item.id,
          order: index,
        }));

        const updatedGallery = {
          ...gallery,
          orderedImages: newOrderedImages,
        };

        // Call the parent's onOrderChange to save this new order
        onOrderChange(updatedGallery);
      }
      if (onSortByChange) {
        onSortByChange(newSortBy);
      } else {
        setSortBy(newSortBy);
      }
    },
    [effectiveSortBy, effectiveSortOrder, items, sortItems, gallery, onOrderChange, onSortByChange]
  );

  // Update gallery order whenever sort criteria changes (not just when switching to manual)
  // Use a ref to track the last saved order to prevent infinite loops
  const lastSavedOrderRef = React.useRef<string>("");

  React.useEffect(() => {
    if (effectiveSortBy !== "manual") {
      // Apply the current sort and save it to the gallery
      const currentSortedOrder = sortItems(
        items,
        effectiveSortBy,
        effectiveSortOrder
      );

      // Create a unique key for this order to detect changes
      const orderKey = `${effectiveSortBy}-${effectiveSortOrder}-${currentSortedOrder
        .map((item) => item.id)
        .join(",")}`;

      // Only update if the order actually changed
      if (orderKey !== lastSavedOrderRef.current) {
        lastSavedOrderRef.current = orderKey;

        // Update the gallery's orderedImages to reflect this sorted order
        const newOrderedImages = currentSortedOrder.map((item, index) => ({
          id: item.id,
          order: index,
        }));

        const updatedGallery = {
          ...gallery,
          orderedImages: newOrderedImages,
        };

        // Call the parent's onOrderChange to save this new order
        onOrderChange(updatedGallery);
      }
    }
  }, [effectiveSortBy, effectiveSortOrder, items, sortItems]); // Removed gallery and onOrderChange from dependencies

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over || active.id === over.id) return;

    // Only allow drag and drop when in manual mode
    if (effectiveSortBy !== "manual") {
      return;
    }

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
    if (onGridColumnsChange) {
      onGridColumnsChange(value[0]);
    } else {
      setGridColumns(value[0]);
    }
  };

  const handleBatchModeToggle = () => {
    if (onBatchModeToggle) {
      onBatchModeToggle();
    } else {
      setIsBatchMode(!isBatchMode);
    }
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
    const allImageIds = effectiveSearchQuery
      ? filteredItems.map((item) => item.id)
      : items.map((item) => item.id);
    setSelectedImageIds(new Set(allImageIds));
  };

  const handleDeselectAll = () => {
    setSelectedImageIds(new Set());
  };

  const getSelectedImages = () => {
    const relevantItems = effectiveSearchQuery ? filteredItems : items;
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

  const handleOpenImageView = (image: any) => {
    // Ensure the image has the fields expected by ImageViewModal's ImageData
    const normalized: ImageData = {
      _id: image._id,
      url: image.url,
      filename: image.filename,
      metadata: image.metadata || {},
      // Optional fields used by the modal if present
      createdAt: (image as any).createdAt,
      updatedAt: (image as any).updatedAt,
      carId: (image as any).carId,
    } as unknown as ImageData;

    setSelectedImageForView(normalized);
    setIsImageViewModalOpen(true);
  };

  const handleNavigateImage = (nextImage: ImageData) => {
    setSelectedImageForView(nextImage);
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
      {/* Search and Sort Controls */}
      {!hideControls && (
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search gallery images..."
            value={effectiveSearchQuery}
            onChange={(e) =>
              onSearchQueryChange
                ? onSearchQueryChange(e.target.value)
                : setSearchQuery(e.target.value)
            }
            className="pl-10"
          />
        </div>

        {/* Sort Controls */}
        <Select value={effectiveSortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual Order</SelectItem>
            <SelectItem value="filename">Filename</SelectItem>
            <SelectItem value="createdAt">Date Created</SelectItem>
            <SelectItem value="updatedAt">Date Updated</SelectItem>
            <SelectItem value="angle">Angle</SelectItem>
            <SelectItem value="view">View</SelectItem>
            <SelectItem value="movement">Movement</SelectItem>
            <SelectItem value="tod">Time of Day</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onSortOrderChange
              ? onSortOrderChange(
                  effectiveSortOrder === "asc" ? "desc" : "asc"
                )
              : setSortOrder(effectiveSortOrder === "asc" ? "desc" : "asc")
          }
          className="px-3"
          title={`Currently sorting ${effectiveSortOrder === "asc" ? "ascending" : "descending"}. Click to toggle.`}
          disabled={effectiveSortBy === "manual"}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>

        {effectiveSearchQuery && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onSearchQueryChange ? onSearchQueryChange("") : setSearchQuery("")
            }
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>
      )}

      {/* Grid Controls */}
      {!hideControls && (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 px-2">
          <ZoomOut className="h-4 w-4 text-muted-foreground" />
          <Slider
            defaultValue={[effectiveGridColumns]}
            min={isSmall ? 1 : 2}
            max={isSmall ? 4 : 8}
            step={1}
            value={[effectiveGridColumns]}
            onValueChange={handleZoomChange}
            className="w-[200px]"
          />
          <ZoomIn className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filteredItems.length} of {items.length} images
            {effectiveSearchQuery && ` matching "${effectiveSearchQuery}"`}
            {effectiveSortBy !== "manual" && (
              <span className="text-blue-600 ml-2">
                • Sorted by {effectiveSortBy} ({effectiveSortOrder})
              </span>
            )}
          </span>
          <Button
            variant={effectiveIsBatchMode ? "default" : "outline"}
            size="sm"
            onClick={handleBatchModeToggle}
          >
            {effectiveIsBatchMode ? (
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
      )}

      {/* Show no results message when search returns no results */}
      {effectiveSearchQuery && filteredItems.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No images found matching "{effectiveSearchQuery}"
        </div>
      )}

      {effectiveIsBatchMode && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedImageIds.size} image
              {selectedImageIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All{effectiveSearchQuery ? " Filtered" : ""}
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
              gridTemplateColumns: `repeat(${effectiveGridColumns}, minmax(0, 1fr))`,
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
                    onView={handleOpenImageView}
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

      {/* Image view modal for detailed info, like /images page */}
      {selectedImageForView && (
        <ImageViewModal
          isOpen={isImageViewModalOpen}
          onClose={() => {
            setIsImageViewModalOpen(false);
            setSelectedImageForView(null);
          }}
          image={selectedImageForView}
          images={orderedFilteredImages}
          onNavigate={handleNavigateImage}
        />
      )}
    </div>
  );
}
