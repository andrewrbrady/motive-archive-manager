import React from "react";
import { getIconComponent } from "@/components/ui/IconPicker";

interface PlatformDisplayProps {
  platform?: string;
  platforms?: string[];
}

// Platform display component with icons
export default function PlatformDisplay({
  platform,
  platforms,
}: PlatformDisplayProps) {
  // Handle new platforms array (multiple platforms)
  if (platforms && platforms.length > 0) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {platforms.map((platformId, index) => {
          const IconComponent = getIconComponent(platformId);
          return (
            <div key={platformId} className="flex items-center gap-1">
              {IconComponent && (
                <IconComponent className="h-4 w-4 text-primary" />
              )}
              <span className="text-sm">{platformId}</span>
              {index < platforms.length - 1 && (
                <span className="text-muted-foreground">•</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Handle legacy single platform
  if (!platform)
    return <span className="text-muted-foreground">Not specified</span>;

  const IconComponent = getIconComponent(platform);

  if (IconComponent) {
    return (
      <div className="flex items-center gap-2">
        <IconComponent className="h-4 w-4 text-primary" />
        <span>{platform}</span>
      </div>
    );
  }

  // Fallback to text if no icon found
  return <span>{platform}</span>;
}
