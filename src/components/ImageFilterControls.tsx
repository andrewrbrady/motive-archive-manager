import React from "react";
import { Compass, Eye, Sun, Move } from "lucide-react";
import { cn } from "@/lib/utils";

interface _ImageMetadata {
  angle?: string;
  description?: string;
  movement?: string;
  tod?: string;
  view?: string;
  side?: string;
}

interface ImageFilterControlsProps {
  filters: {
    angle?: string;
    movement?: string;
    tod?: string;
    view?: string;
    side?: string;
  };
  onFilterChange: (
    key: keyof _ImageMetadata,
    value: string | undefined
  ) => void;
  availableFilters: {
    angles: string[];
    movements: string[];
    tods: string[];
    views: string[];
    sides: string[];
  };
}

// Function to filter out invalid options
const filterValidOptions = (options: string[]): string[] => {
  const invalidValues = new Set(
    [
      "n/a",
      "na",
      "undefined",
      "unknown",
      "not specified",
      "none",
      "",
      "null",
      "not applicable",
    ].map((v) => v.toLowerCase())
  );

  return options
    .filter((option) => {
      if (!option) return false;
      const lowerOption = option.toLowerCase().trim();
      return !invalidValues.has(lowerOption);
    })
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
};

export function ImageFilterControls({
  filters,
  onFilterChange,
  availableFilters,
}: ImageFilterControlsProps) {
  // Clean up the filter options
  const cleanedFilters = React.useMemo(
    () => ({
      angles: filterValidOptions(availableFilters.angles),
      movements: filterValidOptions(availableFilters.movements),
      tods: filterValidOptions(availableFilters.tods),
      views: filterValidOptions(availableFilters.views),
      sides: filterValidOptions(availableFilters.sides),
    }),
    [availableFilters]
  );

  const handleFilterChange = (
    key: keyof _ImageMetadata,
    value: string | undefined
  ) => {
    onFilterChange(key, value);
  };

  return (
    <div className="bg-white dark:bg-[var(--background-primary)] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-3">
      <div className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-800">
        {/* Angle Filter */}
        <div className="px-4 first:pl-0 last:pr-0">
          <div className="flex items-center gap-1.5 mb-2">
            <Compass className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-medium">
              Angle
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {cleanedFilters.angles.map((angle) => (
              <button
                key={angle}
                onClick={() => handleFilterChange("angle", angle)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                  filters.angle === angle
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
                )}
              >
                {angle}
              </button>
            ))}
            {filters.angle && (
              <button
                onClick={() => handleFilterChange("angle", undefined)}
                className="px-2 py-1 rounded-md text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* View Filter */}
        <div className="px-4 first:pl-0 last:pr-0">
          <div className="flex items-center gap-1.5 mb-2">
            <Eye className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-medium">
              View
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {cleanedFilters.views.map((view) => (
              <button
                key={view}
                onClick={() => handleFilterChange("view", view)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                  filters.view === view
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
                )}
              >
                {view}
              </button>
            ))}
            {filters.view && (
              <button
                onClick={() => handleFilterChange("view", undefined)}
                className="px-2 py-1 rounded-md text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Time of Day Filter */}
        <div className="px-4 first:pl-0 last:pr-0">
          <div className="flex items-center gap-1.5 mb-2">
            <Sun className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-medium">
              Time of Day
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {cleanedFilters.tods.map((tod) => (
              <button
                key={tod}
                onClick={() => handleFilterChange("tod", tod)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                  filters.tod === tod
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
                )}
              >
                {tod}
              </button>
            ))}
            {filters.tod && (
              <button
                onClick={() => handleFilterChange("tod", undefined)}
                className="px-2 py-1 rounded-md text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Movement Filter */}
        <div className="px-4 first:pl-0 last:pr-0">
          <div className="flex items-center gap-1.5 mb-2">
            <Move className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-medium">
              Movement
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {cleanedFilters.movements.map((movement) => (
              <button
                key={movement}
                onClick={() => handleFilterChange("movement", movement)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                  filters.movement === movement
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
                )}
              >
                {movement}
              </button>
            ))}
            {filters.movement && (
              <button
                onClick={() => handleFilterChange("movement", undefined)}
                className="px-2 py-1 rounded-md text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
