"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useAPI } from "@/hooks/useAPI";
import { DeliverablePlatform, Platform } from "@/types/deliverable";

interface PlatformBadgesProps {
  /** Legacy single platform string */
  platform?: Platform;
  /** New array of platform IDs */
  platforms?: string[];
  /** Maximum number of badges to show before showing "X more" */
  maxVisible?: number;
  /** Size of the badges */
  size?: "sm" | "default";
  className?: string;
}

export function PlatformBadges({
  platform,
  platforms,
  maxVisible = 3,
  size = "sm",
  className,
}: PlatformBadgesProps) {
  const [platformData, setPlatformData] = useState<DeliverablePlatform[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const api = useAPI();

  useEffect(() => {
    const fetchPlatforms = async () => {
      // Reset error state
      setHasError(false);

      if (!api || (!platforms?.length && !platform)) {
        setPlatformData([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await api.get("/api/platforms");
        const allPlatforms: DeliverablePlatform[] = Array.isArray(response)
          ? response
          : (response as any)?.platforms || [];

        let relevantPlatforms: DeliverablePlatform[] = [];

        if (platforms?.length) {
          // Filter platforms by IDs
          relevantPlatforms = allPlatforms.filter((p) =>
            platforms.includes(p._id)
          );
        } else if (platform) {
          // Find platform by name for backward compatibility
          const foundPlatform = allPlatforms.find((p) => p.name === platform);
          if (foundPlatform) {
            relevantPlatforms = [foundPlatform];
          }
        }

        setPlatformData(relevantPlatforms);
      } catch (error) {
        console.error("Error fetching platforms:", error);
        setHasError(true);
        setPlatformData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlatforms();
  }, [platforms, platform, api]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className={className}>
        <Badge variant="outline" className={size === "sm" ? "text-xs h-5" : ""}>
          Loading...
        </Badge>
      </div>
    );
  }

  // Handle error state with graceful fallback to raw platform data
  if (hasError || (!platformData.length && (platform || platforms?.length))) {
    // Fallback to displaying raw platform data
    const fallbackPlatforms = platforms?.length
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
            {platformName}
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
          {platform}
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
          {platformItem.name}
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
