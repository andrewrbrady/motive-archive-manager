"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { DeliverablePlatform, Platform } from "@/types/deliverable";
import { usePlatforms } from "@/contexts/PlatformContext";
import { PlatformIcon } from "./PlatformIcon";

interface PlatformBadgesProps {
  /** New single platform ID */
  platform_id?: string;
  /** Legacy single platform string */
  platform?: Platform;
  /** Legacy array of platform IDs */
  platforms?: string[];
  /** Maximum number of badges to show before showing "X more" */
  maxVisible?: number;
  /** Size of the badges */
  size?: "sm" | "default";
  className?: string;
}

export function PlatformBadges({
  platform_id,
  platform,
  platforms,
  maxVisible = 3,
  size = "sm",
  className,
}: PlatformBadgesProps) {
  const {
    platforms: allPlatforms,
    isLoading,
    error,
    getPlatformByName,
    getPlatformById,
    getPlatformsByIds,
  } = usePlatforms();

  // Handle loading state (only shows briefly during initial app load)
  if (isLoading) {
    return (
      <div className={className}>
        <Badge variant="outline" className={size === "sm" ? "text-xs h-5" : ""}>
          Loading...
        </Badge>
      </div>
    );
  }

  // Get platform data from context (no API calls!)
  let platformData: DeliverablePlatform[] = [];

  // Priority 1: Use new single platform_id
  if (platform_id) {
    const foundPlatform = getPlatformById(platform_id);
    if (foundPlatform) {
      platformData = [foundPlatform];
    }
  }
  // Priority 2: Use legacy platforms array
  else if (platforms?.length) {
    platformData = getPlatformsByIds(platforms);
  }
  // Priority 3: Use legacy single platform field
  else if (platform) {
    const foundPlatform = getPlatformByName(platform);
    if (foundPlatform) {
      platformData = [foundPlatform];
    }
  }

  // Handle error state with graceful fallback to raw platform data
  if (
    error ||
    (!platformData.length && (platform_id || platform || platforms?.length))
  ) {
    // Fallback to displaying raw platform data
    const fallbackPlatforms = platform_id
      ? [platform_id]
      : platforms?.length
        ? platforms
        : platform
          ? [platform]
          : [];

    if (fallbackPlatforms.length === 0) {
      return (
        <div className={className}>
          <Badge
            variant="outline"
            className={size === "sm" ? "text-xs h-5" : ""}
          >
            No platforms
          </Badge>
        </div>
      );
    }

    const visibleFallbacks = fallbackPlatforms.slice(0, maxVisible);
    const remainingCount = fallbackPlatforms.length - maxVisible;

    return (
      <div className={`flex flex-wrap gap-1 ${className || ""}`}>
        {visibleFallbacks.map((platformName, index) => (
          <Badge
            key={`${platformName}-${index}`}
            variant="secondary"
            className={size === "sm" ? "text-xs h-5" : ""}
            title={platformName}
          >
            <div className="flex items-center gap-1">
              <PlatformIcon platformName={platformName} className="h-3 w-3" />
              {platformName}
            </div>
          </Badge>
        ))}
        {remainingCount > 0 && (
          <Badge
            variant="outline"
            className={size === "sm" ? "text-xs h-5" : ""}
            title={`${remainingCount} more platform${remainingCount === 1 ? "" : "s"}`}
          >
            +{remainingCount}
          </Badge>
        )}
      </div>
    );
  }

  // Handle legacy single platform string fallback when no API data
  if (!platformData.length && platform) {
    return (
      <div className={className}>
        <Badge
          variant="secondary"
          className={size === "sm" ? "text-xs h-5" : ""}
        >
          <div className="flex items-center gap-1">
            <PlatformIcon platformName={platform} className="h-3 w-3" />
            {platform}
          </div>
        </Badge>
      </div>
    );
  }

  // Handle no platforms
  if (!platformData.length) {
    return (
      <div className={className}>
        <Badge variant="outline" className={size === "sm" ? "text-xs h-5" : ""}>
          No platforms
        </Badge>
      </div>
    );
  }

  const visiblePlatforms = platformData.slice(0, maxVisible);
  const remainingCount = platformData.length - maxVisible;

  return (
    <div className={`flex flex-wrap gap-1 ${className || ""}`}>
      {visiblePlatforms.map((platformItem) => (
        <Badge
          key={platformItem._id}
          variant="secondary"
          className={size === "sm" ? "text-xs h-5" : ""}
          title={platformItem.name}
        >
          <div className="flex items-center gap-1">
            <PlatformIcon platform={platformItem} className="h-3 w-3" />
            {platformItem.name}
          </div>
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge
          variant="outline"
          className={size === "sm" ? "text-xs h-5" : ""}
          title={`${remainingCount} more platform${remainingCount === 1 ? "" : "s"}`}
        >
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}
