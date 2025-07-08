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

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function CropControls({ processing, image }: ProcessingControlsProps) {
  const { originalDimensions, parameters, setParameters } = processing;

  // Initialize crop area and output dimensions from parameters
  const [cropArea, setCropArea] = useState<CropArea>(
    parameters.cropArea || { x: 0, y: 0, width: 0, height: 0 }
  );
  const [scale, setScale] = useState<number>(parameters.scale || 1.0);
  const [outputWidth, setOutputWidth] = useState<string>(
    parameters.outputWidth || "1080"
  );
  const [outputHeight, setOutputHeight] = useState<string>(
    parameters.outputHeight || "1920"
  );

  // Initialize crop area when original dimensions are available
  useEffect(() => {
    if (originalDimensions && (!cropArea.width || !cropArea.height)) {
      const newCropArea = initializeCropArea(
        originalDimensions,
        parseInt(outputWidth) || 1080,
        parseInt(outputHeight) || 1920
      );
      setCropArea(newCropArea);
    }
  }, [
    originalDimensions,
    outputWidth,
    outputHeight,
    cropArea.width,
    cropArea.height,
  ]);

  // Update parameters when any crop setting changes
  useEffect(() => {
    setParameters({
      ...parameters,
      cropArea,
      scale,
      outputWidth,
      outputHeight,
    });
  }, [cropArea, scale, outputWidth, outputHeight, setParameters]);

  const initializeCropArea = (
    imageDims: ImageDimensions,
    targetWidth: number,
    targetHeight: number
  ): CropArea => {
    const targetAspectRatio = targetWidth / targetHeight;
    const imageAspectRatio = imageDims.width / imageDims.height;

    let cropWidth: number, cropHeight: number;

    if (imageAspectRatio > targetAspectRatio) {
      cropHeight = imageDims.height;
      cropWidth = cropHeight * targetAspectRatio;
    } else {
      cropWidth = imageDims.width;
      cropHeight = cropWidth / targetAspectRatio;
    }

    const x = Math.max(0, (imageDims.width - cropWidth) / 2);
    const y = Math.max(0, (imageDims.height - cropHeight) / 2);

    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight),
    };
  };

  const validateCropArea = (
    crop: CropArea,
    imageDims: ImageDimensions
  ): boolean => {
    return (
      crop.x >= 0 &&
      crop.y >= 0 &&
      crop.width > 0 &&
      crop.height > 0 &&
      crop.x + crop.width <= imageDims.width &&
      crop.y + crop.height <= imageDims.height
    );
  };

  // Preset aspect ratios
  const ASPECT_RATIO_PRESETS = [
    { label: "9:16", width: "1080", height: "1920", desc: "Stories" },
    { label: "4:5", width: "1080", height: "1350", desc: "Instagram" },
    { label: "1:1", width: "1080", height: "1080", desc: "Square" },
    { label: "16:9", width: "1920", height: "1080", desc: "YouTube" },
    { label: "3:2", width: "1620", height: "1080", desc: "Photo" },
    { label: "4:3", width: "1440", height: "1080", desc: "Classic" },
  ];

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePresetSelect = (width: string, height: string) => {
    setOutputWidth(width);
    setOutputHeight(height);
    if (originalDimensions) {
      const newCropArea = initializeCropArea(
        originalDimensions,
        parseInt(width),
        parseInt(height)
      );
      setCropArea(newCropArea);
    }
  };

  const isPresetActive = (presetWidth: string, presetHeight: string) => {
    return outputWidth === presetWidth && outputHeight === presetHeight;
  };

  return (
    <div className="space-y-6">
      {/* Aspect Ratio Presets - Main Interface */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {ASPECT_RATIO_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant={
                isPresetActive(preset.width, preset.height)
                  ? "default"
                  : "outline"
              }
              onClick={() => handlePresetSelect(preset.width, preset.height)}
              className="h-auto py-3 px-2 flex flex-col items-center text-xs"
              title={`${preset.width}×${preset.height}`}
            >
              <span className="font-semibold">{preset.label}</span>
              <span className="text-xs text-muted-foreground">
                {preset.desc}
              </span>
            </Button>
          ))}
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
            {/* Crop Area Controls */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                Crop Position & Size
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="cropX" className="text-xs">
                    X Position
                  </Label>
                  <Input
                    id="cropX"
                    type="number"
                    value={cropArea.x}
                    onChange={(e) => {
                      const newX = parseInt(e.target.value) || 0;
                      if (
                        originalDimensions &&
                        newX + cropArea.width <= originalDimensions.width
                      ) {
                        setCropArea((prev) => ({
                          ...prev,
                          x: Math.max(0, newX),
                        }));
                      }
                    }}
                    min="0"
                    max={originalDimensions?.width || 0}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="cropY" className="text-xs">
                    Y Position
                  </Label>
                  <Input
                    id="cropY"
                    type="number"
                    value={cropArea.y}
                    onChange={(e) => {
                      const newY = parseInt(e.target.value) || 0;
                      if (
                        originalDimensions &&
                        newY + cropArea.height <= originalDimensions.height
                      ) {
                        setCropArea((prev) => ({
                          ...prev,
                          y: Math.max(0, newY),
                        }));
                      }
                    }}
                    min="0"
                    max={originalDimensions?.height || 0}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="cropWidth" className="text-xs">
                    Width
                  </Label>
                  <Input
                    id="cropWidth"
                    type="number"
                    value={cropArea.width}
                    onChange={(e) => {
                      const newWidth = parseInt(e.target.value) || 0;
                      if (
                        originalDimensions &&
                        cropArea.x + newWidth <= originalDimensions.width
                      ) {
                        setCropArea((prev) => ({
                          ...prev,
                          width: Math.max(1, newWidth),
                        }));
                      }
                    }}
                    min="1"
                    max={originalDimensions?.width || 0}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="cropHeight" className="text-xs">
                    Height
                  </Label>
                  <Input
                    id="cropHeight"
                    type="number"
                    value={cropArea.height}
                    onChange={(e) => {
                      const newHeight = parseInt(e.target.value) || 0;
                      if (
                        originalDimensions &&
                        cropArea.y + newHeight <= originalDimensions.height
                      ) {
                        setCropArea((prev) => ({
                          ...prev,
                          height: Math.max(1, newHeight),
                        }));
                      }
                    }}
                    min="1"
                    max={originalDimensions?.height || 0}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Output & Scale Controls */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Output Settings</Label>
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
                  <Label htmlFor="outputHeight" className="text-xs">
                    Height (px)
                  </Label>
                  <Input
                    id="outputHeight"
                    type="number"
                    value={outputHeight}
                    onChange={(e) => setOutputHeight(e.target.value)}
                    placeholder="1920"
                    min="100"
                    max="5000"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">
                  Scale Factor: {scale.toFixed(2)}x
                </Label>
                <Slider
                  value={[scale]}
                  onValueChange={(value) => setScale(value[0])}
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(0.5)}
                    className="text-xs px-2 py-1"
                  >
                    0.5x
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(1.0)}
                    className="text-xs px-2 py-1"
                  >
                    1.0x
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(1.5)}
                    className="text-xs px-2 py-1"
                  >
                    1.5x
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(2.0)}
                    className="text-xs px-2 py-1"
                  >
                    2.0x
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
