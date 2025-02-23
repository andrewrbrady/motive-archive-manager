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
    <div className="bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg shadow-sm p-3">
      <div className="grid grid-cols-4 divide-x divide-zinc-200 dark:divide-zinc-800">
        {/* Angle Filter */}
        <div className="px-4 first:pl-0 last:pr-0">
          <div className="flex items-center gap-1.5 mb-2">
            <Compass className="w-3.5 h-3.5 text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]" />
            <span className="text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] uppercase text-xs font-medium">
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
                    ? "bg-[hsl(var(--background))] dark:bg-[var(--background-primary)] text-white dark:text-[hsl(var(--foreground))]"
                    : "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] bg-opacity-50 text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))]"
                )}
              >
                {angle}
              </button>
            ))}
            {filters.angle && (
              <button
                onClick={() => handleFilterChange("angle", undefined)}
                className="px-2 py-1 rounded-md text-xs font-medium bg-destructive-100 dark:bg-destructive-900 bg-opacity-30 text-destructive-600 dark:text-destructive-400 hover:bg-destructive-200 dark:hover:bg-destructive-900/50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* View Filter */}
        <div className="px-4 first:pl-0 last:pr-0">
          <div className="flex items-center gap-1.5 mb-2">
            <Eye className="w-3.5 h-3.5 text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]" />
            <span className="text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] uppercase text-xs font-medium">
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
                    ? "bg-[hsl(var(--background))] dark:bg-[var(--background-primary)] text-white dark:text-[hsl(var(--foreground))]"
                    : "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] bg-opacity-50 text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))]"
                )}
              >
                {view}
              </button>
            ))}
            {filters.view && (
              <button
                onClick={() => handleFilterChange("view", undefined)}
                className="px-2 py-1 rounded-md text-xs font-medium bg-destructive-100 dark:bg-destructive-900 bg-opacity-30 text-destructive-600 dark:text-destructive-400 hover:bg-destructive-200 dark:hover:bg-destructive-900/50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Time of Day Filter */}
        <div className="px-4 first:pl-0 last:pr-0">
          <div className="flex items-center gap-1.5 mb-2">
            <Sun className="w-3.5 h-3.5 text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]" />
            <span className="text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] uppercase text-xs font-medium">
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
                    ? "bg-[hsl(var(--background))] dark:bg-[var(--background-primary)] text-white dark:text-[hsl(var(--foreground))]"
                    : "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] bg-opacity-50 text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))]"
                )}
              >
                {tod}
              </button>
            ))}
            {filters.tod && (
              <button
                onClick={() => handleFilterChange("tod", undefined)}
                className="px-2 py-1 rounded-md text-xs font-medium bg-destructive-100 dark:bg-destructive-900 bg-opacity-30 text-destructive-600 dark:text-destructive-400 hover:bg-destructive-200 dark:hover:bg-destructive-900/50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Movement Filter */}
        <div className="px-4 first:pl-0 last:pr-0">
          <div className="flex items-center gap-1.5 mb-2">
            <Move className="w-3.5 h-3.5 text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]" />
            <span className="text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] uppercase text-xs font-medium">
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
                    ? "bg-[hsl(var(--background))] dark:bg-[var(--background-primary)] text-white dark:text-[hsl(var(--foreground))]"
                    : "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] bg-opacity-50 text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))]"
                )}
              >
                {movement}
              </button>
            ))}
            {filters.movement && (
              <button
                onClick={() => handleFilterChange("movement", undefined)}
                className="px-2 py-1 rounded-md text-xs font-medium bg-destructive-100 dark:bg-destructive-900 bg-opacity-30 text-destructive-600 dark:text-destructive-400 hover:bg-destructive-200 dark:hover:bg-destructive-900/50 transition-colors"
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
