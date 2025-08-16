/**
 * Smart Image Optimization Library - Revised Implementation
 *
 * Focuses on intelligent size optimization while preserving quality.
 * Only compresses when files exceed reasonable upload limits.
 * Lets Cloudflare handle format optimization at delivery time.
 */

export interface OptimizationOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  preserveExif?: boolean;
  context?: "car" | "project" | "general";
  forceOptimization?: boolean;
}

export interface OptimizationResult {
  optimizedFile: File;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  widthReduction: number;
  heightReduction: number;
  formatChanged: boolean;
  processingTime: number;
}

/**
 * Optimize a single image file for upload
 */
export async function optimizeImageForUpload(
  file: File,
  options: OptimizationOptions = {}
): Promise<OptimizationResult> {
  const startTime = performance.now();

  const {
    maxSizeMB = determineOptimalSizeMB(file, options.context),
    maxWidthOrHeight = determineOptimalDimensions(file, options.context),
    quality = 0.92, // Higher quality preservation
    preserveExif = false,
    context = "general",
    forceOptimization = false,
  } = options;

  // Smart optimization: only compress if file is actually too large
  if (!forceOptimization && !needsOptimization(file, maxSizeMB)) {
    return {
      optimizedFile: file,
      originalSize: file.size,
      optimizedSize: file.size,
      compressionRatio: 1,
      widthReduction: 1,
      heightReduction: 1,
      formatChanged: false,
      processingTime: performance.now() - startTime,
    };
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    if (!ctx) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    img.onload = () => {
      try {
        const originalDimensions = { width: img.width, height: img.height };

        // Calculate optimal dimensions
        const { width, height } = calculateOptimalDimensions(
          img.width,
          img.height,
          maxWidthOrHeight
        );

        canvas.width = width;
        canvas.height = height;

        // High-quality image drawing with antialiasing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Preserve original format for quality, only reduce dimensions/quality
        const targetMimeType = file.type;
        let currentQuality = quality;

        const attemptCompression = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }

              const targetSizeBytes = maxSizeMB * 1024 * 1024;

              // If size is good or quality is too low, finalize
              if (blob.size <= targetSizeBytes || currentQuality <= 0.1) {
                finalizeOptimization(blob);
                return;
              }

              // Reduce quality and try again
              currentQuality = Math.max(0.1, currentQuality - 0.1);
              attemptCompression();
            },
            targetMimeType,
            currentQuality
          );
        };

        const finalizeOptimization = (blob: Blob) => {
          const optimizedFile = new File(
            [blob],
            file.name, // Keep original filename
            {
              type: targetMimeType,
              lastModified: Date.now(),
            }
          );

          const processingTime = performance.now() - startTime;

          resolve({
            optimizedFile,
            originalSize: file.size,
            optimizedSize: optimizedFile.size,
            compressionRatio: file.size / optimizedFile.size,
            widthReduction: originalDimensions.width / width,
            heightReduction: originalDimensions.height / height,
            formatChanged: false, // We're preserving format now
            processingTime,
          });
        };

        attemptCompression();
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image for optimization"));
    };

    // Handle different image formats
    if (file.type === "image/heic" || file.type === "image/heif") {
      // For HEIC/HEIF, we'll need the heic2any library
      img.src = URL.createObjectURL(file);
    } else {
      img.src = URL.createObjectURL(file);
    }
  });
}

/**
 * Batch optimize multiple images with progress tracking
 */
export async function optimizeImageBatch(
  files: File[],
  options: OptimizationOptions = {},
  onProgress?: (completed: number, total: number, currentFile: string) => void
): Promise<OptimizationResult[]> {
  const results: OptimizationResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i, files.length, file.name);

    try {
      const result = await optimizeImageForUpload(file, options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to optimize ${file.name}:`, error);
      // Create a fallback result with the original file
      results.push({
        optimizedFile: file,
        originalSize: file.size,
        optimizedSize: file.size,
        compressionRatio: 1,
        widthReduction: 1,
        heightReduction: 1,
        formatChanged: false,
        processingTime: 0,
      });
    }
  }

  onProgress?.(files.length, files.length, "Complete");
  return results;
}

/**
 * Check if image actually needs optimization based on size limits
 */
function needsOptimization(file: File, maxSizeMB: number): boolean {
  const currentSizeMB = file.size / (1024 * 1024);
  return currentSizeMB > maxSizeMB;
}

/**
 * Smart size determination based on context - only compress when truly necessary
 */
function determineOptimalSizeMB(file: File, context?: string): number {
  switch (context) {
    case "car":
      // Car images: Only compress if > 8MB (preserve quality)
      return 8.0;
    case "project":
      // Project images: Only compress if > 6MB
      return 6.0;
    default:
      // General uploads: Only compress if > 5MB
      return 5.0;
  }
}

/**
 * Smart dimension determination based on context
 */
function determineOptimalDimensions(file: File, context?: string): number {
  switch (context) {
    case "car":
      // Car images benefit from higher resolution
      return 2048;
    case "project":
      // Project images can be smaller
      return 1200;
    default:
      // General purpose
      return 1600;
  }
}

/**
 * Calculate optimal dimensions while maintaining aspect ratio
 */
function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number
): { width: number; height: number } {
  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return { width: originalWidth, height: originalHeight };
  }

  const aspectRatio = originalWidth / originalHeight;

  if (originalWidth > originalHeight) {
    return {
      width: maxDimension,
      height: Math.round(maxDimension / aspectRatio),
    };
  } else {
    return {
      width: Math.round(maxDimension * aspectRatio),
      height: maxDimension,
    };
  }
}

/**
 * Generate optimized filename with format indicator
 */
function generateOptimizedFilename(
  originalName: string,
  format: string
): string {
  const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, "");
  return `${nameWithoutExtension}.${format}`;
}

/**
 * Validate if image needs optimization
 */
export function shouldOptimizeImage(
  file: File,
  options: OptimizationOptions = {}
): boolean {
  const maxSizeMB =
    options.maxSizeMB || determineOptimalSizeMB(file, options.context);

  // Only optimize if file is actually too large for upload
  return (
    needsOptimization(file, maxSizeMB) || options.forceOptimization || false
  );
}

/**
 * Get optimization statistics for monitoring
 */
export function getOptimizationStats(results: OptimizationResult[]): {
  totalOriginalSize: number;
  totalOptimizedSize: number;
  averageCompressionRatio: number;
  totalSpaceSaved: number;
  averageProcessingTime: number;
  formatConversions: number;
} {
  const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalOptimizedSize = results.reduce(
    (sum, r) => sum + r.optimizedSize,
    0
  );
  const averageCompressionRatio =
    results.reduce((sum, r) => sum + r.compressionRatio, 0) / results.length;
  const totalSpaceSaved = totalOriginalSize - totalOptimizedSize;
  const averageProcessingTime =
    results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
  const formatConversions = results.filter((r) => r.formatChanged).length;

  return {
    totalOriginalSize,
    totalOptimizedSize,
    averageCompressionRatio,
    totalSpaceSaved,
    averageProcessingTime,
    formatConversions,
  };
}
