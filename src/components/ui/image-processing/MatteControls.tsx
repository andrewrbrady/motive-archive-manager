import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PresetSizes } from "./PresetSizes";
import {
  ProcessableImageData,
  ImageDimensions,
  ProcessingControlsProps,
} from "./types";

export function MatteControls({ processing, image }: ProcessingControlsProps) {
  const { originalDimensions, parameters, setParameters } = processing;

  // Initialize from parameters or set defaults
  const [canvasWidth, setCanvasWidth] = useState<string>(
    parameters.canvasWidth || "1827"
  );
  const [canvasHeight, setCanvasHeight] = useState<string>(
    parameters.canvasHeight || "1080"
  );
  const [paddingPercentage, setPaddingPercentage] = useState<string>(
    parameters.paddingPercentage || "0"
  );
  const [matteColor, setMatteColor] = useState<string>(
    parameters.matteColor || "#000000"
  );
  const [quality, setQuality] = useState<string>(parameters.quality || "100");
  const [outputWidth, setOutputWidth] = useState<string>(
    parameters.outputWidth || "1080"
  );

  // Update parameters when settings change
  useEffect(() => {
    setParameters({
      ...parameters,
      canvasWidth,
      canvasHeight,
      paddingPercentage,
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

  // Color presets
  const colorPresets = [
    { name: "Black", value: "#000000" },
    { name: "White", value: "#FFFFFF" },
    { name: "Gray", value: "#808080" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Matte Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Matte Settings</h3>

        {/* Canvas Dimensions */}
        <div className="space-y-2">
          <Label>Canvas Dimensions (pixels)</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="canvasWidth">Width</Label>
              <Input
                id="canvasWidth"
                type="number"
                value={canvasWidth}
                onChange={(e) => setCanvasWidth(e.target.value)}
                placeholder="1827"
                min="100"
                max="5000"
              />
            </div>
            <div>
              <Label htmlFor="canvasHeight">Height</Label>
              <Input
                id="canvasHeight"
                type="number"
                value={canvasHeight}
                onChange={(e) => setCanvasHeight(e.target.value)}
                placeholder="1080"
                min="100"
                max="5000"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Original: {originalDimensions?.width || 0} ×{" "}
            {originalDimensions?.height || 0}
          </p>
        </div>

        {/* Preset Sizes */}
        <div className="space-y-2">
          <Label>Preset Sizes</Label>
          <PresetSizes
            onSizeSelect={(width, height) => {
              setCanvasWidth(width);
              setCanvasHeight(height);
            }}
          />
        </div>

        {/* Aspect Ratio Presets */}
        <div className="space-y-2">
          <Label>Aspect Ratio Presets</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setCanvasWidth("1080");
                setCanvasHeight("1920");
              }}
              className="p-2 text-sm border rounded hover:bg-muted transition-colors"
            >
              9:16
              <br />
              <span className="text-xs text-muted-foreground">1080×1920</span>
            </button>
            <button
              onClick={() => {
                setCanvasWidth("1080");
                setCanvasHeight("1350");
              }}
              className="p-2 text-sm border rounded hover:bg-muted transition-colors"
            >
              4:5
              <br />
              <span className="text-xs text-muted-foreground">1080×1350</span>
            </button>
            <button
              onClick={() => {
                setCanvasWidth("1620");
                setCanvasHeight("1080");
              }}
              className="p-2 text-sm border rounded hover:bg-muted transition-colors"
            >
              3:2
              <br />
              <span className="text-xs text-muted-foreground">1620×1080</span>
            </button>
            <button
              onClick={() => {
                setCanvasWidth("1440");
                setCanvasHeight("1080");
              }}
              className="p-2 text-sm border rounded hover:bg-muted transition-colors"
            >
              4:3
              <br />
              <span className="text-xs text-muted-foreground">1440×1080</span>
            </button>
          </div>
        </div>

        {/* Padding Percentage */}
        <div className="space-y-2">
          <Label htmlFor="paddingPercentage">Padding Percentage</Label>
          <Input
            id="paddingPercentage"
            type="number"
            value={paddingPercentage}
            onChange={(e) => setPaddingPercentage(e.target.value)}
            placeholder="0"
            min="0"
            max="50"
          />
          <p className="text-xs text-muted-foreground">
            Percentage of canvas to use as padding around the image
          </p>
        </div>
      </div>

      {/* Right Column: Color & Processing Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Processing Settings</h3>

        {/* Matte Color */}
        <div className="space-y-2">
          <Label htmlFor="matteColor">Matte Color</Label>
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 border rounded cursor-pointer"
              style={{ backgroundColor: matteColor }}
            />
            <Input
              id="matteColor"
              type="text"
              value={matteColor}
              onChange={(e) => setMatteColor(e.target.value)}
              placeholder="#000000"
              className="flex-1"
            />
          </div>

          {/* Color Presets */}
          <div className="flex gap-2">
            {colorPresets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => setMatteColor(preset.value)}
                className="flex items-center gap-2"
              >
                <div
                  className="w-4 h-4 border rounded"
                  style={{ backgroundColor: preset.value }}
                />
                {preset.name}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Color for the matte/border around the image
          </p>
        </div>

        {/* Original Image Quality */}
        <div className="space-y-4">
          <Label>Original Image Quality</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="outputWidth">Width (px)</Label>
              <Input
                id="outputWidth"
                type="number"
                value={outputWidth}
                onChange={(e) => setOutputWidth(e.target.value)}
                placeholder="1080"
                min="100"
                max="5000"
              />
            </div>
            <div>
              <Label htmlFor="quality">Quality (%)</Label>
              <Input
                id="quality"
                type="number"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                placeholder="100"
                min="1"
                max="100"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Quality settings for the original image processing
          </p>
        </div>

        {/* Matte Preview Info */}
        {originalDimensions && (
          <div className="space-y-2">
            <Label>Matte Preview</Label>
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
      </div>
    </div>
  );
}
