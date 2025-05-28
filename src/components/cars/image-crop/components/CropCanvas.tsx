import React, { useRef, useEffect, useCallback } from "react";
import { CropArea, ImageDimensions, CanvasState } from "../types";

interface CropCanvasProps {
  image: { url: string } | null;
  cropArea: CropArea;
  setCropArea: (area: CropArea) => void;
  originalDimensions: ImageDimensions | null;
  canvasState: CanvasState;
  setCanvasState: (state: Partial<CanvasState>) => void;
  onCropChange?: () => void;
}

export function CropCanvas({
  image,
  cropArea,
  setCropArea,
  originalDimensions,
  canvasState,
  setCanvasState,
  onCropChange,
}: CropCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Validate crop area
  const validateCropArea = useCallback(
    (area: CropArea, dimensions: ImageDimensions): boolean => {
      return (
        area.width > 0 &&
        area.height > 0 &&
        area.x >= 0 &&
        area.y >= 0 &&
        area.x + area.width <= dimensions.width &&
        area.y + area.height <= dimensions.height
      );
    },
    []
  );

  // Draw the canvas with image and crop overlay
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || !originalDimensions) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Calculate canvas dimensions to fit the image
      const maxWidth = 400;
      const maxHeight = 300;
      const scale = Math.min(
        maxWidth / originalDimensions.width,
        maxHeight / originalDimensions.height
      );

      canvas.width = originalDimensions.width * scale;
      canvas.height = originalDimensions.height * scale;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw crop overlay
      if (validateCropArea(cropArea, originalDimensions)) {
        // Semi-transparent overlay
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Clear crop area
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillRect(
          cropArea.x * scale,
          cropArea.y * scale,
          cropArea.width * scale,
          cropArea.height * scale
        );

        // Draw crop border
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          cropArea.x * scale,
          cropArea.y * scale,
          cropArea.width * scale,
          cropArea.height * scale
        );
      }

      setCanvasState({ canvasScale: scale });
    };
    img.src = image.url;
  }, [image, cropArea, originalDimensions, validateCropArea, setCanvasState]);

  // Redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!originalDimensions) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / canvasState.canvasScale;
      const y = (e.clientY - rect.top) / canvasState.canvasScale;

      setCanvasState({
        isDragging: true,
        dragStart: { x, y },
      });
    },
    [originalDimensions, canvasState.canvasScale, setCanvasState]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasState.isDragging || !originalDimensions) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / canvasState.canvasScale;
      const y = (e.clientY - rect.top) / canvasState.canvasScale;

      const deltaX = x - canvasState.dragStart.x;
      const deltaY = y - canvasState.dragStart.y;

      const newCropArea = {
        ...cropArea,
        x: Math.max(
          0,
          Math.min(
            originalDimensions.width - cropArea.width,
            cropArea.x + deltaX
          )
        ),
        y: Math.max(
          0,
          Math.min(
            originalDimensions.height - cropArea.height,
            cropArea.y + deltaY
          )
        ),
      };

      setCropArea(newCropArea);
      setCanvasState({
        dragStart: { x, y },
      });

      onCropChange?.();
    },
    [
      canvasState.isDragging,
      canvasState.dragStart,
      canvasState.canvasScale,
      originalDimensions,
      cropArea,
      setCropArea,
      setCanvasState,
      onCropChange,
    ]
  );

  const handleCanvasMouseUp = useCallback(() => {
    setCanvasState({ isDragging: false });
  }, [setCanvasState]);

  if (!image || !originalDimensions) {
    return (
      <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">No image selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Interactive Crop Area</label>
      <div className="border rounded-lg p-2 bg-muted/50">
        <canvas
          ref={canvasRef}
          className="w-full h-auto cursor-move border rounded"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Click and drag to adjust crop area
        </p>
      </div>
    </div>
  );
}
