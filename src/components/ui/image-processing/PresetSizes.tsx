import React from "react";
import { Button } from "@/components/ui/button";

interface PresetSize {
  label: string;
  width: string;
  height: string;
  description?: string;
}

interface PresetSizesProps {
  onSizeSelect: (width: string, height: string) => void;
  className?: string;
}

const PRESET_SIZES: PresetSize[] = [
  {
    label: "9:16",
    width: "1080",
    height: "1920",
    description: "Instagram Stories, TikTok",
  },
  {
    label: "4:5",
    width: "1080",
    height: "1350",
    description: "Instagram Feed",
  },
  {
    label: "1:1",
    width: "1080",
    height: "1080",
    description: "Square",
  },
  {
    label: "16:9",
    width: "1920",
    height: "1080",
    description: "YouTube, Landscape",
  },
  {
    label: "3:2",
    width: "1620",
    height: "1080",
    description: "Photography",
  },
  {
    label: "4:3",
    width: "1440",
    height: "1080",
    description: "Classic TV",
  },
];

export function PresetSizes({
  onSizeSelect,
  className = "",
}: PresetSizesProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-sm font-medium">Aspect Ratio Presets</h4>
      <div className="grid grid-cols-2 gap-2">
        {PRESET_SIZES.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSizeSelect(preset.width, preset.height)}
            className="text-xs h-auto py-2 px-3 flex flex-col items-center"
            title={preset.description}
          >
            <span className="font-medium">{preset.label}</span>
            <span className="text-xs text-muted-foreground">
              {preset.width}×{preset.height}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
