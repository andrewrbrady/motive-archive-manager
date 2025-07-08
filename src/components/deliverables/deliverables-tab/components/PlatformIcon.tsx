import React from "react";
import { PlatformIcon as BasePlatformIcon } from "../../PlatformIcon";

interface PlatformIconProps {
  platform?: string;
}

// Platform badge component for captions - just icon in upper right
export default function PlatformIcon({ platform }: PlatformIconProps) {
  if (!platform) return null;

  return (
    <div className="absolute top-2 right-2">
      <BasePlatformIcon platformName={platform} className="h-4 w-4" />
    </div>
  );
}
