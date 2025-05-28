/**
 * Image Processing Worker Client - Phase 4 Performance Optimization
 *
 * TypeScript client for the image processing Web Worker.
 * Provides a clean interface for heavy image operations.
 */

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "jpeg" | "png";
}

export interface CropOptions extends ImageProcessingOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasExtendOptions {
  desiredHeight: number;
  paddingPct?: number;
}

export interface BatchProcessingOptions {
  operation: "resize" | "compress" | "thumbnail";
  options: ImageProcessingOptions;
  onProgress?: (progress: BatchProgress) => void;
}

export interface BatchProgress {
  current: number;
  total: number;
  percentage: number;
  currentImage: string;
}

export interface ProcessingResult {
  arrayBuffer: ArrayBuffer;
  width?: number;
  height?: number;
  originalSize?: number;
  newSize?: number;
  compressionRatio?: number;
  format?: string;
  cropArea?: { x: number; y: number; width: number; height: number };
  operation?: string;
  padding?: { top: number; bottom: number };
}

export interface ImageAnalysis {
  width: number;
  height: number;
  aspectRatio: number;
  avgBrightness: number;
  avgSaturation: number;
  dominantColors: Array<{ color: string; percentage: number }>;
  isLandscape: boolean;
  isPortrait: boolean;
  isSquare: boolean;
}

export interface BatchResult {
  results: Array<{
    index: number;
    name: string;
    success: boolean;
    result?: ProcessingResult;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * Image Processing Worker Client
 */
export class ImageWorkerClient {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingMessages = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      onProgress?: (progress: any) => void;
    }
  >();

  constructor() {
    this.initializeWorker();
  }

  /**
   * Initialize the Web Worker
   */
  private initializeWorker(): void {
    if (typeof window === "undefined") return;

    try {
      this.worker = new Worker("/workers/image-processor.worker.js");
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error("Failed to initialize image processing worker:", error);
    }
  }

  /**
   * Handle messages from the worker
   */
  private handleMessage(event: MessageEvent): void {
    const { id, success, data, error, progress } = event.data;

    const pending = this.pendingMessages.get(id);
    if (!pending) return;

    if (progress) {
      // Handle progress updates
      pending.onProgress?.(progress);
      return;
    }

    // Handle completion
    this.pendingMessages.delete(id);

    if (success) {
      pending.resolve(data);
    } else {
      pending.reject(new Error(error || "Worker processing failed"));
    }
  }

  /**
   * Handle worker errors
   */
  private handleError(error: ErrorEvent): void {
    console.error("Image processing worker error:", error);

    // Reject all pending messages
    this.pendingMessages.forEach(({ reject }) => {
      reject(new Error("Worker error occurred"));
    });
    this.pendingMessages.clear();
  }

  /**
   * Send message to worker and return promise
   */
  private sendMessage<T>(
    type: string,
    data: any,
    onProgress?: (progress: any) => void
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error("Worker not available"));
        return;
      }

      const id = ++this.messageId;
      this.pendingMessages.set(id, { resolve, reject, onProgress });

      this.worker.postMessage({ id, type, data });
    });
  }

  /**
   * Resize image to specified dimensions
   */
  public async resizeImage(
    imageData: File | Blob,
    options: ImageProcessingOptions
  ): Promise<ProcessingResult> {
    return this.sendMessage("resize", {
      imageData,
      width: options.width || 800,
      height: options.height || 600,
      quality: options.quality || 0.9,
    });
  }

  /**
   * Compress image with specified quality
   */
  public async compressImage(
    imageData: File | Blob,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessingResult> {
    return this.sendMessage("compress", {
      imageData,
      quality: options.quality || 0.8,
      format: options.format || "jpeg",
    });
  }

  /**
   * Crop image to specified area
   */
  public async cropImage(
    imageData: File | Blob,
    options: CropOptions
  ): Promise<ProcessingResult> {
    return this.sendMessage("crop", {
      imageData,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      quality: options.quality || 0.9,
    });
  }

  /**
   * Extend canvas with intelligent padding
   */
  public async extendCanvas(
    imageData: File | Blob,
    options: CanvasExtendOptions
  ): Promise<ProcessingResult> {
    return this.sendMessage("canvas_extend", {
      imageData,
      desiredHeight: options.desiredHeight,
      paddingPct: options.paddingPct || 5,
    });
  }

  /**
   * Generate thumbnail with smart cropping
   */
  public async generateThumbnail(
    imageData: File | Blob,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessingResult> {
    return this.sendMessage("generate_thumbnail", {
      imageData,
      width: options.width || 200,
      height: options.height || 200,
      quality: options.quality || 0.8,
    });
  }

  /**
   * Analyze image properties
   */
  public async analyzeImage(imageData: File | Blob): Promise<ImageAnalysis> {
    return this.sendMessage("analyze_image", { imageData });
  }

  /**
   * Process multiple images in batch
   */
  public async batchProcess(
    images: Array<{ name: string; data: File | Blob }>,
    options: BatchProcessingOptions
  ): Promise<BatchResult> {
    return this.sendMessage(
      "batch_process",
      {
        images,
        operation: options.operation,
        options: options.options,
      },
      options.onProgress
    );
  }

  /**
   * Convert ArrayBuffer to Blob URL for preview
   */
  public arrayBufferToBlobUrl(
    arrayBuffer: ArrayBuffer,
    mimeType: string = "image/jpeg"
  ): string {
    const blob = new Blob([arrayBuffer], { type: mimeType });
    return URL.createObjectURL(blob);
  }

  /**
   * Convert ArrayBuffer to File
   */
  public arrayBufferToFile(
    arrayBuffer: ArrayBuffer,
    filename: string,
    mimeType: string = "image/jpeg"
  ): File {
    const blob = new Blob([arrayBuffer], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  }

  /**
   * Check if worker is available
   */
  public isAvailable(): boolean {
    return this.worker !== null;
  }

  /**
   * Get worker statistics
   */
  public getStats() {
    return {
      isAvailable: this.isAvailable(),
      pendingOperations: this.pendingMessages.size,
      messageId: this.messageId,
    };
  }

  /**
   * Cleanup worker and pending operations
   */
  public destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Reject all pending messages
    this.pendingMessages.forEach(({ reject }) => {
      reject(new Error("Worker destroyed"));
    });
    this.pendingMessages.clear();
  }
}

/**
 * Global worker client instance
 */
export const imageWorker = new ImageWorkerClient();

/**
 * React hook for image processing with worker
 */
export function useImageWorker() {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState<BatchProgress | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  const processImage = React.useCallback(
    async <T>(
      operation: () => Promise<T>,
      onProgress?: (progress: BatchProgress) => void
    ): Promise<T | null> => {
      setIsProcessing(true);
      setError(null);
      setProgress(null);

      try {
        const result = await operation();
        return result;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Processing failed");
        setError(error);
        return null;
      } finally {
        setIsProcessing(false);
        setProgress(null);
      }
    },
    []
  );

  const resizeImage = React.useCallback(
    (imageData: File | Blob, options: ImageProcessingOptions) =>
      processImage(() => imageWorker.resizeImage(imageData, options)),
    [processImage]
  );

  const compressImage = React.useCallback(
    (imageData: File | Blob, options?: ImageProcessingOptions) =>
      processImage(() => imageWorker.compressImage(imageData, options)),
    [processImage]
  );

  const cropImage = React.useCallback(
    (imageData: File | Blob, options: CropOptions) =>
      processImage(() => imageWorker.cropImage(imageData, options)),
    [processImage]
  );

  const generateThumbnail = React.useCallback(
    (imageData: File | Blob, options?: ImageProcessingOptions) =>
      processImage(() => imageWorker.generateThumbnail(imageData, options)),
    [processImage]
  );

  const analyzeImage = React.useCallback(
    (imageData: File | Blob) =>
      processImage(() => imageWorker.analyzeImage(imageData)),
    [processImage]
  );

  const batchProcess = React.useCallback(
    (
      images: Array<{ name: string; data: File | Blob }>,
      options: BatchProcessingOptions
    ) =>
      processImage(
        () =>
          imageWorker.batchProcess(images, {
            ...options,
            onProgress: (progress) => {
              setProgress(progress);
              options.onProgress?.(progress);
            },
          }),
        options.onProgress
      ),
    [processImage]
  );

  return {
    isProcessing,
    progress,
    error,
    isAvailable: imageWorker.isAvailable(),
    resizeImage,
    compressImage,
    cropImage,
    generateThumbnail,
    analyzeImage,
    batchProcess,
    stats: imageWorker.getStats(),
  };
}

// Add React import for the hook
import React from "react";
