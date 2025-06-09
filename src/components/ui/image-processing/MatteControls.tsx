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

export function MatteControls({ processing, image }: ProcessingControlsProps) {
  const { originalDimensions, parameters, setParameters } = processing;

  // Initialize from parameters or set defaults
  const [canvasWidth, setCanvasWidth] = useState<string>(
    parameters.canvasWidth || "1827"
  );
  const [canvasHeight, setCanvasHeight] = useState<string>(
    parameters.canvasHeight || "1080"
  );
  const [paddingPercentage, setPaddingPercentage] = useState<number>(
    parseFloat(parameters.paddingPercentage) || 0
  );
  const [matteColor, setMatteColor] = useState<string>(
    parameters.matteColor || "#000000"
  );
  const [quality, setQuality] = useState<string>(parameters.quality || "100");
  const [outputWidth, setOutputWidth] = useState<string>(
    parameters.outputWidth || "1080"
  );

  // Matte size presets matching common social media formats
  const MATTE_PRESETS = [
    { label: "9:16", width: "1080", height: "1920", desc: "Stories" },
    { label: "4:5", width: "1080", height: "1350", desc: "Instagram" },
    { label: "1:1", width: "1080", height: "1080", desc: "Square" },
    { label: "16:9", width: "1920", height: "1080", desc: "YouTube" },
    { label: "3:2", width: "1620", height: "1080", desc: "Photo" },
    { label: "4:3", width: "1440", height: "1080", desc: "Classic" },
  ];

  // Color presets
  const COLOR_PRESETS = [
    { name: "Black", value: "#000000" },
    { name: "White", value: "#FFFFFF" },
    { name: "Gray", value: "#808080" },
  ];

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update parameters when settings change
  useEffect(() => {
    setParameters({
      ...parameters,
      canvasWidth,
      canvasHeight,
      paddingPercentage: paddingPercentage.toString(),
      matteColor,
      quality,
      outputWidth,
    });
  }, [
    canvasWidth,
    canvasHeight,
    paddingPercentage,
    matteColor,
    quality,
    outputWidth,
    setParameters,
  ]);

  const handlePresetSelect = (width: string, height: string) => {
    setCanvasWidth(width);
    setCanvasHeight(height);
  };

  const isPresetActive = (presetWidth: string, presetHeight: string) => {
    return canvasWidth === presetWidth && canvasHeight === presetHeight;
  };

  return (
    <div className="space-y-6">
      {/* Main Interface - 4 Column Layout */}
      <div className="grid grid-cols-4 gap-4">
        {/* Column 1: First 2 presets */}
        <div className="space-y-2">
          {MATTE_PRESETS.slice(0, 2).map((preset) => (
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
          {MATTE_PRESETS.slice(2, 4).map((preset) => (
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
          {MATTE_PRESETS.slice(4, 6).map((preset) => (
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

        {/* Column 4: Key Controls */}
        <div className="space-y-4">
          {/* Matte Color */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Matte Color</Label>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 border rounded cursor-pointer flex-shrink-0"
                style={{ backgroundColor: matteColor }}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "color";
                  input.value = matteColor;
                  input.onchange = (e) =>
                    setMatteColor((e.target as HTMLInputElement).value);
                  input.click();
                }}
              />
              <Input
                type="text"
                value={matteColor}
                onChange={(e) => setMatteColor(e.target.value)}
                placeholder="#000000"
                className="text-xs flex-1"
              />
              {COLOR_PRESETS.map((preset) => (
                <div
                  key={preset.name}
                  className={`w-6 h-6 border-2 rounded cursor-pointer transition-all ${
                    matteColor.toUpperCase() === preset.value.toUpperCase()
                      ? "ring-2 ring-blue-500 ring-offset-1"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  style={{ backgroundColor: preset.value }}
                  onClick={() => setMatteColor(preset.value)}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          {/* Padding */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Padding: {Math.round(paddingPercentage)}%
            </Label>
            <Slider
              value={[paddingPercentage]}
              onValueChange={(value) => setPaddingPercentage(value[0])}
              min={0}
              max={50}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
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
              <Label className="text-sm font-medium">Custom Canvas Size</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="canvasWidth" className="text-xs">
                    Width (px)
                  </Label>
                  <Input
                    id="canvasWidth"
                    type="number"
                    value={canvasWidth}
                    onChange={(e) => setCanvasWidth(e.target.value)}
                    placeholder="1827"
                    min="100"
                    max="5000"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="canvasHeight" className="text-xs">
                    Height (px)
                  </Label>
                  <Input
                    id="canvasHeight"
                    type="number"
                    value={canvasHeight}
                    onChange={(e) => setCanvasHeight(e.target.value)}
                    placeholder="1080"
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
                </div>
              </div>
            </div>
          </div>

          {/* Matte Preview Info */}
          {originalDimensions && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Matte Preview</Label>
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Original:</span>
                    <span>
                      {originalDimensions.width}×{originalDimensions.height}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Canvas:</span>
                    <span>
                      {canvasWidth}×{canvasHeight}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Matte Color:</span>
                    <div className="flex items-center gap-1">
                      <div
                        className="w-4 h-4 border rounded"
                        style={{ backgroundColor: matteColor }}
                      />
                      <span className="text-xs">{matteColor}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span>Padding:</span>
                    <span>{paddingPercentage}%</span>
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
