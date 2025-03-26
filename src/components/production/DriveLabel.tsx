"use client";

import React, { memo } from "react";
import { HardDriveIcon, Loader2 } from "lucide-react";
import { useLabels } from "@/contexts/LabelsContext";

interface DriveLabelProps {
  driveId: string;
  className?: string;
}

const DriveLabel = memo(({ driveId, className = "" }: DriveLabelProps) => {
  const { getDriveLabel, fetchingDriveIds, driveLabels } = useLabels();

  // Handle null/empty driveId gracefully
  if (!driveId) {
    return (
      <span
        className={
          className ||
          "inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-md text-xs border border-[hsl(var(--border))] shadow-sm"
        }
      >
        <HardDriveIcon className="w-3 h-3" />
        Unknown Drive
      </span>
    );
  }

  const idStr = driveId.toString();

  // Check if this drive is currently being fetched
  const isLoading = fetchingDriveIds.has(idStr);

  // Get the label for this drive - first check cache, then use getter
  const label = driveLabels[idStr] || getDriveLabel(idStr);

  const defaultClassName =
    "inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-md text-xs border border-[hsl(var(--border))] shadow-sm";

  const combinedClassName = className
    ? `${defaultClassName} ${className}`
    : defaultClassName;

  return (
    <span className={combinedClassName}>
      {isLoading ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="opacity-70">Loading...</span>
        </>
      ) : (
        <>
          <HardDriveIcon className="w-3 h-3" />
          {label}
        </>
      )}
    </span>
  );
});

// Add display name for debugging
DriveLabel.displayName = "DriveLabel";

export default DriveLabel;
