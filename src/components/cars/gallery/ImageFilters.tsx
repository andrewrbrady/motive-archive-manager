import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { FilterState, FilterOptions } from "@/types/gallery";

interface ImageFiltersProps {
  filters: FilterState;
  searchQuery: string;
  filterOptions: FilterOptions;
  onFiltersChange: (filters: FilterState) => void;
  onSearchChange: (query: string) => void;
  onUploadClick: () => void;
}

export function ImageFilters({
  filters,
  searchQuery,
  filterOptions,
  onFiltersChange,
  onSearchChange,
  onUploadClick,
}: ImageFiltersProps) {
  // Only log when filters actually change
  const handleFilterChange = useCallback(
    (type: string, value: string) => {
      const newFilters = { ...filters };
      if ((newFilters as any)[type] === value) {
        delete (newFilters as any)[type];
      } else {
        (newFilters as any)[type] = value;
      }
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  const handleImageTypeChange = (value: string) => {
    handleFilterChange("imageType", value);
  };

  const clearFilters = () => {
    onFiltersChange({
      sortBy: "filename",
      sortDirection: "asc",
    }); // Keep default sorting but clear all other filters
    onSearchChange(""); // Also clear search query
  };

  // Check for active filters (excluding default sort settings)
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === "sortBy" && (value === "filename" || !value)) return false;
    if (key === "sortDirection" && (value === "asc" || !value)) return false;
    return Boolean(value);
  });

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 max-w-sm">
        <Input
          type="search"
          placeholder="Search images..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Image Type filter */}
        <Select
          value={filters.imageType || "all"}
          onValueChange={handleImageTypeChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Image Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All images</SelectItem>
            <SelectItem value="with-id">With Image ID</SelectItem>
            <SelectItem value="processed">Processed Only</SelectItem>
          </SelectContent>
        </Select>

        {/* Angle filter */}
        <Select
          value={filters.angle || "all"}
          onValueChange={(value) => handleFilterChange("angle", value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Angle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All angles</SelectItem>
            {filterOptions.angles.map((angle) => (
              <SelectItem key={angle} value={angle}>
                {angle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View filter */}
        <Select
          value={filters.view || "all"}
          onValueChange={(value) => handleFilterChange("view", value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All views</SelectItem>
            {filterOptions.views.map((view) => (
              <SelectItem key={view} value={view}>
                {view}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Movement filter */}
        <Select
          value={filters.movement || "all"}
          onValueChange={(value) => handleFilterChange("movement", value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Movement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All movements</SelectItem>
            {filterOptions.movements.map((movement) => (
              <SelectItem key={movement} value={movement}>
                {movement}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Time of Day filter */}
        <Select
          value={filters.tod || "all"}
          onValueChange={(value) => handleFilterChange("tod", value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Time of Day" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All times</SelectItem>
            {filterOptions.tods.map((tod) => (
              <SelectItem key={tod} value={tod}>
                {tod}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Side filter */}
        <Select
          value={filters.side || "all"}
          onValueChange={(value) => handleFilterChange("side", value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Side" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sides</SelectItem>
            {filterOptions.sides.map((side) => (
              <SelectItem key={side} value={side}>
                {side}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sorting controls */}
        <div className="flex items-center gap-1">
          <Select
            value={filters.sortBy || "filename"}
            onValueChange={(value) => handleFilterChange("sortBy", value)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="filename">Filename</SelectItem>
              <SelectItem value="createdAt">Date Added</SelectItem>
              <SelectItem value="updatedAt">Last Updated</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleFilterChange(
                "sortDirection",
                filters.sortDirection === "asc" ? "desc" : "asc"
              )
            }
            title={`Sort ${filters.sortDirection === "asc" ? "descending" : "ascending"}`}
            className="px-2"
          >
            {filters.sortDirection === "asc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear filters
          </Button>
        )}

        {/* Upload button */}
        <Button onClick={onUploadClick}>
          <Plus className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </div>
    </div>
  );
}
