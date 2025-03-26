"use client";

import React, { memo } from "react";
import { CarIcon, Loader2, AlertTriangle, Bug } from "lucide-react";
import { useLabels } from "@/contexts/LabelsContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CarLabelProps {
  carId: string;
  className?: string;
  debug?: boolean;
}

const CarLabel = memo(
  ({ carId, className = "", debug = false }: CarLabelProps) => {
    // Get label and car details from context
    const { getCarLabel, getCarDetails, fetchingCarIds, carLabels } =
      useLabels();

    // Handle null/empty carId gracefully
    if (!carId) {
      return (
        <span
          className={
            className ||
            "inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] rounded-md text-xs border border-[hsl(var(--border))] shadow-sm"
          }
        >
          <AlertTriangle className="w-3 h-3" />
          Missing Car ID
        </span>
      );
    }

    const idStr = carId.toString();

    // Check if this car ID is currently being fetched
    const isLoading = fetchingCarIds.has(idStr);

    // Get the label for this car (will queue fetch if needed)
    const label = carLabels[idStr] || getCarLabel(idStr);

    // Get detailed car information
    const details = getCarDetails(idStr);

    // Check if this is a fallback label rather than real data
    const isFallbackLabel = label.startsWith("Car") && label.length <= 15;

    // Default styling with override capability and visual indicator for fallback data
    const defaultClassName = isFallbackLabel
      ? "inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-md text-xs border border-[hsl(var(--destructive))] shadow-sm" // Red border for fallback
      : "inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-md text-xs border border-[hsl(var(--border))] shadow-sm";

    const combinedClassName = className
      ? `${defaultClassName} ${className}`
      : defaultClassName;

    // For debug mode - show a special indicator in the tooltip
    const hasSessionStorage = typeof sessionStorage !== "undefined";
    const retryCount = hasSessionStorage
      ? parseInt(sessionStorage.getItem(`car-retry-${idStr}`) || "0")
      : 0;

    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <span className={combinedClassName}>
              {isLoading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="opacity-70">Loading...</span>
                </>
              ) : debug && isFallbackLabel ? (
                <>
                  <Bug className="w-3 h-3 text-destructive" />
                  <span>{label}</span>
                </>
              ) : (
                <>
                  <CarIcon className="w-3 h-3" />
                  {label}
                </>
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="p-3 max-w-xs text-xs">
            {isLoading ? (
              "Loading car details..."
            ) : isFallbackLabel || !details ? (
              <div className="space-y-1">
                <p className="font-semibold">Car details not available</p>
                <p className="text-muted-foreground">ID: {idStr}</p>
                {debug && (
                  <div className="mt-2 p-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">
                    <p>Retry count: {retryCount}</p>
                    <p>Fallback: {isFallbackLabel ? "yes" : "no"}</p>
                    <p>Loading: {isLoading ? "yes" : "no"}</p>
                    <p>Has details: {details ? "yes" : "no"}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-semibold text-sm">{label}</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {details.year && (
                    <div>
                      <span className="text-muted-foreground">Year:</span>{" "}
                      {details.year}
                    </div>
                  )}
                  {details.make && (
                    <div>
                      <span className="text-muted-foreground">Make:</span>{" "}
                      {details.make}
                    </div>
                  )}
                  {details.model && (
                    <div>
                      <span className="text-muted-foreground">Model:</span>{" "}
                      {details.model}
                    </div>
                  )}
                  {(details.color || details.exteriorColor) && (
                    <div>
                      <span className="text-muted-foreground">Color:</span>{" "}
                      {details.color || details.exteriorColor}
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground text-[10px] pt-1 border-t border-border">
                  ID: {idStr}
                </p>
                {debug && (
                  <div className="mt-2 p-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">
                    <p>Retry count: {retryCount}</p>
                  </div>
                )}
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

// Add display name for debugging
CarLabel.displayName = "CarLabel";

export default CarLabel;
