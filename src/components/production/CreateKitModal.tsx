"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Package, X, Check } from "lucide-react";
import { Kit, StudioInventoryItem } from "@/types/inventory";
import Image from "next/image";

// Completely separate component for item rendering
function InventoryItemCard({
  item,
  isSelected,
  onToggle,
}: {
  item: StudioInventoryItem;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`relative border rounded-md p-3 cursor-pointer transition-colors ${
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/50"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        {item.primaryImage ? (
          <div className="h-12 w-12 rounded-md overflow-hidden bg-muted">
            <img
              src={item.primaryImage}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="h-12 w-12 flex items-center justify-center rounded-md bg-muted">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{item.name}</p>
          <p className="text-sm text-muted-foreground truncate">
            {item.category} • {item.manufacturer} {item.model}
          </p>
        </div>
        {isSelected && (
          <div className="absolute top-2 right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

interface CreateKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (kit: Partial<Kit>) => void;
  kit?: Kit;
  isEditing?: boolean;
}

export default function CreateKitModal({
  isOpen,
  onClose,
  onSave,
  kit,
  isEditing = false,
}: CreateKitModalProps) {
  const [name, setName] = useState(kit?.name || "");
  const [description, setDescription] = useState(kit?.description || "");
  const [status, setStatus] = useState<
    "available" | "checked-out" | "in-use" | "maintenance"
  >((kit?.status as any) || "available");
  const [searchQuery, setSearchQuery] = useState("");
  const [inventoryItems, setInventoryItems] = useState<StudioInventoryItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  // Use a simple array state for selected items
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Initialize selected items from kit if editing
  useEffect(() => {
    if (isEditing && kit?.items) {
      setSelectedItems(kit.items);
    } else {
      setSelectedItems([]);
    }
  }, [isEditing, kit, isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName(kit?.name || "");
      setDescription(kit?.description || "");
      setStatus((kit?.status as any) || "available");
      setSearchQuery("");
      if (!isEditing) {
        setSelectedItems([]);
      }
    }
  }, [isOpen, kit, isEditing]);

  // Fetch inventory items
  useEffect(() => {
    const fetchInventoryItems = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/studio_inventory");
        if (!response.ok) throw new Error("Failed to fetch inventory items");
        const data = await response.json();

        // Filter out items that are already in other kits
        const availableItems = data.filter(
          (item: StudioInventoryItem) =>
            !item.currentKitId ||
            (isEditing && kit && item.currentKitId === kit.id)
        );

        setInventoryItems(availableItems);
      } catch (error) {
        console.error("Error fetching inventory items:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchInventoryItems();
    }
  }, [isOpen, isEditing, kit]);

  // Filter items based on search query
  const filteredItems = inventoryItems.filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.manufacturer.toLowerCase().includes(searchLower) ||
      item.model.toLowerCase().includes(searchLower) ||
      item.category.toLowerCase().includes(searchLower)
    );
  });

  // Toggle item selection
  const toggleItemSelection = (itemId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setSelectedItems((prev) => {
      // Create a completely new array to avoid reference issues
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  // Remove item from selection
  const removeItem = (itemId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setSelectedItems((prev) => prev.filter((id) => id !== itemId));
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!name.trim() || selectedItems.length === 0) {
      alert("Please provide a name and select at least one item");
      return;
    }

    const kitData: Partial<Kit> = {
      name,
      description,
      status,
      items: selectedItems,
    };

    if (isEditing && kit) {
      kitData.id = kit.id;
    }

    onSave(kitData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Kit" : "Create New Kit"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4 flex-1 overflow-hidden">
          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(
                value: "available" | "checked-out" | "in-use" | "maintenance"
              ) => setStatus(value)}
            >
              <SelectTrigger id="status" className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="in-use">In Use</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <Label>Available Items</Label>
              <span className="text-sm text-muted-foreground">
                {selectedItems.length} selected
              </span>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ScrollArea className="flex-1 border rounded-md p-2">
                <div className="grid grid-cols-1 gap-2">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => {
                      const isSelected = selectedItems.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`relative border rounded-md p-3 cursor-pointer transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={(e) => toggleItemSelection(item.id, e)}
                        >
                          <div className="flex items-center gap-3">
                            {item.primaryImage ? (
                              <div className="h-12 w-12 rounded-md overflow-hidden bg-muted">
                                <img
                                  src={item.primaryImage}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-12 w-12 flex items-center justify-center rounded-md bg-muted">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {item.name}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {item.category} • {item.manufacturer}{" "}
                                {item.model}
                              </p>
                            </div>
                            {isSelected && (
                              <div className="absolute top-2 right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      No items found
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {selectedItems.length > 0 && (
              <div className="mt-4">
                <Label className="mb-2 block">Selected Items</Label>
                <ScrollArea className="h-[100px] border rounded-md p-2">
                  <div className="space-y-1">
                    {selectedItems.map((id) => {
                      const item = inventoryItems.find((i) => i.id === id);
                      if (!item) return null;

                      return (
                        <div
                          key={`selected-${id}`}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                        >
                          <span className="truncate">{item.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => removeItem(id, e)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name || selectedItems.length === 0}
          >
            {isEditing ? "Update Kit" : "Create Kit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
