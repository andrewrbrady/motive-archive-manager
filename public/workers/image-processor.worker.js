/**
 * Image Processing Web Worker - Phase 4 Performance Optimization
 *
 * Handles heavy image processing operations off the main thread:
 * 1. ✅ Image resizing and compression
 * 2. ✅ Canvas-based image manipulation
 * 3. ✅ Batch processing capabilities
 * 4. ✅ Progress reporting
 * 5. ✅ Error handling
 */

// Worker message types
const MESSAGE_TYPES = {
  RESIZE: "resize",
  COMPRESS: "compress",
  CROP: "crop",
  BATCH_PROCESS: "batch_process",
  CANVAS_EXTEND: "canvas_extend",
  GENERATE_THUMBNAIL: "generate_thumbnail",
  ANALYZE_IMAGE: "analyze_image",
};

/**
 * Main message handler
 */
self.onmessage = function (e) {
  const { id, type, data } = e.data;

  try {
    switch (type) {
      case MESSAGE_TYPES.RESIZE:
        handleResize(id, data);
        break;
      case MESSAGE_TYPES.COMPRESS:
        handleCompress(id, data);
        break;
      case MESSAGE_TYPES.CROP:
        handleCrop(id, data);
        break;
      case MESSAGE_TYPES.BATCH_PROCESS:
        handleBatchProcess(id, data);
        break;
      case MESSAGE_TYPES.CANVAS_EXTEND:
        handleCanvasExtend(id, data);
        break;
      case MESSAGE_TYPES.GENERATE_THUMBNAIL:
        handleGenerateThumbnail(id, data);
        break;
      case MESSAGE_TYPES.ANALYZE_IMAGE:
        handleAnalyzeImage(id, data);
        break;
      default:
        postError(id, `Unknown message type: ${type}`);
    }
  } catch (error) {
    postError(id, error.message || "Unknown error occurred");
  }
};

/**
 * Resize image to specified dimensions
 */
async function handleResize(id, { imageData, width, height, quality = 0.9 }) {
  try {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Create ImageBitmap from image data
    const bitmap = await createImageBitmap(imageData);

    // Draw resized image
    ctx.drawImage(bitmap, 0, 0, width, height);

    // Convert to blob
    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: quality,
    });

    // Convert to array buffer for transfer
    const arrayBuffer = await blob.arrayBuffer();

    postSuccess(id, {
      arrayBuffer,
      width,
      height,
      originalSize: imageData.size || 0,
      newSize: arrayBuffer.byteLength,
      compressionRatio: imageData.size
        ? Math.round((1 - arrayBuffer.byteLength / imageData.size) * 100)
        : 0,
    });

    bitmap.close();
  } catch (error) {
    postError(id, `Resize failed: ${error.message}`);
  }
}

/**
 * Compress image with specified quality
 */
async function handleCompress(
  id,
  { imageData, quality = 0.8, format = "jpeg" }
) {
  try {
    const bitmap = await createImageBitmap(imageData);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(bitmap, 0, 0);

    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    const blob = await canvas.convertToBlob({
      type: mimeType,
      quality: format === "jpeg" ? quality : undefined,
    });

    const arrayBuffer = await blob.arrayBuffer();

    postSuccess(id, {
      arrayBuffer,
      originalSize: imageData.size || 0,
      newSize: arrayBuffer.byteLength,
      compressionRatio: imageData.size
        ? Math.round((1 - arrayBuffer.byteLength / imageData.size) * 100)
        : 0,
      format: mimeType,
    });

    bitmap.close();
  } catch (error) {
    postError(id, `Compression failed: ${error.message}`);
  }
}

/**
 * Crop image to specified area
 */
async function handleCrop(
  id,
  { imageData, x, y, width, height, quality = 0.9 }
) {
  try {
    const bitmap = await createImageBitmap(imageData, x, y, width, height);
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(bitmap, 0, 0);

    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: quality,
    });

    const arrayBuffer = await blob.arrayBuffer();

    postSuccess(id, {
      arrayBuffer,
      width,
      height,
      cropArea: { x, y, width, height },
      newSize: arrayBuffer.byteLength,
    });

    bitmap.close();
  } catch (error) {
    postError(id, `Crop failed: ${error.message}`);
  }
}

/**
 * Process multiple images in batch
 */
async function handleBatchProcess(id, { images, operation, options = {} }) {
  try {
    const results = [];
    const total = images.length;

    for (let i = 0; i < total; i++) {
      const image = images[i];

      // Report progress
      postProgress(id, {
        current: i + 1,
        total,
        percentage: Math.round(((i + 1) / total) * 100),
        currentImage: image.name || `Image ${i + 1}`,
      });

      try {
        let result;
        switch (operation) {
          case "resize":
            result = await processResize(image.data, options);
            break;
          case "compress":
            result = await processCompress(image.data, options);
            break;
          case "thumbnail":
            result = await processThumbnail(image.data, options);
            break;
          default:
            throw new Error(`Unknown batch operation: ${operation}`);
        }

        results.push({
          index: i,
          name: image.name,
          success: true,
          result,
        });
      } catch (error) {
        results.push({
          index: i,
          name: image.name,
          success: false,
          error: error.message,
        });
      }
    }

    postSuccess(id, {
      results,
      summary: {
        total,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    });
  } catch (error) {
    postError(id, `Batch processing failed: ${error.message}`);
  }
}

/**
 * Extend canvas with intelligent padding
 */
async function handleCanvasExtend(
  id,
  { imageData, desiredHeight, paddingPct = 5 }
) {
  try {
    const bitmap = await createImageBitmap(imageData);
    const originalWidth = bitmap.width;
    const originalHeight = bitmap.height;

    if (desiredHeight <= originalHeight) {
      // Crop from center if desired height is smaller
      const cropY = Math.floor((originalHeight - desiredHeight) / 2);
      const croppedBitmap = await createImageBitmap(
        bitmap,
        0,
        cropY,
        originalWidth,
        desiredHeight
      );

      const canvas = new OffscreenCanvas(originalWidth, desiredHeight);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(croppedBitmap, 0, 0);

      const blob = await canvas.convertToBlob({
        type: "image/jpeg",
        quality: 0.95,
      });
      const arrayBuffer = await blob.arrayBuffer();

      postSuccess(id, {
        arrayBuffer,
        width: originalWidth,
        height: desiredHeight,
        operation: "crop",
      });

      bitmap.close();
      croppedBitmap.close();
      return;
    }

    // Extend canvas with intelligent padding
    const extraHeight = desiredHeight - originalHeight;
    const topPadding = Math.floor(extraHeight / 2);
    const bottomPadding = extraHeight - topPadding;

    const canvas = new OffscreenCanvas(originalWidth, desiredHeight);
    const ctx = canvas.getContext("2d");

    // Fill with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, originalWidth, desiredHeight);

    // Draw original image in center
    ctx.drawImage(bitmap, 0, topPadding);

    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: 0.95,
    });
    const arrayBuffer = await blob.arrayBuffer();

    postSuccess(id, {
      arrayBuffer,
      width: originalWidth,
      height: desiredHeight,
      operation: "extend",
      padding: { top: topPadding, bottom: bottomPadding },
    });

    bitmap.close();
  } catch (error) {
    postError(id, `Canvas extension failed: ${error.message}`);
  }
}

/**
 * Generate thumbnail with smart cropping
 */
async function handleGenerateThumbnail(
  id,
  { imageData, width = 200, height = 200, quality = 0.8 }
) {
  try {
    const bitmap = await createImageBitmap(imageData);
    const originalWidth = bitmap.width;
    const originalHeight = bitmap.height;

    // Calculate crop area for center crop
    const aspectRatio = width / height;
    const originalAspectRatio = originalWidth / originalHeight;

    let cropWidth, cropHeight, cropX, cropY;

    if (originalAspectRatio > aspectRatio) {
      // Original is wider, crop width
      cropHeight = originalHeight;
      cropWidth = originalHeight * aspectRatio;
      cropX = (originalWidth - cropWidth) / 2;
      cropY = 0;
    } else {
      // Original is taller, crop height
      cropWidth = originalWidth;
      cropHeight = originalWidth / aspectRatio;
      cropX = 0;
      cropY = (originalHeight - cropHeight) / 2;
    }

    // Create cropped bitmap
    const croppedBitmap = await createImageBitmap(
      bitmap,
      cropX,
      cropY,
      cropWidth,
      cropHeight
    );

    // Resize to thumbnail size
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(croppedBitmap, 0, 0, width, height);

    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: quality,
    });

    const arrayBuffer = await blob.arrayBuffer();

    postSuccess(id, {
      arrayBuffer,
      width,
      height,
      originalSize: imageData.size || 0,
      newSize: arrayBuffer.byteLength,
      cropArea: { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
    });

    bitmap.close();
    croppedBitmap.close();
  } catch (error) {
    postError(id, `Thumbnail generation failed: ${error.message}`);
  }
}

/**
 * Analyze image properties
 */
async function handleAnalyzeImage(id, { imageData }) {
  try {
    const bitmap = await createImageBitmap(imageData);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(bitmap, 0, 0);

    // Get image data for analysis
    const imageDataArray = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const data = imageDataArray.data;

    // Analyze image properties
    let totalBrightness = 0;
    let totalSaturation = 0;
    const colorCounts = {};

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate brightness (luminance)
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += brightness;

      // Calculate saturation
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      totalSaturation += saturation;

      // Count dominant colors (simplified)
      const colorKey = `${Math.floor(r / 32)}-${Math.floor(g / 32)}-${Math.floor(b / 32)}`;
      colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
    }

    const pixelCount = data.length / 4;
    const avgBrightness = totalBrightness / pixelCount;
    const avgSaturation = totalSaturation / pixelCount;

    // Find dominant colors
    const dominantColors = Object.entries(colorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([color, count]) => ({
        color,
        percentage: Math.round((count / pixelCount) * 100),
      }));

    postSuccess(id, {
      width: bitmap.width,
      height: bitmap.height,
      aspectRatio: bitmap.width / bitmap.height,
      avgBrightness: Math.round(avgBrightness),
      avgSaturation: Math.round(avgSaturation * 100),
      dominantColors,
      isLandscape: bitmap.width > bitmap.height,
      isPortrait: bitmap.height > bitmap.width,
      isSquare: bitmap.width === bitmap.height,
    });

    bitmap.close();
  } catch (error) {
    postError(id, `Image analysis failed: ${error.message}`);
  }
}

/**
 * Helper functions for batch processing
 */
async function processResize(imageData, { width, height, quality }) {
  const bitmap = await createImageBitmap(imageData);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await canvas.convertToBlob({
    type: "image/jpeg",
    quality: quality || 0.9,
  });

  const arrayBuffer = await blob.arrayBuffer();
  bitmap.close();

  return { arrayBuffer, width, height };
}

async function processCompress(imageData, { quality, format }) {
  const bitmap = await createImageBitmap(imageData);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(bitmap, 0, 0);

  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  const blob = await canvas.convertToBlob({
    type: mimeType,
    quality: format === "jpeg" ? quality : undefined,
  });

  const arrayBuffer = await blob.arrayBuffer();
  bitmap.close();

  return { arrayBuffer, format: mimeType };
}

async function processThumbnail(imageData, { width, height, quality }) {
  const bitmap = await createImageBitmap(imageData);
  const canvas = new OffscreenCanvas(width || 200, height || 200);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(bitmap, 0, 0, width || 200, height || 200);

  const blob = await canvas.convertToBlob({
    type: "image/jpeg",
    quality: quality || 0.8,
  });

  const arrayBuffer = await blob.arrayBuffer();
  bitmap.close();

  return { arrayBuffer, width: width || 200, height: height || 200 };
}

/**
 * Utility functions for messaging
 */
function postSuccess(id, data) {
  self.postMessage({
    id,
    success: true,
    data,
  });
}

function postError(id, error) {
  self.postMessage({
    id,
    success: false,
    error,
  });
}

function postProgress(id, progress) {
  self.postMessage({
    id,
    progress,
  });
}

// Log worker initialization
console.log("🔧 Image Processing Worker initialized");
