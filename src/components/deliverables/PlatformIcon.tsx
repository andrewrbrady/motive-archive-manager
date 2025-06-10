import React from "react";
import { getIconComponent } from "@/components/ui/IconPicker";
import { Globe } from "lucide-react";
import { DeliverablePlatform } from "@/types/deliverable";
import { usePlatforms } from "@/contexts/PlatformContext";

interface PlatformIconProps {
  /** Platform object with name and category */
  platform?: DeliverablePlatform;
  /** Platform ID to look up from context */
  platformId?: string;
  /** Platform name as string (fallback for legacy) */
  platformName?: string;
  /** Icon size class (default: h-4 w-4) */
  className?: string;
  /** Show fallback icon if no specific icon found (default: true) */
  showFallback?: boolean;
}

export function PlatformIcon({
  platform,
  platformId,
  platformName,
  className = "h-4 w-4",
  showFallback = true,
}: PlatformIconProps) {
  const { getPlatformById } = usePlatforms();

  // Determine the platform name to use for icon lookup
  let iconLookupName: string | undefined;

  // Priority 1: Use provided platform object
  if (platform?.name) {
    iconLookupName = platform.name;
  }
  // Priority 2: Look up platform by ID from context
  else if (platformId) {
    const foundPlatform = getPlatformById(platformId);
    iconLookupName = foundPlatform?.name;
  }
  // Priority 3: Use provided platform name
  else if (platformName) {
    iconLookupName = platformName;
  }

  // If we have an icon lookup name, try to get the icon component
  if (iconLookupName) {
    const IconComponent = getIconComponent(iconLookupName);

    if (IconComponent) {
      return <IconComponent className={`text-primary ${className}`} />;
    }
  }

  // Show fallback globe icon if no specific icon found and fallback is enabled
  if (showFallback) {
    return <Globe className={`text-muted-foreground ${className}`} />;
  }

  // Return null if no icon found and fallback is disabled
  return null;
}
