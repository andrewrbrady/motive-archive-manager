"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Filter, Save, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InventoryCategory } from "@/types/inventory";
import { LocationResponse } from "@/models/location";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

export interface FilterCriteria {
  id: string;
  name?: string;
  categories?: InventoryCategory[];
  manufacturers?: string[];
  locations?: string[];
  conditions?: string[];
  minPurchasePrice?: number;
  maxPurchasePrice?: number;
  minCurrentValue?: number;
  maxCurrentValue?: number;
  purchaseDateStart?: Date;
  purchaseDateEnd?: Date;
  tags?: string[];
  isAvailable?: boolean;
  searchText?: string;
}

interface AdvancedFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (filter: FilterCriteria) => void;
  onSaveFilter?: (filter: FilterCriteria) => void;
  savedFilters: FilterCriteria[];
  onDeleteSavedFilter?: (filterId: string) => void;
  onLoadSavedFilter?: (filter: FilterCriteria) => void;
  initialFilter?: FilterCriteria;
}

export default function AdvancedFilterModal({
  isOpen,
  onClose,
  onApplyFilter,
  onSaveFilter,
  savedFilters,
  onDeleteSavedFilter,
  onLoadSavedFilter,
  initialFilter,
}: AdvancedFilterModalProps) {
  const [filter, setFilter] = useState<FilterCriteria>(
    initialFilter || {
      id: "",
      categories: [],
      manufacturers: [],
      locations: [],
      conditions: [],
      tags: [],
    }
  );
  const [filterName, setFilterName] = useState("");
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const api = useAPI();

  useEffect(() => {
    if (isOpen) {
      fetchLocations();
      fetchManufacturers();
      fetchTags();
    }
  }, [isOpen, api]);

  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
      setFilterName(initialFilter.name || "");
    }
  }, [initialFilter]);

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

  const fetchManufacturers = async () => {
    if (!api) return;

    try {
      const data = await api.get<string[]>("/studio_inventory/manufacturers");
      setManufacturers(data);
    } catch (error) {
      console.error("Error fetching manufacturers:", error);
      toast.error("Failed to fetch manufacturers");
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

  const handleApplyFilter = () => {
    onApplyFilter(filter);
    onClose();
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      setIsSaving(true);
      return;
    }

    if (onSaveFilter) {
      onSaveFilter({
        ...filter,
        id: filter.id || `filter-${Date.now()}`,
        name: filterName,
      });
    }
    setIsSaving(false);
  };

  const handleLoadFilter = (savedFilter: FilterCriteria) => {
    setFilter(savedFilter);
    setFilterName(savedFilter.name || "");
    if (onLoadSavedFilter) {
      onLoadSavedFilter(savedFilter);
    }
  };

  const handleDeleteFilter = (filterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteSavedFilter) {
      onDeleteSavedFilter(filterId);
    }
  };

  const handleCategoryToggle = (category: InventoryCategory) => {
    setFilter((prev) => {
      const categories = prev.categories || [];
      if (categories.includes(category)) {
        return {
          ...prev,
          categories: categories.filter((c) => c !== category),
        };
      } else {
        return {
          ...prev,
          categories: [...categories, category],
        };
      }
    });
  };

  const handleConditionToggle = (condition: string) => {
    setFilter((prev) => {
      const conditions = prev.conditions || [];
      if (conditions.includes(condition)) {
        return {
          ...prev,
          conditions: conditions.filter((c) => c !== condition),
        };
      } else {
        return {
          ...prev,
          conditions: [...conditions, condition],
        };
      }
    });
  };

  const handleTagToggle = (tag: string) => {
    setFilter((prev) => {
      const tags = prev.tags || [];
      if (tags.includes(tag)) {
        return {
          ...prev,
          tags: tags.filter((t) => t !== tag),
        };
      } else {
        return {
          ...prev,
          tags: [...tags, tag],
        };
      }
    });
  };

  const handleLocationToggle = (locationId: string) => {
    setFilter((prev) => {
      const locations = prev.locations || [];
      if (locations.includes(locationId)) {
        return {
          ...prev,
          locations: locations.filter((l) => l !== locationId),
        };
      } else {
        return {
          ...prev,
          locations: [...locations, locationId],
        };
      }
    });
  };

  const handleManufacturerToggle = (manufacturer: string) => {
    setFilter((prev) => {
      const manufacturers = prev.manufacturers || [];
      if (manufacturers.includes(manufacturer)) {
        return {
          ...prev,
          manufacturers: manufacturers.filter((m) => m !== manufacturer),
        };
      } else {
        return {
          ...prev,
          manufacturers: [...manufacturers, manufacturer],
        };
      }
    });
  };

  const handleResetFilter = () => {
    setFilter({
      id: "",
      categories: [],
      manufacturers: [],
      locations: [],
      conditions: [],
      tags: [],
    });
    setFilterName("");
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-3xl w-full bg-background border border-border rounded-lg shadow-lg">
          <Dialog.Title className="text-xl font-semibold px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Advanced Filter
            </div>
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </Dialog.Title>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Filter Options */}
            <div className="md:col-span-2 space-y-6">
              {/* Categories */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Camera",
                    "Lens",
                    "Lighting",
                    "Audio",
                    "Grip",
                    "Power",
                    "Storage",
                    "Accessories",
                    "Other",
                  ].map((category) => (
                    <Badge
                      key={category}
                      variant={
                        filter.categories?.includes(
                          category as InventoryCategory
                        )
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        handleCategoryToggle(category as InventoryCategory)
                      }
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Conditions */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Condition</h3>
                <div className="flex flex-wrap gap-2">
                  {["excellent", "good", "fair", "poor", "needs-repair"].map(
                    (condition) => (
                      <Badge
                        key={condition}
                        variant={
                          filter.conditions?.includes(condition)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => handleConditionToggle(condition)}
                      >
                        {condition.charAt(0).toUpperCase() + condition.slice(1)}
                      </Badge>
                    )
                  )}
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Locations</h3>
                <div className="flex flex-wrap gap-2">
                  {locations.map((location) => (
                    <Badge
                      key={location.id}
                      variant={
                        filter.locations?.includes(location.id)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => handleLocationToggle(location.id)}
                    >
                      {location.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Manufacturers */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Manufacturers</h3>
                <ScrollArea className="h-24 border rounded-md p-2">
                  <div className="flex flex-wrap gap-2">
                    {manufacturers.map((manufacturer) => (
                      <Badge
                        key={manufacturer}
                        variant={
                          filter.manufacturers?.includes(manufacturer)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => handleManufacturerToggle(manufacturer)}
                      >
                        {manufacturer}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Tags</h3>
                <ScrollArea className="h-24 border rounded-md p-2">
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={
                          filter.tags?.includes(tag) ? "default" : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Price Range */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Price Range</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-price">Min Purchase Price</Label>
                    <Input
                      id="min-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={filter.minPurchasePrice || ""}
                      onChange={(e) =>
                        setFilter({
                          ...filter,
                          minPurchasePrice: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-price">Max Purchase Price</Label>
                    <Input
                      id="max-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={filter.maxPurchasePrice || ""}
                      onChange={(e) =>
                        setFilter({
                          ...filter,
                          maxPurchasePrice: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Purchase Date Range</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">From</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={
                        filter.purchaseDateStart
                          ? new Date(filter.purchaseDateStart)
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setFilter({
                          ...filter,
                          purchaseDateStart: e.target.value
                            ? new Date(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">To</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={
                        filter.purchaseDateEnd
                          ? new Date(filter.purchaseDateEnd)
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setFilter({
                          ...filter,
                          purchaseDateEnd: e.target.value
                            ? new Date(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="availability"
                  checked={filter.isAvailable ?? false}
                  onCheckedChange={(checked) =>
                    setFilter({
                      ...filter,
                      isAvailable: checked === true ? true : undefined,
                    })
                  }
                />
                <Label htmlFor="availability">Show only available items</Label>
              </div>
            </div>

            {/* Right Column - Saved Filters */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Save Current Filter</h3>
                <div className="space-y-2">
                  <Input
                    placeholder="Filter name"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className={
                      isSaving && !filterName.trim() ? "border-destructive" : ""
                    }
                  />
                  {isSaving && !filterName.trim() && (
                    <p className="text-xs text-destructive">
                      Please enter a name for your filter
                    </p>
                  )}
                  <Button
                    type="button"
                    onClick={handleSaveFilter}
                    className="w-full"
                    variant="outline"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Filter
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Saved Filters</h3>
                {savedFilters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No saved filters yet
                  </p>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {savedFilters.map((savedFilter) => (
                        <div
                          key={savedFilter.id}
                          className="flex items-center justify-between p-2 border rounded-md hover:bg-accent cursor-pointer"
                          onClick={() => handleLoadFilter(savedFilter)}
                        >
                          <span className="font-medium">
                            {savedFilter.name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) =>
                              handleDeleteFilter(savedFilter.id, e)
                            }
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border flex justify-between">
            <Button type="button" onClick={handleResetFilter} variant="outline">
              Reset
            </Button>
            <div className="space-x-2">
              <Button type="button" onClick={onClose} variant="outline">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleApplyFilter}
                variant="default"
              >
                Apply Filter
              </Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
