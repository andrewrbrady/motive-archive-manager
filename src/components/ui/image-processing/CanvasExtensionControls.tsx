import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { PresetSizes } from "./PresetSizes";
import {
  ProcessableImageData,
  ImageDimensions,
  ProcessingControlsProps,
} from "./types";

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Canvas Extension Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Canvas Extension Settings</h3>

        {/* Desired Height */}
        <div className="space-y-2">
          <Label htmlFor="desiredHeight">Desired Height (pixels)</Label>
          <Input
            id="desiredHeight"
            type="number"
            value={desiredHeight}
            onChange={(e) => setDesiredHeight(e.target.value)}
            placeholder="1350"
            min="100"
            max="5000"
          />
          <p className="text-xs text-muted-foreground">
            Original height: {originalDimensions?.height || 0}px
          </p>
        </div>

        {/* Preset Sizes */}
        <div className="space-y-2">
          <Label>Preset Sizes</Label>
          <PresetSizes
            onSizeSelect={(width, height) => {
              setOutputWidth(width);
              setDesiredHeight(height);
            }}
          />
        </div>

        {/* Padding Percentage */}
        <div className="space-y-2">
          <Label>
            Padding Percentage: {(paddingPercentage * 100).toFixed(1)}%
          </Label>
          <Slider
            value={[paddingPercentage]}
            onValueChange={(value) => setPaddingPercentage(value[0])}
            min={0}
            max={0.2}
            step={0.01}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Percentage of image height to preserve around detected objects
          </p>
        </div>
      </div>

      {/* Right Column: Processing Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Processing Settings</h3>

        {/* White Threshold */}
        <div className="space-y-2">
          <Label>White Threshold: {whiteThreshold}</Label>
          <Slider
            value={[whiteThreshold]}
            onValueChange={(value) => setWhiteThreshold(value[0])}
            min={0}
            max={255}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 (Black)</span>
            <span>Value: {whiteThreshold}</span>
            <span>255 (White)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Threshold for detecting background areas to extend
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

        {/* Extension Preview Info */}
        {originalDimensions && (
          <div className="space-y-2">
            <Label>Extension Preview</Label>
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
      </div>
    </div>
  );
}
