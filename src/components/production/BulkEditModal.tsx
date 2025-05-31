"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StudioInventoryItem, InventoryCategory } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Tag, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomTabs, TabItem } from "@/components/ui/custom-tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationResponse } from "@/models/location";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

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
  const api = useAPI();
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(
    {
      category: false,
      condition: false,
      location: false,
      manufacturer: false,
      isAvailable: false,
      status: false,
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
    const fetchLocations = async () => {
      if (!api) return;

      try {
        const data = await api.get<any[]>("/locations");
        setLocations(data.map((location: any) => location.name));
      } catch (error) {
        console.error("Error fetching locations:", error);
        toast.error("Failed to fetch locations");
      }
    };

    const fetchTags = async () => {
      if (!api) return;

      try {
        const data = await api.get<string[]>("/studio_inventory/tags");
        setAllTags(data);
      } catch (error) {
        console.error("Error fetching tags:", error);
        toast.error("Failed to fetch tags");
      }
    };

    if (isOpen) {
      fetchLocations();
      fetchTags();
    }
  }, [isOpen, api]);

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Edit ({selectedItems.length} items)</DialogTitle>
          <DialogDescription>
            Update multiple inventory items at once. Only the fields you select
            will be changed.
          </DialogDescription>
        </DialogHeader>

        <CustomTabs
          items={[
            {
              value: "fields",
              label: "Fields",
              content: (
                <div className="p-6 pt-4">
                  <div className="space-y-6">
                    {/* Status */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Checkbox
                          id="isAvailable"
                          checked={selectedFields.isAvailable}
                          onCheckedChange={(checked) =>
                            handleFieldToggle("isAvailable")
                          }
                        />
                        <label
                          htmlFor="isAvailable"
                          className="ml-2 text-sm font-medium"
                        >
                          Availability Status
                        </label>
                      </div>
                      {selectedFields.isAvailable && (
                        <Select
                          value={
                            updates.isAvailable !== undefined
                              ? updates.isAvailable.toString()
                              : ""
                          }
                          onValueChange={(value) =>
                            handleUpdateChange("isAvailable", value === "true")
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select availability" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Available</SelectItem>
                            <SelectItem value="false">Unavailable</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Checkbox
                          id="category"
                          checked={selectedFields.category}
                          onCheckedChange={(checked) =>
                            handleFieldToggle("category")
                          }
                        />
                        <label
                          htmlFor="category"
                          className="ml-2 text-sm font-medium"
                        >
                          Category
                        </label>
                      </div>
                      {selectedFields.category && (
                        <Select
                          value={updates.category as string}
                          onValueChange={(value) =>
                            handleUpdateChange("category", value)
                          }
                        >
                          <SelectTrigger>
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
                      )}
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Checkbox
                          id="location"
                          checked={selectedFields.location}
                          onCheckedChange={(checked) =>
                            handleFieldToggle("location")
                          }
                        />
                        <label
                          htmlFor="location"
                          className="ml-2 text-sm font-medium"
                        >
                          Location
                        </label>
                      </div>
                      {selectedFields.location && (
                        <Select
                          value={updates.location as string}
                          onValueChange={(value) =>
                            handleUpdateChange("location", value)
                          }
                        >
                          <SelectTrigger>
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
                      )}
                    </div>

                    {/* Condition */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Checkbox
                          id="condition"
                          checked={selectedFields.condition}
                          onCheckedChange={(checked) =>
                            handleFieldToggle("condition")
                          }
                        />
                        <label
                          htmlFor="condition"
                          className="ml-2 text-sm font-medium"
                        >
                          Condition
                        </label>
                      </div>
                      {selectedFields.condition && (
                        <Select
                          value={updates.condition as string}
                          onValueChange={(value) =>
                            handleUpdateChange("condition", value)
                          }
                        >
                          <SelectTrigger>
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
                      )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Checkbox
                          id="notes"
                          checked={selectedFields.notes}
                          onCheckedChange={(checked) =>
                            handleFieldToggle("notes")
                          }
                        />
                        <label
                          htmlFor="notes"
                          className="ml-2 text-sm font-medium"
                        >
                          Notes
                        </label>
                      </div>
                      {selectedFields.notes && (
                        <Textarea
                          placeholder="Enter notes"
                          value={updates.notes || ""}
                          onChange={(e) =>
                            handleUpdateChange("notes", e.target.value)
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              value: "tags",
              label: "Tags",
              content: (
                <div className="p-6 pt-4">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Add Tags</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {allTags.slice(0, 10).map((tag) => (
                            <Badge
                              key={tag}
                              variant={
                                updates.tagsToAdd?.includes(tag)
                                  ? "default"
                                  : "outline"
                              }
                              className="cursor-pointer"
                              onClick={() => {
                                setNewTag(tag);
                              }}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="New tag"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddTag}
                            disabled={!newTag.trim()}
                          >
                            Add
                          </Button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium mb-2">
                          Remove Tags
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {getSelectedItemsTags().map((tag) => (
                            <Badge
                              key={`remove-${tag}`}
                              variant={
                                updates.tagsToRemove?.includes(tag)
                                  ? "destructive"
                                  : "outline"
                              }
                              className="cursor-pointer"
                              onClick={() => handleToggleTagRemoval(tag)}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
          ]}
          defaultValue="fields"
          basePath=""
          className="w-full"
        />

        <DialogFooter>
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
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
