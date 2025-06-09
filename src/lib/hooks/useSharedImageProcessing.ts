import { useState, useMemo } from "react";

// Common preset dimensions for different processing types
export const PRESET_DIMENSIONS = {
  CANVAS_EXTENSION: {
    DEFAULT_HEIGHT: "1200",
    DEFAULT_PADDING: "0.05",
    DEFAULT_WHITE_THRESH: "90",
    DEFAULT_CLOUDFLARE_WIDTH: "2000",
    DEFAULT_CLOUDFLARE_QUALITY: "100",
  },
  IMAGE_CROP: {
    DEFAULT_OUTPUT_WIDTH: "1080",
    DEFAULT_OUTPUT_HEIGHT: "1920",
    DEFAULT_CLOUDFLARE_WIDTH: "3000",
    DEFAULT_CLOUDFLARE_QUALITY: "100",
  },
  IMAGE_MATTE: {
    DEFAULT_CANVAS_WIDTH: "1920",
    DEFAULT_CANVAS_HEIGHT: "1080",
    DEFAULT_PADDING: "0",
    DEFAULT_CLOUDFLARE_WIDTH: "2000",
    DEFAULT_CLOUDFLARE_QUALITY: "100",
  },
} as const;

// Common processing parameter types
export interface ProcessingParameters {
  imageUrl: string;
  [key: string]: any; // Allow additional parameters per processing type
}

export interface ProcessingValidation {
  isValid: boolean;
  errors: string[];
}

// Common validation functions
export function validateCanvasExtensionParams(params: {
  desiredHeight: string;
  paddingPct: string;
  whiteThresh: string;
}): ProcessingValidation {
  const errors: string[] = [];

  const height = parseInt(params.desiredHeight);
  if (isNaN(height) || height < 100 || height > 10000) {
    errors.push("Desired height must be between 100 and 10000 pixels");
  }

  const padding = parseFloat(params.paddingPct);
  if (isNaN(padding) || padding < 0 || padding > 1) {
    errors.push("Padding percentage must be between 0.0 and 1.0");
  }

  const whiteThresh =
    params.whiteThresh === "-1" ? -1 : parseInt(params.whiteThresh);
  if (
    whiteThresh !== -1 &&
    (isNaN(whiteThresh) || whiteThresh < 0 || whiteThresh > 255)
  ) {
    errors.push("White threshold must be between 0 and 255, or -1 to disable");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateImageCropParams(params: {
  outputWidth: string;
  outputHeight: string;
  cropArea: { x: number; y: number; width: number; height: number };
}): ProcessingValidation {
  const errors: string[] = [];

  const width = parseInt(params.outputWidth);
  if (isNaN(width) || width < 10 || width > 10000) {
    errors.push("Output width must be between 10 and 10000 pixels");
  }

  const height = parseInt(params.outputHeight);
  if (isNaN(height) || height < 10 || height > 10000) {
    errors.push("Output height must be between 10 and 10000 pixels");
  }

  const { x, y, width: cropWidth, height: cropHeight } = params.cropArea;
  if (cropWidth <= 0 || cropHeight <= 0) {
    errors.push("Crop area must have positive width and height");
  }

  if (x < 0 || y < 0) {
    errors.push("Crop area position must be non-negative");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateImageMatteParams(params: {
  canvasWidth: string;
  canvasHeight: string;
  paddingPercent: string;
  matteColor: string;
}): ProcessingValidation {
  const errors: string[] = [];

  const width = parseInt(params.canvasWidth);
  if (isNaN(width) || width < 10 || width > 10000) {
    errors.push("Canvas width must be between 10 and 10000 pixels");
  }

  const height = parseInt(params.canvasHeight);
  if (isNaN(height) || height < 10 || height > 10000) {
    errors.push("Canvas height must be between 10 and 10000 pixels");
  }

  const padding = parseFloat(params.paddingPercent);
  if (isNaN(padding) || padding < 0 || padding > 100) {
    errors.push("Padding percentage must be between 0 and 100");
  }

  // Basic color validation (hex format)
  if (!/^#[0-9A-Fa-f]{6}$/.test(params.matteColor)) {
    errors.push("Matte color must be a valid hex color (e.g., #000000)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Common Cloudflare URL enhancement function - FIXED to use named variants
export function getEnhancedCloudflareUrl(
  baseUrl: string,
  width?: string,
  quality?: string
): string {
  // Map requested dimensions to configured named variants
  const getNamedVariant = (requestedWidth?: string) => {
    if (!requestedWidth) return "public";

    const w = parseInt(requestedWidth);
    // Use actual Cloudflare variants:
    // thumbnail: 200x150, medium: 600x400, large: 1200x800, highres: 3000x2000
    if (w <= 200) return "thumbnail";
    if (w <= 600) return "medium";
    if (w <= 1200) return "large";
    return "highres";
  };

  // Handle Cloudflare imagedelivery.net URLs
  if (baseUrl.includes("imagedelivery.net")) {
    const urlParts = baseUrl.split("/");
    const targetVariant = getNamedVariant(width);

    // If URL already has a variant, replace it
    if (urlParts.length >= 5) {
      const lastPart = urlParts[urlParts.length - 1];

      // If it's a named variant or flexible variant, replace it
      if (lastPart.match(/^[a-zA-Z]+$/) || lastPart.includes("=")) {
        urlParts[urlParts.length - 1] = targetVariant;
        return urlParts.join("/");
      }
    }

    // URL doesn't have a variant, append the named variant
    return `${baseUrl}/${targetVariant}`;
  }

  // Fallback - just return the base URL with /public if it doesn't have a variant
  if (
    !baseUrl.includes("/public") &&
    !baseUrl.includes("/thumbnail") &&
    !baseUrl.includes("/medium") &&
    !baseUrl.includes("/large") &&
    !baseUrl.includes("/highres")
  ) {
    return `${baseUrl}/public`;
  }

  return baseUrl;
}

// Common function to get processing URL (strips Cloudflare transforms)
export function getProcessingImageUrl(baseUrl: string): string {
  if (!baseUrl.includes("imagedelivery.net")) {
    return baseUrl;
  }

  // For Cloudflare URLs, ensure we use the /public variant for processing
  const urlParts = baseUrl.split("/");
  const baseUrlWithoutVariant = urlParts.slice(0, -1).join("/");
  return `${baseUrlWithoutVariant}/public`;
}

// Shared hook for common image processing functionality
export function useSharedImageProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);

  // Memoized preset getter
  const getPresets = useMemo(
    () => ({
      canvasExtension: PRESET_DIMENSIONS.CANVAS_EXTENSION,
      imageCrop: PRESET_DIMENSIONS.IMAGE_CROP,
      imageMatte: PRESET_DIMENSIONS.IMAGE_MATTE,
    }),
    []
  );

  // Validation functions
  const validate = useMemo(
    () => ({
      canvasExtension: validateCanvasExtensionParams,
      imageCrop: validateImageCropParams,
      imageMatte: validateImageMatteParams,
    }),
    []
  );

  // URL helper functions
  const urlHelpers = useMemo(
    () => ({
      getEnhanced: getEnhancedCloudflareUrl,
      getProcessing: getProcessingImageUrl,
    }),
    []
  );

  return {
    isProcessing,
    setIsProcessing,
    presets: getPresets,
    validate,
    urlHelpers,
  };
}
