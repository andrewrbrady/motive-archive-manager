import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings, Cloud, Monitor } from "lucide-react";
import { ProcessingMethod } from "../types";

interface CropControlsProps {
  // Crop settings
  scale: number;
  setScale: (scale: number) => void;
  outputWidth: string;
  setOutputWidth: (width: string) => void;
  outputHeight: string;
  setOutputHeight: (height: string) => void;

  // Cloudflare settings
  cloudflareWidth: string;
  setCloudflareWidth: (width: string) => void;
  cloudflareQuality: string;
  setCloudflareQuality: (quality: string) => void;

  // Processing settings
  processingMethod: ProcessingMethod;
  onProcessingMethodChange: (method: ProcessingMethod) => void;

  // Preview settings
  livePreviewEnabled: boolean;
  onLivePreviewToggle: (enabled: boolean) => void;
}

export function CropControls({
  scale,
  setScale,
  outputWidth,
  setOutputWidth,
  outputHeight,
  setOutputHeight,
  cloudflareWidth,
  setCloudflareWidth,
  cloudflareQuality,
  setCloudflareQuality,
  processingMethod,
  onProcessingMethodChange,
  livePreviewEnabled,
  onLivePreviewToggle,
}: CropControlsProps) {
  return (
    <div className="space-y-6">
      {/* Scale Control */}
      <div className="space-y-2">
        <Label>Scale: {scale.toFixed(1)}x</Label>
        <Slider
          value={[scale]}
          onValueChange={(value) => setScale(value[0])}
          min={0.1}
          max={3.0}
          step={0.1}
          className="w-full"
        />
      </div>

      {/* Output Dimensions */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Output Dimensions
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="width" className="text-xs">
              Width
            </Label>
            <Input
              id="width"
              type="number"
              value={outputWidth}
              onChange={(e) => setOutputWidth(e.target.value)}
              placeholder="1080"
              className="text-sm"
            />
          </div>
          <div>
            <Label htmlFor="height" className="text-xs">
              Height
            </Label>
            <Input
              id="height"
              type="number"
              value={outputHeight}
              onChange={(e) => setOutputHeight(e.target.value)}
              placeholder="1920"
              className="text-sm"
            />
          </div>
        </div>
      </div>

      {/* Cloudflare Settings */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Cloud className="h-4 w-4" />
          Cloudflare Settings
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="cf-width" className="text-xs">
              Max Width
            </Label>
            <Input
              id="cf-width"
              type="number"
              value={cloudflareWidth}
              onChange={(e) => setCloudflareWidth(e.target.value)}
              placeholder="3000"
              className="text-sm"
            />
          </div>
          <div>
            <Label htmlFor="cf-quality" className="text-xs">
              Quality
            </Label>
            <Input
              id="cf-quality"
              type="number"
              value={cloudflareQuality}
              onChange={(e) => setCloudflareQuality(e.target.value)}
              placeholder="100"
              min="1"
              max="100"
              className="text-sm"
            />
          </div>
        </div>
      </div>

      {/* Processing Method */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          Processing Method
        </Label>
        <Select
          value={processingMethod}
          onValueChange={onProcessingMethodChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cloud">Cloud Processing</SelectItem>
            <SelectItem value="local">Local Processing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Live Preview Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="live-preview" className="text-sm">
          Live Preview
        </Label>
        <Switch
          id="live-preview"
          checked={livePreviewEnabled}
          onCheckedChange={onLivePreviewToggle}
        />
      </div>
    </div>
  );
}
