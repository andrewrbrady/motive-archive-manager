import React from "react";
import { PlatformIcon } from "../../PlatformIcon";

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
          return (
            <div key={platformId} className="flex items-center gap-1">
              <PlatformIcon platformId={platformId} className="h-4 w-4" />
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

  return (
    <div className="flex items-center gap-2">
      <PlatformIcon platformName={platform} className="h-4 w-4" />
      <span>{platform}</span>
    </div>
  );
}
