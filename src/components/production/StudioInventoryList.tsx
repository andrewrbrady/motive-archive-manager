"use client";

import { useState, useEffect } from "react";
import { StudioInventoryItem } from "@/types/inventory";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MapPin, Box } from "lucide-react";
import EditInventoryItemModal from "./EditInventoryItemModal";
import { Checkbox } from "@/components/ui/checkbox";
import { LocationResponse } from "@/models/location";

interface StudioInventoryListProps {
  items: StudioInventoryItem[];
  onItemUpdate: (updatedItem: StudioInventoryItem) => void;
  onItemDelete: (itemId: string) => void;
  selectedItems: string[];
  onSelectedItemsChange: (selectedItems: string[]) => void;
  isSelectionMode: boolean;
}

export default function StudioInventoryList({
  items,
  onItemUpdate,
  onItemDelete,
  selectedItems,
  onSelectedItemsChange,
  isSelectionMode,
}: StudioInventoryListProps) {
  const [editingItem, setEditingItem] = useState<StudioInventoryItem | null>(
    null
  );
  const [locations, setLocations] = useState<Record<string, LocationResponse>>(
    {}
  );

  // Fetch locations when component mounts
  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations");
      if (!response.ok) throw new Error("Failed to fetch locations");
      const data = await response.json();

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

  const handleSaveEdit = async (updatedItem: StudioInventoryItem) => {
    try {
      const response = await fetch(`/api/studio_inventory/${updatedItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedItem),
      });

      if (!response.ok) throw new Error("Failed to update inventory item");
      onItemUpdate(updatedItem);
    } catch (error) {
      console.error("Error updating inventory item:", error);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const response = await fetch(`/api/studio_inventory/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete inventory item");
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

  return (
    <div className="space-y-2">
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
                <th className="py-3 px-2 sticky left-0 bg-background z-10 w-12"></th>{" "}
                {/* Image column */}
                <th className="py-3 px-2 sticky left-[48px] bg-background z-10">
                  Name
                </th>
                <th className="py-3 px-2">Category</th>
                <th className="py-3 px-2">Manufacturer</th>
                <th className="py-3 px-2">Model</th>
                <th className="py-3 px-2">Location</th>
                <th className="py-3 px-2">Status</th>
                {!isSelectionMode && (
                  <th className="py-3 px-2 text-right">Actions</th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="text-[hsl(var(--foreground))]">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors"
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
                    {item.category}
                    {item.subCategory && (
                      <span className="text-xs text-[hsl(var(--muted-foreground))] block">
                        {item.subCategory}
                      </span>
                    )}
                  </td>

                  {/* Manufacturer */}
                  <td className="py-3 px-2 text-sm">{item.manufacturer}</td>

                  {/* Model */}
                  <td className="py-3 px-2 text-sm">{item.model}</td>

                  {/* Location */}
                  <td className="py-3 px-2 text-sm">
                    {item.location ? (
                      <span className="inline-flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {getLocationName(item.location)}
                      </span>
                    ) : (
                      <span className="text-[hsl(var(--muted-foreground))]">
                        -
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-2">
                    <span
                      className={cn(
                        "px-2 py-1 rounded-md text-xs",
                        item.isAvailable
                          ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]"
                          : "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]"
                      )}
                    >
                      {item.isAvailable ? "Available" : "In Use"}
                    </span>
                  </td>

                  {/* Actions */}
                  {!isSelectionMode && (
                    <td className="py-3 px-2 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
                          title="Edit item"
                        >
                          <Edit className="w-4 h-4" />
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
              ))}
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
