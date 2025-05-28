import { useState, useEffect, useCallback } from "react";
import { CropArea, ImageDimensions, ProcessingMethod } from "../types";

export function useCropSettings() {
  const [cropArea, setCropArea] = useState<CropArea>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [scale, setScale] = useState<number>(1.0);
  const [outputWidth, setOutputWidth] = useState<string>("1080");
  const [outputHeight, setOutputHeight] = useState<string>("1920");
  const [cloudflareWidth, setCloudflareWidth] = useState<string>("3000");
  const [cloudflareQuality, setCloudflareQuality] = useState<string>("100");
  const [processingMethod, setProcessingMethod] =
    useState<ProcessingMethod>("cloud");

  // Load processing method preference from localStorage
  useEffect(() => {
    const savedMethod = localStorage.getItem(
      "imageCropMethod"
    ) as ProcessingMethod;
    if (savedMethod && (savedMethod === "cloud" || savedMethod === "local")) {
      setProcessingMethod(savedMethod);
    }
  }, []);

  // Save processing method preference to localStorage
  const handleProcessingMethodChange = useCallback(
    (method: ProcessingMethod) => {
      setProcessingMethod(method);
      localStorage.setItem("imageCropMethod", method);
    },
    []
  );

  // Helper function to initialize crop area based on output dimensions
  const initializeCropArea = useCallback(
    (
      imageDimensions: ImageDimensions,
      targetWidth: number,
      targetHeight: number
    ) => {
      const imageAspect = imageDimensions.width / imageDimensions.height;
      const targetAspect = targetWidth / targetHeight;

      let cropWidth, cropHeight;

      // Fit the target aspect ratio within the image
      if (targetAspect > imageAspect) {
        // Target is wider than image - fit to image width
        cropWidth = imageDimensions.width;
        cropHeight = cropWidth / targetAspect;
      } else {
        // Target is taller than image - fit to image height
        cropHeight = imageDimensions.height;
        cropWidth = cropHeight * targetAspect;
      }

      // Center the crop area
      const x = (imageDimensions.width - cropWidth) / 2;
      const y = (imageDimensions.height - cropHeight) / 2;

      setCropArea({
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: cropWidth,
        height: cropHeight,
      });
    },
    []
  );

  const resetCropSettings = useCallback(() => {
    setCropArea({ x: 0, y: 0, width: 0, height: 0 });
    setScale(1.0);
    setOutputWidth("1080");
    setOutputHeight("1920");
    setCloudflareWidth("3000");
    setCloudflareQuality("100");
  }, []);

  return {
    cropArea,
    setCropArea,
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
    handleProcessingMethodChange,
    initializeCropArea,
    resetCropSettings,
  };
}
