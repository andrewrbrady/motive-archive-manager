import React from "react";
import { getIconComponent } from "@/components/ui/IconPicker";

interface PlatformIconProps {
  platform?: string;
}

// Platform badge component for captions - just icon in upper right
export default function PlatformIcon({ platform }: PlatformIconProps) {
  if (!platform) return null;

  const IconComponent = getIconComponent(platform);

  if (!IconComponent) return null;

  return (
    <div className="absolute top-2 right-2">
      <IconComponent className="h-4 w-4 text-primary" />
    </div>
  );
}
