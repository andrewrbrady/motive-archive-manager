"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { StudioInventoryItem } from "@/types/inventory";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Trash2,
  MapPin,
  Box,
  Copy,
  Tag,
  Check,
  ImagePlus,
  Upload,
  Save,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import EditInventoryItemModal from "./EditInventoryItemModal";
import { BatchImageUploadModal } from "./BatchImageUploadModal";
import { uploadToCloudflare } from "@/lib/cloudflare";
import { useSession } from "@/hooks/useFirebaseAuth";
import { useAPI } from "@/hooks/useAPI";

interface StudioInventoryGridProps {
  items: StudioInventoryItem[];
  onItemUpdate: (updatedItem: StudioInventoryItem) => void;
  onItemDelete: (itemId: string) => void;
  onItemDuplicate: (item: StudioInventoryItem) => void;
  selectedItems: string[];
  onSelectedItemsChange: (selectedItems: string[]) => void;
  isSelectionMode: boolean;
  isEditMode: boolean;
}

export default function StudioInventoryGrid({
  items,
  onItemUpdate,
  onItemDelete,
  onItemDuplicate,
  selectedItems,
  onSelectedItemsChange,
  isSelectionMode,
  isEditMode,
}: StudioInventoryGridProps) {
  const { data: session, status } = useSession();
  const api = useAPI();
  const { toast } = useToast();
  const [draggedOverItem, setDraggedOverItem] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentDragItem, setCurrentDragItem] =
    useState<StudioInventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<StudioInventoryItem | null>(
    null
  );
  const [imageUploadItem, setImageUploadItem] =
    useState<StudioInventoryItem | null>(null);
  const [editedItems, setEditedItems] = useState<
    Record<string, Partial<StudioInventoryItem>>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [locations, setLocations] = useState<Record<string, any>>({});
  const [containers, setContainers] = useState<any[]>([]);

  // Fetch locations when component mounts
  useEffect(() => {
    if (status === "authenticated" && session?.user && api) {
      fetchLocations();
      fetchContainers();
    }
  }, [status, session, api]);

  // Reset edited items when edit mode changes
  useEffect(() => {
    if (!isEditMode) {
      setEditedItems({});
    }
  }, [isEditMode]);

  const fetchLocations = async () => {
    if (!api) return;

    try {
      const data = (await api.get("/locations")) as any[];

      // Convert array to record for easy lookup
      const locationsRecord: Record<string, any> = {};
      data.forEach((location: any) => {
        locationsRecord[location.id] = location;
      });

      setLocations(locationsRecord);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const fetchContainers = async () => {
    if (!api) return;

    try {
      const data = (await api.get("/containers")) as any[];
      setContainers(data);
    } catch (error) {
      console.error("Error fetching containers:", error);
    }
  };

  const getLocationName = useCallback(
    (locationId: string | undefined) => {
      if (!locationId) return "No location";
      return locations[locationId]?.name || "Unknown location";
    },
    [locations]
  );

  const getContainerName = useCallback(
    (containerId: string) => {
      const container = containers.find((c) => c.id === containerId);
      if (!container) return containerId;
      return `${container.name} (#${container.containerNumber})`;
    },
    [containers]
  );

  const updateEditedItem = useCallback(
    (itemId: string, field: string, value: any) => {
      setEditedItems((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [field]: value,
        },
      }));
    },
    []
  );

  // Get the current value for a field, considering edits in progress
  const getCurrentValue = useCallback(
    (item: StudioInventoryItem, field: keyof StudioInventoryItem) => {
      if (editedItems[item.id] && editedItems[item.id][field] !== undefined) {
        return editedItems[item.id][field];
      }
      return item[field];
    },
    [editedItems]
  );

  const handleSaveAllEdits = async () => {
    if (!api) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save changes",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const itemsToUpdate = Object.keys(editedItems);

    if (itemsToUpdate.length === 0) {
      toast({
        title: "No Changes",
        description: "No changes were made to save",
      });
      setIsSaving(false);
      return;
    }

    try {
      // Process each edited item
      const updatePromises = itemsToUpdate
        .map((id) => {
          const originalItem = items.find((item) => item.id === id);
          if (!originalItem) return null;

          const updatedItem = {
            ...originalItem,
            ...editedItems[id],
          };

          return api
            .put(`/studio_inventory/${id}`, updatedItem)
            .then(() => updatedItem);
        })
        .filter(Boolean);

      const results = await Promise.all(updatePromises);

      // Update all items in the local state
      results.forEach((updatedItem) => {
        if (updatedItem) {
          onItemUpdate(updatedItem);
        }
      });

      setEditedItems({});

      toast({
        title: "Success",
        description: `Updated ${results.length} items successfully`,
      });
    } catch (error) {
      console.error("Error saving batch edits:", error);
      toast({
        title: "Error",
        description: "Failed to save some changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleItemSelection = useCallback(
    (itemId: string) => {
      if (selectedItems.includes(itemId)) {
        onSelectedItemsChange(selectedItems.filter((id) => id !== itemId));
      } else {
        onSelectedItemsChange([...selectedItems, itemId]);
      }
    },
    [selectedItems, onSelectedItemsChange]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, item: StudioInventoryItem) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggedOverItem(item.id);
      setCurrentDragItem(item);
    },
    []
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>, item: StudioInventoryItem) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggedOverItem(item.id);
    },
    []
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverItem(null);
  }, []);

  const handleDrop = useCallback(
    async (
      event: React.DragEvent<HTMLDivElement>,
      item: StudioInventoryItem
    ) => {
      if (!isEditMode) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setDraggedOverItem(null);

      const files = event.dataTransfer.files;
      if (!files || files.length === 0) {
        return;
      }

      const imageFile = files[0];
      if (!imageFile.type.startsWith("image/")) {
        toast({
          title: "Invalid file",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      try {
        console.log("Uploading file:", {
          fileName: imageFile.name,
          fileSize: imageFile.size,
          fileType: imageFile.type,
          itemId: item.id,
        });

        // Use the uploadToCloudflare function instead of direct fetch
        const result = await uploadToCloudflare(imageFile);
        // [REMOVED] // [REMOVED] console.log("Upload success response:", result);

        // Use the image URL from the result
        const imageUrl = result.url;

        // Update the edited items state with the new image
        updateEditedItem(item.id, "primaryImage", imageUrl);

        // Update the images array
        const currentImages = item.images || [];
        const updatedImages = [...currentImages, imageUrl];
        updateEditedItem(item.id, "images", updatedImages);

        toast({
          title: "Image uploaded",
          description:
            "Image has been uploaded and will be applied when you save changes",
        });
      } catch (error) {
        console.error("Error uploading image:", error);
        toast({
          title: "Upload failed",
          description:
            error instanceof Error
              ? error.message
              : "Failed to upload image. Please try again.",
          variant: "destructive",
        });
      }
    },
    [isEditMode, toast, updateEditedItem]
  );

  const handleImageClick = (item: StudioInventoryItem) => {
    if (isEditMode) {
      setImageUploadItem(item);
    }
  };

  const handleImageUpload = (imageUrl: string, itemId: string) => {
    // Find the original item
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      toast({
        title: "Error",
        description: "Could not find item to update image",
        variant: "destructive",
      });
      return;
    }

    // Update the edited items state with the new image
    updateEditedItem(itemId, "primaryImage", imageUrl);

    // Update the images array
    const currentImages = item.images || [];
    const updatedImages = [...currentImages, imageUrl];
    updateEditedItem(itemId, "images", updatedImages);

    // Show success toast
    toast({
      title: "Image Updated",
      description: "The image will be saved when you click 'Save All Changes'",
    });
  };

  return (
    <div className="space-y-4">
      {isEditMode && (
        <div className="flex justify-between items-center p-4 bg-muted rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">Edit Mode</span>
            <span className="text-sm text-muted-foreground">
              Make changes to multiple items at once
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setEditedItems({})}
              disabled={Object.keys(editedItems).length === 0}
            >
              <X className="w-4 h-4 mr-2" />
              Discard Changes
            </Button>
            <Button
              onClick={handleSaveAllEdits}
              disabled={Object.keys(editedItems).length === 0 || isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              Save All Changes ({Object.keys(editedItems).length})
            </Button>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0 && currentDragItem) {
            // Simulate a drop event
            const dummyEvent = {
              preventDefault: () => {},
              stopPropagation: () => {},
              dataTransfer: {
                files: e.target.files,
              },
            } as unknown as React.DragEvent<HTMLDivElement>;
            handleDrop(dummyEvent, currentDragItem);
            e.target.value = "";
          }
        }}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map((item) => {
          const isEdited = !!editedItems[item.id];
          const primaryImage = getCurrentValue(item, "primaryImage") as string;
          const name = getCurrentValue(item, "name") as string;
          const category = getCurrentValue(item, "category") as string;
          const model = getCurrentValue(item, "model") as string;
          const manufacturer = getCurrentValue(item, "manufacturer") as string;
          const locationId = getCurrentValue(item, "location") as string;
          const containerId = getCurrentValue(item, "containerId") as string;
          const quantity = (getCurrentValue(item, "quantity") as number) || 1;

          return (
            <Card
              key={item.id}
              className={cn(
                "overflow-hidden",
                isSelectionMode &&
                  selectedItems.includes(item.id) &&
                  "ring-2 ring-primary",
                isEdited && "bg-accent"
              )}
            >
              <div
                className={cn(
                  "relative w-full h-48 bg-muted",
                  (isEditMode || isSelectionMode) && "cursor-pointer",
                  draggedOverItem === item.id &&
                    "ring-2 ring-primary bg-primary/10"
                )}
                onClick={
                  isSelectionMode
                    ? () => toggleItemSelection(item.id)
                    : isEditMode
                      ? () => {
                          setCurrentDragItem(item);
                          fileInputRef.current?.click(); // Open file dialog on click
                        }
                      : undefined
                }
                onDragOver={(e) => isEditMode && handleDragOver(e, item)}
                onDragEnter={(e) => isEditMode && handleDragEnter(e, item)}
                onDragLeave={(e) => isEditMode && handleDragLeave(e)}
                onDrop={(e) => isEditMode && handleDrop(e, item)}
              >
                {primaryImage ? (
                  <>
                    <Image
                      src={primaryImage}
                      alt={name}
                      fill
                      className="object-cover"
                    />
                    {isEditMode && (
                      <div
                        className={cn(
                          "absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity",
                          draggedOverItem === item.id && "opacity-100"
                        )}
                      >
                        {draggedOverItem === item.id ? (
                          <Upload className="w-8 h-8 text-white" />
                        ) : (
                          <ImagePlus className="w-8 h-8 text-white" />
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    {isEditMode ? (
                      <div
                        className={cn(
                          "flex flex-col items-center gap-2",
                          draggedOverItem === item.id &&
                            "scale-110 transition-transform"
                        )}
                      >
                        {draggedOverItem === item.id ? (
                          <Upload className="w-12 h-12 text-primary" />
                        ) : (
                          <ImagePlus className="w-12 h-12 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {draggedOverItem === item.id
                            ? "Drop image here"
                            : "Click or drag to add image"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No image</span>
                    )}
                  </div>
                )}

                {isSelectionMode && (
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                      className="h-5 w-5 bg-white bg-opacity-90"
                    />
                  </div>
                )}

                <div className="absolute top-2 right-2">
                  <Badge
                    variant={item.isAvailable ? "default" : "destructive"}
                    className={cn(
                      "text-xs",
                      item.isAvailable &&
                        "bg-green-100 text-green-800 hover:bg-green-100",
                      !item.isAvailable &&
                        "bg-amber-100 text-amber-800 hover:bg-amber-100"
                    )}
                  >
                    {item.isAvailable ? "Available" : "In Use"}
                  </Badge>
                </div>

                {item.currentKitId && (
                  <div className="absolute bottom-2 right-2">
                    <Badge variant="outline" className="bg-background/80">
                      <Box className="w-3 h-3 mr-1" />
                      Kit
                    </Badge>
                  </div>
                )}
              </div>

              <CardContent className="p-4">
                <div className="space-y-2">
                  <div>
                    <h3 className="font-medium text-sm line-clamp-1">{name}</h3>
                    <div className="flex gap-1 flex-wrap mt-1">
                      <Badge variant="outline" className="text-xs">
                        {category}
                      </Badge>
                      {quantity > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          Qty: {quantity}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-start gap-1">
                      <span className="font-medium min-w-[80px]">Model:</span>
                      <span className="line-clamp-1">{model}</span>
                    </div>
                    {manufacturer && (
                      <div className="flex items-start gap-1">
                        <span className="font-medium min-w-[80px]">
                          Manufacturer:
                        </span>
                        <span className="line-clamp-1">{manufacturer}</span>
                      </div>
                    )}
                    {locationId && (
                      <div className="flex items-start gap-1">
                        <span className="font-medium min-w-[80px]">
                          Location:
                        </span>
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          <span className="line-clamp-1">
                            {getLocationName(locationId)}
                          </span>
                        </span>
                      </div>
                    )}
                    {containerId && (
                      <div className="flex items-start gap-1">
                        <span className="font-medium min-w-[80px]">
                          Container:
                        </span>
                        <span className="flex items-center">
                          <Box className="w-3 h-3 mr-1" />
                          <span className="line-clamp-1">
                            {getContainerName(containerId)}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>

              {!isSelectionMode && (
                <CardFooter className="p-2 pt-0 flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingItem(item)}
                    className="h-8 px-2"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onItemDuplicate(item)}
                    className="h-8 px-2"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Are you sure you want to delete this item?"
                        )
                      ) {
                        onItemDelete(item.id);
                      }
                    }}
                    className="h-8 px-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>

      {editingItem && (
        <EditInventoryItemModal
          isOpen={true}
          onClose={() => setEditingItem(null)}
          onSave={(updatedItem) => {
            onItemUpdate(updatedItem);
            setEditingItem(null);
          }}
          item={editingItem}
        />
      )}

      {imageUploadItem && (
        <BatchImageUploadModal
          isOpen={true}
          onClose={() => setImageUploadItem(null)}
          onImageUpload={handleImageUpload}
          itemId={imageUploadItem.id}
          itemName={imageUploadItem.name}
          currentImage={imageUploadItem.primaryImage}
        />
      )}
    </div>
  );
}
