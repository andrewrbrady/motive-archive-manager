/**
 * Client-side image compression utility for handling large image uploads on Vercel
 * Compresses images to stay within Vercel's 4.5MB function payload limit
 */

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  quality?: number;
  fileType?: string;
}

export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Compresses an image file to reduce its size for Vercel upload
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxSizeMB = 3.5, // Stay under 4MB limit
    maxWidthOrHeight = 1920,
    quality = 0.8,
    fileType = "image/jpeg",
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = img;

        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = (height * maxWidthOrHeight) / width;
            width = maxWidthOrHeight;
          } else {
            width = (width * maxWidthOrHeight) / height;
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }

              // Check if we need further compression
              let currentQuality = quality;
              let finalBlob = blob;

              const checkSize = () => {
                if (
                  finalBlob.size <= maxSizeMB * 1024 * 1024 ||
                  currentQuality <= 0.1
                ) {
                  // Create final file
                  const compressedFile = new File([finalBlob], file.name, {
                    type: fileType,
                    lastModified: Date.now(),
                  });

                  resolve({
                    compressedFile,
                    originalSize: file.size,
                    compressedSize: compressedFile.size,
                    compressionRatio: file.size / compressedFile.size,
                  });
                  return;
                }

                // Reduce quality and try again
                currentQuality -= 0.1;
                canvas.toBlob(
                  (newBlob) => {
                    if (newBlob) {
                      finalBlob = newBlob;
                      checkSize();
                    } else {
                      reject(new Error("Failed to compress image further"));
                    }
                  },
                  fileType,
                  currentQuality
                );
              };

              checkSize();
            },
            fileType,
            quality
          );
        } else {
          reject(new Error("Failed to get canvas context"));
        }
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Checks if a file needs compression based on size
 */
export function needsCompression(file: File, maxSizeMB: number = 3.5): boolean {
  return file.size > maxSizeMB * 1024 * 1024;
}

/**
 * Compresses multiple files in parallel
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<CompressionResult[]> {
  const compressionPromises = files.map((file) => {
    if (needsCompression(file, options.maxSizeMB)) {
      return compressImage(file, options);
    } else {
      // Return file as-is if no compression needed
      return Promise.resolve({
        compressedFile: file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 1,
      });
    }
  });

  return Promise.all(compressionPromises);
}

/**
 * Estimates the compressed size without actually compressing
 */
export function estimateCompressedSize(
  file: File,
  quality: number = 0.8
): number {
  // Rough estimation: JPEG compression typically reduces size by 70-90%
  const estimatedRatio = quality * 0.5 + 0.3; // 0.3 to 0.8 range
  return Math.round(file.size * estimatedRatio);
}
