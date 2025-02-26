"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { StudioInventoryItem, InventoryCategory } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Tag, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationResponse } from "@/models/location";
import { Badge } from "@/components/ui/badge";

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: StudioInventoryItem[];
  onSave: (
    updates: Partial<StudioInventoryItem> & {
      tagsToAdd?: string[];
      tagsToRemove?: string[];
    },
    itemIds: string[]
  ) => Promise<void>;
}

export default function BulkEditModal({
  isOpen,
  onClose,
  selectedItems,
  onSave,
}: BulkEditModalProps) {
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(
    {
      category: false,
      condition: false,
      location: false,
      manufacturer: false,
      isAvailable: false,
    }
  );

  const [updates, setUpdates] = useState<
    Partial<StudioInventoryItem> & {
      tagsToAdd?: string[];
      tagsToRemove?: string[];
    }
  >({
    tagsToAdd: [],
    tagsToRemove: [],
  });

  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch locations and tags when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLocations();
      fetchTags();
    }
  }, [isOpen]);

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations");
      if (!response.ok) throw new Error("Failed to fetch locations");
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/studio_inventory/tags");
      if (!response.ok) throw new Error("Failed to fetch tags");
      const data = await response.json();
      setAllTags(data);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const handleFieldToggle = (field: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleUpdateChange = (field: string, value: any) => {
    setUpdates((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Get all unique tags from selected items
  const getSelectedItemsTags = (): string[] => {
    const tagsSet = new Set<string>();
    selectedItems.forEach((item) => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag) => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet);
  };

  const handleAddTag = () => {
    if (newTag && !updates.tagsToAdd?.includes(newTag)) {
      setUpdates((prev) => ({
        ...prev,
        tagsToAdd: [...(prev.tagsToAdd || []), newTag],
      }));
      setNewTag("");
    }
  };

  const handleRemoveTagFromAddList = (tag: string) => {
    setUpdates((prev) => ({
      ...prev,
      tagsToAdd: prev.tagsToAdd?.filter((t) => t !== tag),
    }));
  };

  const handleToggleTagRemoval = (tag: string) => {
    if (updates.tagsToRemove?.includes(tag)) {
      setUpdates((prev) => ({
        ...prev,
        tagsToRemove: prev.tagsToRemove?.filter((t) => t !== tag),
      }));
    } else {
      setUpdates((prev) => ({
        ...prev,
        tagsToRemove: [...(prev.tagsToRemove || []), tag],
      }));
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // Create final update object with only selected fields
      const finalUpdates: any = {};

      // Add selected fields to updates
      Object.keys(selectedFields).forEach((field) => {
        if (
          selectedFields[field] &&
          updates[field as keyof typeof updates] !== undefined
        ) {
          finalUpdates[field] = updates[field as keyof typeof updates];
        }
      });

      // Add tags operations if they exist
      if (updates.tagsToAdd && updates.tagsToAdd.length > 0) {
        finalUpdates.tagsToAdd = updates.tagsToAdd;
      }

      if (updates.tagsToRemove && updates.tagsToRemove.length > 0) {
        finalUpdates.tagsToRemove = updates.tagsToRemove;
      }

      // Call onSave with the updates and item IDs
      await onSave(
        finalUpdates,
        selectedItems.map((item) => item.id)
      );
      onClose();
    } catch (error) {
      console.error("Error saving bulk updates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-background border border-border rounded-lg shadow-lg">
          <div className="text-xl font-semibold px-6 py-4 border-b border-border flex items-center justify-between">
            Bulk Edit ({selectedItems.length} items)
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Tabs defaultValue="fields" className="w-full">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fields">Fields</TabsTrigger>
                <TabsTrigger value="tags">Tags</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="fields" className="p-6 pt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select the fields you want to update for all selected items.
                </p>

                <div className="space-y-4">
                  {/* Category */}
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="category"
                      checked={selectedFields.category}
                      onCheckedChange={() => handleFieldToggle("category")}
                    />
                    <div className="grid gap-1.5 w-full">
                      <Label
                        htmlFor="category"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Category
                      </Label>
                      <Select
                        value={updates.category as string}
                        onValueChange={(value) =>
                          handleUpdateChange("category", value)
                        }
                        disabled={!selectedFields.category}
                      >
                        <SelectTrigger className="w-full">
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
                    </div>
                  </div>

                  {/* Condition */}
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="condition"
                      checked={selectedFields.condition}
                      onCheckedChange={() => handleFieldToggle("condition")}
                    />
                    <div className="grid gap-1.5 w-full">
                      <Label
                        htmlFor="condition"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Condition
                      </Label>
                      <Select
                        value={updates.condition as string}
                        onValueChange={(value) =>
                          handleUpdateChange("condition", value)
                        }
                        disabled={!selectedFields.condition}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                          <SelectItem value="needs-repair">
                            Needs Repair
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="location"
                      checked={selectedFields.location}
                      onCheckedChange={() => handleFieldToggle("location")}
                    />
                    <div className="grid gap-1.5 w-full">
                      <Label
                        htmlFor="location"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Location
                      </Label>
                      <Select
                        value={updates.location as string}
                        onValueChange={(value) =>
                          handleUpdateChange("location", value)
                        }
                        disabled={!selectedFields.location}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Manufacturer */}
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="manufacturer"
                      checked={selectedFields.manufacturer}
                      onCheckedChange={() => handleFieldToggle("manufacturer")}
                    />
                    <div className="grid gap-1.5 w-full">
                      <Label
                        htmlFor="manufacturer"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Manufacturer
                      </Label>
                      <Input
                        id="manufacturer"
                        value={updates.manufacturer as string}
                        onChange={(e) =>
                          handleUpdateChange("manufacturer", e.target.value)
                        }
                        disabled={!selectedFields.manufacturer}
                        placeholder="Enter manufacturer"
                      />
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="isAvailable"
                      checked={selectedFields.isAvailable}
                      onCheckedChange={() => handleFieldToggle("isAvailable")}
                    />
                    <div className="grid gap-1.5 w-full">
                      <Label
                        htmlFor="isAvailable"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Availability
                      </Label>
                      <Select
                        value={
                          updates.isAvailable !== undefined
                            ? updates.isAvailable.toString()
                            : ""
                        }
                        onValueChange={(value) =>
                          handleUpdateChange("isAvailable", value === "true")
                        }
                        disabled={!selectedFields.isAvailable}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select availability" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Available</SelectItem>
                          <SelectItem value="false">Unavailable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tags" className="p-6 pt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Add Tags</h3>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter a new tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddTag}
                      disabled={!newTag}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  <div className="mt-2">
                    <Label className="text-sm text-muted-foreground">
                      Common tags:
                    </Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {allTags.slice(0, 10).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => {
                            setNewTag(tag);
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {updates.tagsToAdd && updates.tagsToAdd.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-sm">Tags to add:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {updates.tagsToAdd.map((tag) => (
                          <Badge
                            key={tag}
                            className="bg-primary text-primary-foreground"
                          >
                            {tag}
                            <X
                              className="h-3 w-3 ml-1 cursor-pointer"
                              onClick={() => handleRemoveTagFromAddList(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-2">Remove Tags</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Select tags to remove from all selected items:
                  </p>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {getSelectedItemsTags().map((tag) => (
                      <Badge
                        key={tag}
                        variant={
                          updates.tagsToRemove?.includes(tag)
                            ? "destructive"
                            : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => handleToggleTagRemoval(tag)}
                      >
                        {tag}
                        {updates.tagsToRemove?.includes(tag) && (
                          <X className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="px-6 py-4 border-t border-border flex justify-end gap-2 bg-muted/50">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isLoading ||
                (Object.values(selectedFields).every((v) => !v) &&
                  (!updates.tagsToAdd || updates.tagsToAdd.length === 0) &&
                  (!updates.tagsToRemove || updates.tagsToRemove.length === 0))
              }
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
