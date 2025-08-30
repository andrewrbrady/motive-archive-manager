"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Type definitions for different make data formats
export interface MakeObject {
  _id?: string;
  name: string;
}

export type MakeData = string | MakeObject;

export interface MakesDropdownProps {
  // Required props
  value: string;
  onValueChange: (value: string) => void;

  // Makes data - can be either string array or object array
  makes: MakeData[];

  // Optional props
  loading?: boolean;
  placeholder?: string;
  allOptionLabel?: string;
  allOptionValue?: string;
  showAllOption?: boolean;
  loadingText?: string;
  className?: string;
  disabled?: boolean;

  // Advanced styling
  contentClassName?: string;
  triggerClassName?: string;
}

/**
 * Reusable MakesDropdown component with scrolling and height constraints
 *
 * ## Features:
 * - ✅ Supports both string[] and Make[] data formats
 * - ✅ Height constraints with scrolling (max-h-60 = 240px)
 * - ✅ Loading state handling with spinner
 * - ✅ Customizable "All Makes" option
 * - ✅ Alphabetical sorting for better UX
 * - ✅ Follows existing Select component patterns
 * - ✅ Empty state handling
 * - ✅ TypeScript support with proper interfaces
 *
 * ## Usage Examples:
 *
 * ### Basic usage with string array:
 * ```tsx
 * <MakesDropdown
 *   value={selectedMake}
 *   onValueChange={setSelectedMake}
 *   makes={['BMW', 'Audi', 'Mercedes']}
 * />
 * ```
 *
 * ### With Make objects and loading state:
 * ```tsx
 * <MakesDropdown
 *   value={selectedMake}
 *   onValueChange={setSelectedMake}
 *   makes={makeObjects}
 *   loading={backgroundLoading}
 *   allOptionLabel="All Brands"
 *   allOptionValue="all"
 *   loadingText="Loading makes..."
 * />
 * ```
 *
 * ### Custom styling:
 * ```tsx
 * <MakesDropdown
 *   value={selectedMake}
 *   onValueChange={setSelectedMake}
 *   makes={makes}
 *   className="w-48"
 *   contentClassName="max-h-40"
 *   triggerClassName="border-blue-500"
 * />
 * ```
 *
 * ## Integration Notes:
 * - Compatible with `/api/cars/makes` endpoint (returns string[])
 * - Compatible with `/api/makes` endpoint (returns Make[] objects)
 * - Maintains existing filtering logic in CarsPageOptimized
 * - Can replace other makes dropdowns across the application
 *
 * @component
 * @example
 * // In a car filtering component
 * <MakesDropdown
 *   value={selectedMake || "all"}
 *   onValueChange={handleMakeChange}
 *   makes={makes}
 *   loading={backgroundLoading}
 *   placeholder="All Makes"
 * />
 */
export function MakesDropdown({
  value,
  onValueChange,
  makes,
  loading = false,
  placeholder = "All Makes",
  allOptionLabel = "All Makes",
  allOptionValue = "all",
  showAllOption = true,
  loadingText = "Loading makes...",
  className,
  disabled = false,
  contentClassName,
  triggerClassName,
}: MakesDropdownProps) {
  // Avoid SSR hydration mismatches with Radix Select by rendering after mount
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Normalize makes data to consistent format
  const normalizedMakes = React.useMemo(() => {
    return makes.map((make, index) => {
      if (typeof make === "string") {
        return {
          key: `make-${index}-${make}`,
          value: make,
          label: make,
        };
      } else {
        return {
          key: make._id?.toString() || `make-${index}-${make.name}`,
          value: make.name,
          label: make.name,
        };
      }
    });
  }, [makes]);

  // Sort makes alphabetically for better UX
  const sortedMakes = React.useMemo(() => {
    return [...normalizedMakes].sort((a, b) => a.label.localeCompare(b.label));
  }, [normalizedMakes]);

  if (!mounted) {
    // Render a minimal placeholder to keep layout stable
    return (
      <div className={cn("h-9 w-full rounded-md border border-input px-3 py-2 text-sm", triggerClassName, className)} />
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn(triggerClassName, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent
        className={cn(
          // Height constraint with scrolling
          "max-h-60 overflow-y-auto",
          contentClassName
        )}
      >
        {/* All option */}
        {showAllOption && (
          <SelectItem value={allOptionValue}>{allOptionLabel}</SelectItem>
        )}

        {/* Loading state */}
        {loading && (
          <SelectItem value="loading" disabled>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              <span>{loadingText}</span>
            </div>
          </SelectItem>
        )}

        {/* Makes options */}
        {!loading &&
          sortedMakes.map((make) => (
            <SelectItem
              key={make.key}
              value={make.value}
              className="cursor-pointer"
            >
              {make.label}
            </SelectItem>
          ))}

        {/* Empty state */}
        {!loading && makes.length === 0 && (
          <SelectItem value="empty" disabled>
            <span className="text-muted-foreground">No makes available</span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}

export default MakesDropdown;
