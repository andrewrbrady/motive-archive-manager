import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus } from "lucide-react";
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
  const handleFilterChange = (type: string, value: string) => {
    const newFilters = { ...filters };
    if (value === "" || value === "all") {
      delete newFilters[type as keyof FilterState];
    } else {
      newFilters[type as keyof FilterState] = value;
    }
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

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
