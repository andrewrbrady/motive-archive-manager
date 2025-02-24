"use client";

import { useState, useEffect } from "react";
import { Tab } from "@headlessui/react";
import { StudioInventoryItem, Kit } from "@/types/inventory";
import AddInventoryItemModal from "./AddInventoryItemModal";
import CreateKitModal from "./CreateKitModal";
import { Button } from "@/components/ui/button";
import { Plus, Check, X } from "lucide-react";
import StudioInventoryList from "./StudioInventoryList";

export default function StudioInventoryTab() {
  const [selectedView, setSelectedView] = useState<"items" | "kits">("items");
  const [items, setItems] = useState<StudioInventoryItem[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isCreateKitModalOpen, setIsCreateKitModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Fetch inventory items on component mount
  useEffect(() => {
    fetchInventoryItems();
  }, []);

  const fetchInventoryItems = async () => {
    try {
      const response = await fetch("/api/studio_inventory");
      if (!response.ok) throw new Error("Failed to fetch inventory items");
      const data = await response.json();

      // Convert snake_case to camelCase
      const formattedItems = data.map((item: any) => ({
        id: item._id,
        name: item.name,
        category: item.category,
        manufacturer: item.manufacturer,
        model: item.model,
        serialNumber: item.serial_number,
        purchaseDate: item.purchase_date
          ? new Date(item.purchase_date)
          : undefined,
        lastMaintenanceDate: item.last_maintenance_date
          ? new Date(item.last_maintenance_date)
          : undefined,
        condition: item.condition,
        notes: item.notes,
        location: item.location,
        isAvailable: item.is_available,
        currentKitId: item.current_kit_id,
        images: item.images,
        primaryImage: item.primary_image,
      }));

      setItems(formattedItems);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async (newItem: Omit<StudioInventoryItem, "id">) => {
    try {
      const response = await fetch("/api/studio_inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newItem),
      });

      if (!response.ok) throw new Error("Failed to add inventory item");
      const data = await response.json();

      // Convert snake_case to camelCase
      const formattedItem: StudioInventoryItem = {
        id: data._id,
        name: data.name,
        category: data.category,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serial_number,
        purchaseDate: data.purchase_date
          ? new Date(data.purchase_date)
          : undefined,
        lastMaintenanceDate: data.last_maintenance_date
          ? new Date(data.last_maintenance_date)
          : undefined,
        condition: data.condition,
        notes: data.notes,
        location: data.location,
        isAvailable: data.is_available,
        currentKitId: data.current_kit_id,
        images: data.images,
        primaryImage: data.primary_image,
      };

      setItems([...items, formattedItem]);
      setIsAddItemModalOpen(false);
    } catch (error) {
      console.error("Error adding inventory item:", error);
    }
  };

  const handleCreateKit = async (newKit: Omit<Kit, "id">) => {
    const kitWithId: Kit = {
      ...newKit,
      id: `kit-${Date.now()}`, // This is a temporary solution. In a real app, this would come from the backend
    };
    setKits([...kits, kitWithId]);

    // Update the items that are now part of this kit
    const updatedItems = items.map(async (item) => {
      if (newKit.items.includes(item.id)) {
        const updatedItem = {
          ...item,
          currentKitId: kitWithId.id,
          isAvailable: false,
        };

        try {
          await fetch(`/api/studio_inventory/${item.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedItem),
          });
        } catch (error) {
          console.error(`Error updating item ${item.id}:`, error);
        }

        return updatedItem;
      }
      return item;
    });

    // Wait for all updates to complete
    const resolvedItems = await Promise.all(updatedItems);
    setItems(resolvedItems);
    setIsCreateKitModalOpen(false);
  };

  const handleItemUpdate = (updatedItem: StudioInventoryItem) => {
    setItems((prevItems) =>
      prevItems.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleItemDelete = (itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  const handleCreateKitFromSelection = () => {
    setIsCreateKitModalOpen(true);
    setIsSelectionMode(false);
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedItems([]);
  };

  const availableItems = items.filter(
    (item) => !item.currentKitId && item.isAvailable
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          {isSelectionMode ? (
            <>
              <Button
                onClick={handleCreateKitFromSelection}
                variant="default"
                size="default"
                disabled={selectedItems.length === 0}
              >
                <Check className="w-4 h-4 mr-2" />
                Create Kit ({selectedItems.length})
              </Button>
              <Button
                onClick={handleCancelSelection}
                variant="outline"
                size="default"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => setIsAddItemModalOpen(true)}
                variant="default"
                size="default"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
              <Button
                onClick={() => setIsSelectionMode(true)}
                variant="secondary"
                size="default"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Kit from Items
              </Button>
            </>
          )}
        </div>
      </div>

      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-lg bg-background-secondary/50 dark:bg-background-secondary/25 p-1 gap-1">
          <Tab
            className={({ selected }: { selected: boolean }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors
              ${
                selected
                  ? "bg-background text-foreground shadow"
                  : "text-foreground-muted hover:bg-background/[0.12] hover:text-foreground"
              }`
            }
            onClick={() => setSelectedView("items")}
          >
            Individual Items
          </Tab>
          <Tab
            className={({ selected }: { selected: boolean }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors
              ${
                selected
                  ? "bg-background text-foreground shadow"
                  : "text-foreground-muted hover:bg-background/[0.12] hover:text-foreground"
              }`
            }
            onClick={() => setSelectedView("kits")}
          >
            Kits
          </Tab>
        </Tab.List>
        <Tab.Panels className="mt-4">
          <Tab.Panel>
            <StudioInventoryList
              items={items}
              onItemUpdate={handleItemUpdate}
              onItemDelete={handleItemDelete}
              selectedItems={selectedItems}
              onSelectedItemsChange={setSelectedItems}
              isSelectionMode={isSelectionMode}
            />
          </Tab.Panel>
          <Tab.Panel>
            {/* Kits view - you can create a similar KitsList component if needed */}
            <div className="text-center py-8 text-foreground-muted">
              Kits view coming soon...
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      <AddInventoryItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        onAdd={handleAddItem}
      />

      <CreateKitModal
        isOpen={isCreateKitModalOpen}
        onClose={() => {
          setIsCreateKitModalOpen(false);
          setSelectedItems([]);
        }}
        onCreate={handleCreateKit}
        availableItems={
          isSelectionMode
            ? items.filter((item) => selectedItems.includes(item.id))
            : availableItems
        }
      />
    </div>
  );
}
