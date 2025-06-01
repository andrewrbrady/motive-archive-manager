import React from "react";
import { Button } from "@/components/ui/button";
import { SearchX, FilterX, Plus } from "lucide-react";

interface NoResultsFoundProps {
  hasActiveFilters: boolean;
  hasActiveSearch: boolean;
  onClearFilters: () => void;
  onClearSearch: () => void;
  onUploadClick: () => void;
  searchQuery?: string;
}

export function NoResultsFound({
  hasActiveFilters,
  hasActiveSearch,
  onClearFilters,
  onClearSearch,
  onUploadClick,
  searchQuery,
}: NoResultsFoundProps) {
  const hasAnyActiveFilterOrSearch = hasActiveFilters || hasActiveSearch;

  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <SearchX className="h-12 w-12 mb-2" />
        <p className="text-lg font-medium">No results found</p>

        {hasActiveSearch && searchQuery && (
          <p className="text-sm">No images match the search "{searchQuery}"</p>
        )}

        {hasActiveFilters && !hasActiveSearch && (
          <p className="text-sm">No images match the current filters</p>
        )}

        {hasActiveFilters && hasActiveSearch && (
          <p className="text-sm">
            No images match the current search and filters
          </p>
        )}

        <div className="flex gap-2 mt-4">
          {hasActiveSearch && (
            <Button variant="outline" onClick={onClearSearch}>
              <SearchX className="h-4 w-4 mr-2" />
              Clear Search
            </Button>
          )}

          {hasActiveFilters && (
            <Button variant="outline" onClick={onClearFilters}>
              <FilterX className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}

          {hasAnyActiveFilterOrSearch && (
            <Button
              variant="outline"
              onClick={() => {
                onClearSearch();
                onClearFilters();
              }}
            >
              Clear All
            </Button>
          )}

          <Button onClick={onUploadClick}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Images
          </Button>
        </div>
      </div>
    </div>
  );
}
