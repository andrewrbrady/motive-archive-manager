import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, ChevronRight, Settings } from "lucide-react";
import {
  ProcessableImageData,
  ImageDimensions,
  ProcessingControlsProps,
} from "./types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function CanvasExtensionControls({
  processing,
  image,
}: ProcessingControlsProps) {
  const { originalDimensions, parameters, setParameters } = processing;

  // Initialize from parameters or set defaults
  const [desiredHeight, setDesiredHeight] = useState<string>(
    parameters.desiredHeight || "1350"
  );
  const [paddingPercentage, setPaddingPercentage] = useState<number>(
    parameters.paddingPercentage || 0.05
  );
  const [whiteThreshold, setWhiteThreshold] = useState<number>(
    parameters.whiteThreshold || 90
  );
  const [quality, setQuality] = useState<string>(parameters.quality || "100");
  const [outputWidth, setOutputWidth] = useState<string>(
    parameters.outputWidth || "1080"
  );

  // Extension size presets matching common social media formats
  const EXTENSION_PRESETS = [
    { label: "9:16", width: "1080", height: "1920", desc: "Stories" },
    { label: "4:5", width: "1080", height: "1350", desc: "Instagram" },
    { label: "1:1", width: "1080", height: "1080", desc: "Square" },
    { label: "16:9", width: "1920", height: "1080", desc: "YouTube" },
    { label: "3:2", width: "1620", height: "1080", desc: "Photo" },
    { label: "4:3", width: "1440", height: "1080", desc: "Classic" },
  ];

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update parameters when settings change
  useEffect(() => {
    setParameters({
      ...parameters,
      desiredHeight,
      paddingPercentage,
      whiteThreshold,
      quality,
      outputWidth,
    });
  }, [
    desiredHeight,
    paddingPercentage,
    whiteThreshold,
    quality,
    outputWidth,
    setParameters,
  ]);

  const handlePresetSelect = (width: string, height: string) => {
    setOutputWidth(width);
    setDesiredHeight(height);
  };

  const isPresetActive = (presetWidth: string, presetHeight: string) => {
    return outputWidth === presetWidth && desiredHeight === presetHeight;
  };

  return (
    <div className="space-y-6">
      {/* Main Interface - 4 Column Layout */}
      <div className="grid grid-cols-4 gap-4">
        {/* Column 1: First 2 presets */}
        <div className="space-y-2">
          {EXTENSION_PRESETS.slice(0, 2).map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant={
                isPresetActive(preset.width, preset.height)
                  ? "default"
                  : "outline"
              }
              onClick={() => handlePresetSelect(preset.width, preset.height)}
              className="w-full h-auto py-3 px-2 flex flex-col items-center text-xs"
              title={`${preset.width}×${preset.height}`}
            >
              <span className="font-semibold">{preset.label}</span>
              <span className="text-xs text-muted-foreground">
                {preset.desc}
              </span>
            </Button>
          ))}
        </div>

        {/* Column 2: Next 2 presets */}
        <div className="space-y-2">
          {EXTENSION_PRESETS.slice(2, 4).map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant={
                isPresetActive(preset.width, preset.height)
                  ? "default"
                  : "outline"
              }
              onClick={() => handlePresetSelect(preset.width, preset.height)}
              className="w-full h-auto py-3 px-2 flex flex-col items-center text-xs"
              title={`${preset.width}×${preset.height}`}
            >
              <span className="font-semibold">{preset.label}</span>
              <span className="text-xs text-muted-foreground">
                {preset.desc}
              </span>
            </Button>
          ))}
        </div>

        {/* Column 3: Last 2 presets */}
        <div className="space-y-2">
          {EXTENSION_PRESETS.slice(4, 6).map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant={
                isPresetActive(preset.width, preset.height)
                  ? "default"
                  : "outline"
              }
              onClick={() => handlePresetSelect(preset.width, preset.height)}
              className="w-full h-auto py-3 px-2 flex flex-col items-center text-xs"
              title={`${preset.width}×${preset.height}`}
            >
              <span className="font-semibold">{preset.label}</span>
              <span className="text-xs text-muted-foreground">
                {preset.desc}
              </span>
            </Button>
          ))}
        </div>

        {/* Column 4: Sliders */}
        <div className="space-y-4">
          {/* White Threshold */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              White Threshold: {whiteThreshold}
            </Label>
            <Slider
              value={[whiteThreshold]}
              onValueChange={(value) => setWhiteThreshold(value[0])}
              min={0}
              max={255}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>255</span>
            </div>
          </div>

          {/* Padding Percentage */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Padding: {(paddingPercentage * 100).toFixed(1)}%
            </Label>
            <Slider
              value={[paddingPercentage]}
              onValueChange={(value) => setPaddingPercentage(value[0])}
              min={0}
              max={0.2}
              step={0.01}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>20%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Controls - Collapsible */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="p-0 h-auto">
            <div className="flex items-center gap-2">
              {showAdvanced ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Settings className="h-4 w-4" />
              <span className="text-sm">Advanced Settings</span>
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Custom Dimensions */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Custom Dimensions</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="outputWidth" className="text-xs">
                    Width (px)
                  </Label>
                  <Input
                    id="outputWidth"
                    type="number"
                    value={outputWidth}
                    onChange={(e) => setOutputWidth(e.target.value)}
                    placeholder="1080"
                    min="100"
                    max="5000"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="desiredHeight" className="text-xs">
                    Height (px)
                  </Label>
                  <Input
                    id="desiredHeight"
                    type="number"
                    value={desiredHeight}
                    onChange={(e) => setDesiredHeight(e.target.value)}
                    placeholder="1350"
                    min="100"
                    max="5000"
                    className="text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Original: {originalDimensions?.width || 0}×
                {originalDimensions?.height || 0}px
              </p>
            </div>

            {/* Quality Settings */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Quality Settings</Label>
              <div>
                <Label htmlFor="quality" className="text-xs">
                  Quality (%)
                </Label>
                <Input
                  id="quality"
                  type="number"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  placeholder="100"
                  min="1"
                  max="100"
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Output image quality
                </p>
              </div>
            </div>
          </div>

          {/* Extension Preview Info */}
          {originalDimensions && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Extension Preview</Label>
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Original:</span>
                    <span>
                      {originalDimensions.width}×{originalDimensions.height}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target:</span>
                    <span>
                      {outputWidth}×{desiredHeight}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extension:</span>
                    <span className="text-blue-600">
                      {parseInt(desiredHeight) - originalDimensions.height > 0
                        ? `+${parseInt(desiredHeight) - originalDimensions.height}px height`
                        : "No extension needed"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
