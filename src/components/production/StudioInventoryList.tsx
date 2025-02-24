"use client";

import { useState } from "react";
import { StudioInventoryItem } from "@/types/inventory";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Check } from "lucide-react";
import EditInventoryItemModal from "./EditInventoryItemModal";
import { Checkbox } from "@/components/ui/checkbox";

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
        <div className="text-center py-8 text-foreground-muted">
          No items added yet. Click "Add Item" to get started.
        </div>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 p-3 bg-background-primary dark:bg-background-primary border border-[hsl(var(--border-subtle))] rounded-lg hover:shadow-sm transition-shadow"
          >
            {isSelectionMode && (
              <div className="flex-shrink-0">
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={() => toggleItemSelection(item.id)}
                  disabled={item.currentKitId !== undefined}
                />
              </div>
            )}

            {/* Thumbnail */}
            <div className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-background-secondary">
              {item.primaryImage ? (
                <Image
                  src={item.primaryImage}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-background-secondary text-foreground-muted">
                  <span className="text-xs">No image</span>
                </div>
              )}
            </div>

            {/* Item Details */}
            <div className="flex-grow min-w-0 flex items-center gap-4">
              <h3 className="text-base font-medium text-foreground truncate">
                {item.name}
              </h3>
              <span className="text-sm text-foreground-muted">
                {item.category}
              </span>
              <span className="text-sm text-foreground-muted">
                {item.manufacturer} {item.model}
              </span>
              {item.serialNumber && (
                <span className="text-sm text-foreground-muted">
                  S/N: {item.serialNumber}
                </span>
              )}
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs",
                  item.isAvailable
                    ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]"
                    : "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]"
                )}
              >
                {item.isAvailable ? "Available" : "In Use"}
              </span>
              {item.currentKitId && (
                <span className="text-xs text-[hsl(var(--info))]">
                  Part of a Kit
                </span>
              )}
            </div>

            {/* Actions */}
            {!isSelectionMode && (
              <div className="flex-shrink-0 flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingItem(item)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(item.id)}
                  className="text-destructive hover:text-destructive/90"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ))
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
