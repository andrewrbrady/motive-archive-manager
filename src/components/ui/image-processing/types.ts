// Generic image interface for site-wide image processing
export interface ProcessableImageData {
  _id: string;
  url: string;
  filename?: string;
  metadata?: any;
  carId?: string; // Optional, for backward compatibility with car images
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ProcessedImageData {
  _id: string;
  url: string;
  filename: string;
  metadata: any;
  carId: string;
}

export type ProcessingType = "canvas-extension" | "image-matte" | "image-crop";

export interface ImageProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: ProcessableImageData | null;
  processingType: ProcessingType;
  enablePreview?: boolean;
  galleryId?: string;
  onImageReplaced?: (originalImageId: string, newImageData: any) => void;
}

// Unified processing control props interface
export interface ProcessingControlsProps {
  processing: {
    parameters: any;
    setParameters: (params: any) => void;
    originalDimensions: ImageDimensions | null;
  };
  image: ProcessableImageData | null;
}

// Specific parameter types for different processing modes
export interface CropParameters {
  cropArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  scale?: number;
  outputWidth?: string;
  outputHeight?: string;
}

export interface CanvasExtensionParameters {
  desiredHeight?: string;
  paddingPercentage?: number;
  whiteThreshold?: number;
  quality?: string;
  outputWidth?: string;
}

export interface MatteParameters {
  canvasWidth?: string;
  canvasHeight?: string;
  paddingPercentage?: string;
  matteColor?: string;
  quality?: string;
  outputWidth?: string;
}
