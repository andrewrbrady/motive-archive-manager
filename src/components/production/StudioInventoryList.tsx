"use client";

import { useState, useEffect } from "react";
import { StudioInventoryItem, InventoryCategory } from "@/types/inventory";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MapPin, Box, Copy, Save, X } from "lucide-react";
import EditInventoryItemModal from "./EditInventoryItemModal";
import { Checkbox } from "@/components/ui/checkbox";
import { LocationResponse } from "@/models/location";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAPI } from "@/hooks/useAPI";

interface StudioInventoryListProps {
  items: StudioInventoryItem[];
  onItemUpdate: (updatedItem: StudioInventoryItem) => void;
  onItemDelete: (itemId: string) => void;
  onItemDuplicate: (item: StudioInventoryItem) => void;
  selectedItems: string[];
  onSelectedItemsChange: (selectedItems: string[]) => void;
  isSelectionMode: boolean;
  isEditMode?: boolean;
}

export default function StudioInventoryList({
  items,
  onItemUpdate,
  onItemDelete,
  onItemDuplicate,
  selectedItems,
  onSelectedItemsChange,
  isSelectionMode,
  isEditMode = false,
}: StudioInventoryListProps) {
  const { toast } = useToast();
  const api = useAPI();
  const [editingItem, setEditingItem] = useState<StudioInventoryItem | null>(
    null
  );
  const [locations, setLocations] = useState<Record<string, LocationResponse>>(
    {}
  );
  const [isDeletingItem, setIsDeletingItem] = useState<string | null>(null);
  const [containers, setContainers] = useState<any[]>([]);
  const [editedItems, setEditedItems] = useState<
    Record<string, Partial<StudioInventoryItem>>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  // Reset edited items when edit mode changes
  useEffect(() => {
    if (!isEditMode) {
      setEditedItems({});
    }
  }, [isEditMode]);

  // Fetch locations when component mounts
  useEffect(() => {
    fetchLocations();
  }, []);

  // Fetch containers when component mounts
  useEffect(() => {
    const fetchContainers = async () => {
      if (!api) return;

      try {
        const data = (await api.get("containers")) as any[];
        setContainers(data);
      } catch (error) {
        console.error("Error fetching containers:", error);
      }
    };

    fetchContainers();
  }, [api]);

  const fetchLocations = async () => {
    if (!api) return;

    try {
      const data = (await api.get("locations")) as LocationResponse[];

      // Convert array to record for easy lookup
      const locationsRecord: Record<string, LocationResponse> = {};
      data.forEach((location: LocationResponse) => {
        locationsRecord[location.id] = location;
      });

      setLocations(locationsRecord);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const getLocationName = (locationId: string | undefined) => {
    if (!locationId) return "No location";
    return locations[locationId]?.name || "Unknown location";
  };

  // Helper function to get container name by ID
  const getContainerName = (containerId: string) => {
    const container = containers.find((c) => c.id === containerId);
    if (!container) return containerId;
    return `${container.name} (#${container.containerNumber})`;
  };

  const handleSaveEdit = async (updatedItem: StudioInventoryItem) => {
    if (!api) return;

    try {
      await api.put(`studio_inventory/${updatedItem.id}`, updatedItem);
      onItemUpdate(updatedItem);
    } catch (error) {
      console.error("Error updating inventory item:", error);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!api) return;

    try {
      await api.delete(`studio_inventory/${itemId}`);
      onItemDelete(itemId);
    } catch (error) {
      console.error("Error deleting inventory item:", error);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      onSelectedItemsChange(selectedItems.filter((id) => id !== itemId));
    } else {
      onSelectedItemsChange([...selectedItems, itemId]);
    }
  };

  // Get the current value for a field, considering edits in progress
  const getCurrentValue = (
    item: StudioInventoryItem,
    field: keyof StudioInventoryItem
  ) => {
    if (editedItems[item.id] && editedItems[item.id][field] !== undefined) {
      return editedItems[item.id][field];
    }
    return item[field];
  };

  // Update an item in the editedItems state
  const updateEditedItem = (itemId: string, field: string, value: any) => {
    setEditedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  // Save all edits in batch
  const handleSaveAllEdits = async () => {
    if (!api) return;

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
            .put(`studio_inventory/${id}`, updatedItem)
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

  return (
    <div className="space-y-2">
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

      {items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No items found. Try adjusting your filters or add new items.
        </div>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg border border-[hsl(var(--border))]">
          <table className="w-full">
            {/* Table Header */}
            <thead>
              <tr className="text-left text-[hsl(var(--muted-foreground))] text-xs uppercase">
                {isSelectionMode && (
                  <th className="py-3 px-2 sticky left-0 bg-background z-10"></th>
                )}
                <th className="py-3 px-2 sticky left-0 bg-background z-10 w-12"></th>
                {/* Image column */}
                <th className="py-3 px-2 sticky left-[48px] bg-background z-10">
                  Name
                </th>
                <th className="py-3 px-2">Category</th>
                <th className="py-3 px-2">Manufacturer</th>
                <th className="py-3 px-2">Model</th>
                <th className="py-3 px-2">Quantity</th>
                <th className="py-3 px-2">Location</th>
                <th className="py-3 px-2">Container</th>
                <th className="py-3 px-2">Status</th>
                {!isSelectionMode && (
                  <th className="py-3 px-2 text-right">Actions</th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="text-[hsl(var(--foreground))]">
              {items.map((item) => {
                const isEdited = !!editedItems[item.id];

                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-t border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors",
                      isSelectionMode &&
                        selectedItems.includes(item.id) &&
                        "bg-accent",
                      isEdited && "bg-accent"
                    )}
                  >
                    {isSelectionMode && (
                      <td className="py-3 px-2 sticky left-0 bg-background z-10">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                          disabled={false}
                        />
                      </td>
                    )}

                    {/* Thumbnail */}
                    <td className="py-3 px-2 sticky left-0 bg-background z-10">
                      <div className="relative w-8 h-8 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {item.primaryImage ? (
                          <Image
                            src={item.primaryImage}
                            alt={item.name}
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                            <span className="text-xs">No img</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="py-3 px-2 sticky left-[48px] bg-background z-10">
                      <span className="font-medium text-sm">{item.name}</span>
                      {item.currentKitId && (
                        <span className="ml-2 inline-flex items-center text-xs text-[hsl(var(--primary))]">
                          <Box className="w-3 h-3 mr-1" />
                          Kit
                        </span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-2 text-sm">
                      {isSelectionMode || !isEditMode ? (
                        <>
                          {item.category}
                          {item.subCategory && (
                            <span className="text-xs text-[hsl(var(--muted-foreground))] block">
                              {item.subCategory}
                            </span>
                          )}
                        </>
                      ) : isEditMode ? (
                        <>
                          <Select
                            value={item.category}
                            onValueChange={async (value) => {
                              const updatedItem = {
                                ...item,
                                category: value as InventoryCategory,
                              };
                              await handleSaveEdit(updatedItem);
                            }}
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Camera">Camera</SelectItem>
                              <SelectItem value="Lens">Lens</SelectItem>
                              <SelectItem value="Lighting">Lighting</SelectItem>
                              <SelectItem value="Audio">Audio</SelectItem>
                              <SelectItem value="Grip">Grip</SelectItem>
                              <SelectItem value="Power">Power</SelectItem>
                              <SelectItem value="Storage">Storage</SelectItem>
                              <SelectItem value="Accessories">
                                Accessories
                              </SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {item.subCategory && (
                            <span className="text-xs text-[hsl(var(--muted-foreground))] block mt-1">
                              {item.subCategory}
                            </span>
                          )}
                        </>
                      ) : null}
                    </td>

                    {/* Manufacturer */}
                    <td className="py-3 px-2 text-sm">{item.manufacturer}</td>

                    {/* Model */}
                    <td className="py-3 px-2 text-sm">{item.model}</td>

                    {/* Quantity */}
                    <td className="py-3 px-2 text-sm">
                      {isSelectionMode || !isEditMode ? (
                        item.quantity || 1
                      ) : (
                        <Select
                          value={(item.quantity || 1).toString()}
                          onValueChange={async (value) => {
                            const updatedItem = {
                              ...item,
                              quantity: parseInt(value),
                            };
                            await handleSaveEdit(updatedItem);
                          }}
                        >
                          <SelectTrigger className="h-8 w-20">
                            <SelectValue placeholder="Quantity" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 10, 15, 20, 25, 50, 100].map(
                              (num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </td>

                    {/* Location */}
                    <td className="py-3 px-2 text-sm">
                      {isSelectionMode || !isEditMode ? (
                        item.location ? (
                          <span className="inline-flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {getLocationName(item.location)}
                          </span>
                        ) : (
                          <span className="text-[hsl(var(--muted-foreground))]">
                            -
                          </span>
                        )
                      ) : (
                        <Select
                          value={item.location || ""}
                          onValueChange={async (value) => {
                            const updatedItem = {
                              ...item,
                              location: value || undefined,
                            };
                            await handleSaveEdit(updatedItem);
                          }}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No location</SelectItem>
                            {Object.values(locations).map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>

                    {/* Container */}
                    <td className="py-3 px-2 text-sm">
                      {isSelectionMode || !isEditMode ? (
                        item.containerId ? (
                          <span className="inline-flex items-center">
                            <Box className="w-3 h-3 mr-1" />
                            {getContainerName(item.containerId)}
                          </span>
                        ) : (
                          <span className="text-[hsl(var(--muted-foreground))]">
                            -
                          </span>
                        )
                      ) : (
                        <Select
                          value={item.containerId || ""}
                          onValueChange={async (value) => {
                            const updatedItem = {
                              ...item,
                              containerId: value || undefined,
                            };
                            await handleSaveEdit(updatedItem);
                          }}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue placeholder="Select container" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No container</SelectItem>
                            {Array.isArray(containers) &&
                              containers.map((container) => (
                                <SelectItem
                                  key={container.id}
                                  value={container.id}
                                >
                                  {container.name} #{container.containerNumber}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-2 text-sm">
                      {isSelectionMode || !isEditMode ? (
                        item.isAvailable === false ? (
                          <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs">
                            Checked out
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
                            Available
                          </span>
                        )
                      ) : (
                        <Select
                          value={
                            item.isAvailable === false
                              ? "checked-out"
                              : "available"
                          }
                          onValueChange={async (value) => {
                            const updatedItem = {
                              ...item,
                              isAvailable: value === "available",
                            };
                            await handleSaveEdit(updatedItem);
                          }}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="checked-out">
                              Checked out
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>

                    {/* Actions */}
                    {!isSelectionMode && (
                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingItem(item);
                            }}
                            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
                            title="Edit item"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onItemDuplicate(item);
                            }}
                            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
                            title="Duplicate item"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                            title="Delete item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingItem && (
        <EditInventoryItemModal
          isOpen={true}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEdit}
          item={editingItem}
        />
      )}
    </div>
  );
}
