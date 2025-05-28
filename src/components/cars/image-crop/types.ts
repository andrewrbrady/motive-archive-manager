import { ImageData } from "@/app/images/columns";

export interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: ImageData | null;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CloudflareUploadResult {
  success: boolean;
  imageId?: string;
  imageUrl?: string;
  filename?: string;
  mongoId?: string;
  error?: string;
}

export type ProcessingMethod = "cloud" | "local";

export interface CropSettings {
  cropArea: CropArea;
  scale: number;
  outputWidth: string;
  outputHeight: string;
  cloudflareWidth: string;
  cloudflareQuality: string;
  processingMethod: ProcessingMethod;
}

export interface ProcessingState {
  isProcessing: boolean;
  isUploading: boolean;
  isProcessingHighRes: boolean;
  highResMultiplier: number | null;
  processingStatus: string;
  error: string | null;
  remoteServiceUsed: boolean;
}

export interface ImageUrls {
  processedImageUrl: string | null;
  highResImageUrl: string | null;
  livePreviewUrl: string | null;
  cachedImagePath: string | null;
}

export interface ImageDimensionsState {
  originalDimensions: ImageDimensions | null;
  processedDimensions: ImageDimensions | null;
  highResDimensions: ImageDimensions | null;
}

export interface CanvasState {
  isDragging: boolean;
  dragStart: { x: number; y: number };
  canvasScale: number;
}

export interface PreviewSettings {
  livePreviewEnabled: boolean;
  isGeneratingPreview: boolean;
  previewProcessingTime: number | null;
}
