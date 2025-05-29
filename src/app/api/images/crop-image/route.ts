import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

interface CropImageRequest {
  imageUrl: string;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  outputWidth: number;
  outputHeight: number;
  scale: number;
  processingMethod?: "cloud" | "local";
  uploadToCloudflare?: boolean;
  originalFilename?: string;
  originalCarId?: string;
  previewImageDimensions?: {
    width: number;
    height: number;
  };
  requestedWidth?: number;
  requestedHeight?: number;
}

export async function POST(request: NextRequest) {
  console.log("🚀 Crop-image API called");

  try {
    // Test Sharp availability first
    try {
      console.log("🔍 Testing Sharp availability...");
      // Just check if Sharp is importable and has the expected methods
      if (typeof sharp !== "function") {
        throw new Error("Sharp is not a function");
      }
      console.log("✅ Sharp is available");
    } catch (sharpError) {
      console.error("❌ Sharp test failed:", sharpError);
      return NextResponse.json(
        {
          error: "Sharp library is not available",
          details:
            sharpError instanceof Error
              ? sharpError.message
              : "Unknown Sharp error",
        },
        { status: 500 }
      );
    }

    const body: CropImageRequest = await request.json();
    console.log("📝 Request body received:", {
      imageUrl: body.imageUrl?.substring(0, 100) + "...",
      cropX: body.cropX,
      cropY: body.cropY,
      cropWidth: body.cropWidth,
      cropHeight: body.cropHeight,
      outputWidth: body.outputWidth,
      outputHeight: body.outputHeight,
      scale: body.scale,
      processingMethod: body.processingMethod,
      uploadToCloudflare: body.uploadToCloudflare,
      previewImageDimensions: body.previewImageDimensions,
    });

    const {
      imageUrl,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      outputWidth,
      outputHeight,
      scale,
      processingMethod,
      uploadToCloudflare = false,
      originalFilename,
      originalCarId,
      previewImageDimensions,
      requestedWidth,
      requestedHeight,
    } = body;

    if (!imageUrl) {
      console.error("❌ No image URL provided");
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Validate crop parameters
    if (
      cropX < 0 ||
      cropY < 0 ||
      cropWidth <= 0 ||
      cropHeight <= 0 ||
      outputWidth <= 0 ||
      outputHeight <= 0 ||
      scale <= 0
    ) {
      console.error("❌ Invalid crop parameters:", {
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        outputWidth,
        outputHeight,
        scale,
      });
      return NextResponse.json(
        { error: "Invalid crop parameters" },
        { status: 400 }
      );
    }

    try {
      // Try the remote crop service if configured and requested
      const remoteServiceUrl = process.env.CANVAS_EXTENSION_SERVICE_URL;
      const shouldTryRemote = processingMethod !== "local" && remoteServiceUrl;

      console.log("🔍 Remote service decision:", {
        processingMethod,
        hasRemoteServiceUrl: !!remoteServiceUrl,
        shouldTryRemote,
        processingMethodNotLocal: processingMethod !== "local",
      });

      if (shouldTryRemote) {
        try {
          console.log("🌐 Trying remote crop service...");
          console.log("🔗 Remote service URL:", remoteServiceUrl);

          const remoteResponse = await fetch(`${remoteServiceUrl}/crop-image`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageUrl,
              cropX,
              cropY,
              cropWidth,
              cropHeight,
              outputWidth,
              outputHeight,
              scale,
              previewImageDimensions,
            }),
          });

          if (remoteResponse.ok) {
            const remoteResult = await remoteResponse.json();
            console.log("✅ Remote crop service succeeded");

            let result: any = {
              success: true,
              message: "Image cropped successfully using remote service",
              remoteServiceUsed: true,
              imageSize: remoteResult.imageSize || 0,
              actualImageDimensions: remoteResult.actualImageDimensions,
              scaledCropCoordinates: remoteResult.scaledCropCoordinates,
            };

            // Handle Cloudflare upload if requested
            if (
              uploadToCloudflare &&
              (remoteResult.imageData || remoteResult.processedImageUrl)
            ) {
              try {
                console.log("☁️ Cloud service upload - available data:", {
                  hasImageData: !!remoteResult.imageData,
                  hasProcessedImageUrl: !!remoteResult.processedImageUrl,
                  processedImageUrlType: typeof remoteResult.processedImageUrl,
                });

                let imageBuffer;

                if (remoteResult.imageData) {
                  // Convert base64 to buffer for upload
                  console.log("📦 Converting imageData (base64) to buffer...");
                  imageBuffer = Buffer.from(remoteResult.imageData, "base64");
                } else if (
                  remoteResult.processedImageUrl &&
                  remoteResult.processedImageUrl.startsWith("data:image/")
                ) {
                  // Extract base64 from data URL
                  console.log(
                    "📦 Converting processedImageUrl (data URL) to buffer..."
                  );
                  const base64Data =
                    remoteResult.processedImageUrl.split(",")[1];
                  imageBuffer = Buffer.from(base64Data, "base64");
                } else {
                  throw new Error(
                    "No valid image data found in cloud service response"
                  );
                }

                console.log(
                  "✅ Image buffer created, size:",
                  imageBuffer.length
                );

                const formData = new FormData();

                // Generate filename based on the new naming convention
                let filename;
                if (originalFilename) {
                  const nameWithoutExt = originalFilename.replace(
                    /\.[^/.]+$/,
                    ""
                  );
                  const requestedW =
                    requestedWidth || Math.round(outputWidth / (scale || 1));
                  const requestedH =
                    requestedHeight || Math.round(outputHeight / (scale || 1));

                  // Check if this is a 2x scale (or higher)
                  const scaleFactor = scale || 1;
                  if (scaleFactor >= 2) {
                    const scaleMultiplier = Math.round(scaleFactor);
                    filename = `${nameWithoutExt}-CROPPED-${requestedW}x${requestedH}-${scaleMultiplier}X.jpg`;
                  } else {
                    filename = `${nameWithoutExt}-CROPPED-${requestedW}x${requestedH}.jpg`;
                  }
                } else {
                  filename = `cropped_image_${Date.now()}.jpg`;
                }

                const file = new File([imageBuffer], filename, {
                  type: "image/jpeg",
                });

                formData.append("files", file);

                if (originalCarId) {
                  formData.append("carId", originalCarId);
                }

                formData.append(
                  "metadata",
                  JSON.stringify({
                    category: "processed",
                    processing: "image_crop",
                    originalImage: imageUrl,
                    parameters: {
                      cropX,
                      cropY,
                      cropWidth,
                      cropHeight,
                      outputWidth,
                      outputHeight,
                      scale,
                    },
                    processedAt: new Date().toISOString(),
                    remoteServiceUsed: true,
                  })
                );

                console.log("📤 Calling upload API with:", {
                  filename,
                  fileSize: imageBuffer.length,
                  carId: originalCarId,
                  hasMetadata: true,
                });

                const uploadResponse = await fetch(
                  `${request.nextUrl.origin}/api/images/upload`,
                  {
                    method: "POST",
                    body: formData,
                  }
                );

                console.log(
                  "📥 Upload response status:",
                  uploadResponse.status
                );
                console.log(
                  "📥 Upload response headers:",
                  Object.fromEntries(uploadResponse.headers.entries())
                );

                if (uploadResponse.ok) {
                  const uploadResult = await uploadResponse.json();
                  console.log("✅ Upload result:", uploadResult);
                  result.cloudflareUpload = uploadResult;
                  console.log("✅ Cloudflare upload successful");
                } else {
                  const errorText = await uploadResponse.text();
                  console.error(
                    "❌ Failed to upload to Cloudflare:",
                    uploadResponse.status,
                    errorText
                  );
                  result.cloudflareUpload = {
                    success: false,
                    error: `Upload failed: ${uploadResponse.status} - ${errorText}`,
                  };
                }
              } catch (uploadError) {
                console.error("❌ Error uploading to Cloudflare:", uploadError);
                result.cloudflareUpload = {
                  success: false,
                  error: `Upload error: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`,
                };
              }
            } else if (!uploadToCloudflare) {
              // Return the image data for preview
              if (remoteResult.processedImageUrl) {
                result.processedImageUrl = remoteResult.processedImageUrl;
              } else if (remoteResult.imageData) {
                result.imageData = remoteResult.imageData;
              }
            }

            return NextResponse.json(result);
          } else {
            console.log(
              "⚠️ Remote crop service failed:",
              remoteResponse.status
            );

            // Special handling for 404 - crop endpoint not available
            if (remoteResponse.status === 404) {
              console.log(
                "⚠️ Crop endpoint not available on remote service, falling back to local processing"
              );
            }

            throw new Error(`Remote service failed: ${remoteResponse.status}`);
          }
        } catch (remoteError) {
          console.log("⚠️ Remote service error:", remoteError);

          // If user explicitly chose cloud but it failed, don't fall back to local
          if (processingMethod === "cloud") {
            return NextResponse.json(
              {
                error: `Cloud processing failed: ${remoteError instanceof Error ? remoteError.message : "Unknown error"}. The crop-image endpoint may not be available on the remote service.`,
                suggestion: "Try using local processing method instead.",
              },
              { status: 500 }
            );
          }

          console.log("⚠️ Falling back to local Sharp processing...");
        }
      } else if (processingMethod === "local") {
        console.log("🔧 Local processing explicitly requested, using Sharp...");
      } else {
        console.log("🔧 No remote service URL configured, using Sharp...");
      }

      // Local processing using Sharp (in-memory)
      console.log("📥 Downloading image from:", imageUrl);

      let imageResponse;
      try {
        imageResponse = await fetch(imageUrl);
      } catch (fetchError) {
        console.error("❌ Failed to fetch image:", fetchError);
        throw new Error(
          `Failed to fetch image: ${fetchError instanceof Error ? fetchError.message : "Unknown fetch error"}`
        );
      }

      if (!imageResponse.ok) {
        console.error(
          "❌ Image fetch failed with status:",
          imageResponse.status
        );
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }

      console.log("📦 Converting image response to buffer...");
      let imageBuffer;
      try {
        const arrayBuffer = await imageResponse.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        console.log("✅ Image buffer created, size:", imageBuffer.length);
      } catch (bufferError) {
        console.error("❌ Failed to create buffer:", bufferError);
        throw new Error(
          `Failed to process image data: ${bufferError instanceof Error ? bufferError.message : "Unknown buffer error"}`
        );
      }

      // Get actual dimensions of the downloaded image
      console.log("📏 Getting image metadata...");
      let imageMetadata;
      try {
        imageMetadata = await sharp(imageBuffer).metadata();
      } catch (metadataError) {
        console.error("❌ Failed to get image metadata:", metadataError);
        throw new Error(
          `Failed to read image metadata: ${metadataError instanceof Error ? metadataError.message : "Unknown metadata error"}`
        );
      }

      const actualWidth = imageMetadata.width!;
      const actualHeight = imageMetadata.height!;

      console.log("📏 Actual image dimensions:", { actualWidth, actualHeight });
      console.log("📐 Original crop coordinates:", {
        cropX,
        cropY,
        cropWidth,
        cropHeight,
      });

      // Calculate scaling factor if we have preview dimensions
      let scaledCropX = cropX;
      let scaledCropY = cropY;
      let scaledCropWidth = cropWidth;
      let scaledCropHeight = cropHeight;

      if (previewImageDimensions) {
        const scaleFactorX = actualWidth / previewImageDimensions.width;
        const scaleFactorY = actualHeight / previewImageDimensions.height;

        console.log("🔢 Scale factors:", { scaleFactorX, scaleFactorY });

        scaledCropX = Math.round(cropX * scaleFactorX);
        scaledCropY = Math.round(cropY * scaleFactorY);
        scaledCropWidth = Math.round(cropWidth * scaleFactorX);
        scaledCropHeight = Math.round(cropHeight * scaleFactorY);

        console.log("📐 Scaled crop coordinates:", {
          scaledCropX,
          scaledCropY,
          scaledCropWidth,
          scaledCropHeight,
        });
      }

      // Validate scaled crop area against actual image dimensions
      if (
        scaledCropX < 0 ||
        scaledCropY < 0 ||
        scaledCropX + scaledCropWidth > actualWidth ||
        scaledCropY + scaledCropHeight > actualHeight
      ) {
        console.error("❌ Scaled crop area validation failed:", {
          actualDimensions: { actualWidth, actualHeight },
          scaledCrop: {
            scaledCropX,
            scaledCropY,
            scaledCropWidth,
            scaledCropHeight,
          },
          exceedsRight: scaledCropX + scaledCropWidth > actualWidth,
          exceedsBottom: scaledCropY + scaledCropHeight > actualHeight,
        });

        return NextResponse.json(
          {
            error: `Crop area exceeds image boundaries. Image: ${actualWidth}×${actualHeight}, Crop: ${scaledCropX},${scaledCropY} ${scaledCropWidth}×${scaledCropHeight}`,
          },
          { status: 400 }
        );
      }

      console.log("✂️ Processing image with Sharp...");

      // Process the image using Sharp (in-memory)
      let processedImageBuffer;
      try {
        processedImageBuffer = await sharp(imageBuffer)
          .extract({
            left: scaledCropX,
            top: scaledCropY,
            width: scaledCropWidth,
            height: scaledCropHeight,
          })
          .resize(outputWidth, outputHeight, {
            fit: "fill",
            kernel: sharp.kernel.lanczos3,
          })
          .jpeg({ quality: 90 })
          .toBuffer();
      } catch (sharpError) {
        console.error("❌ Sharp processing failed:", sharpError);
        throw new Error(
          `Image processing failed: ${sharpError instanceof Error ? sharpError.message : "Unknown Sharp error"}`
        );
      }

      console.log(
        "✅ Image processing completed, buffer size:",
        processedImageBuffer.length
      );

      let result: any = {
        success: true,
        message: "Image cropped successfully using Sharp",
        remoteServiceUsed: false,
        imageSize: processedImageBuffer.length,
        actualImageDimensions: { width: actualWidth, height: actualHeight },
        scaledCropCoordinates: {
          x: scaledCropX,
          y: scaledCropY,
          width: scaledCropWidth,
          height: scaledCropHeight,
        },
      };

      // Upload to Cloudflare if requested
      if (uploadToCloudflare) {
        try {
          console.log("☁️ Uploading to Cloudflare...");

          // Create FormData for the upload
          const formData = new FormData();

          // Generate filename based on the new naming convention
          let filename;
          if (originalFilename) {
            const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, "");
            const requestedW =
              requestedWidth || Math.round(outputWidth / (scale || 1));
            const requestedH =
              requestedHeight || Math.round(outputHeight / (scale || 1));

            // Check if this is a 2x scale (or higher)
            const scaleFactor = scale || 1;
            if (scaleFactor >= 2) {
              const scaleMultiplier = Math.round(scaleFactor);
              filename = `${nameWithoutExt}-CROPPED-${requestedW}x${requestedH}-${scaleMultiplier}X.jpg`;
            } else {
              filename = `${nameWithoutExt}-CROPPED-${requestedW}x${requestedH}.jpg`;
            }
          } else {
            filename = `cropped_image_${Date.now()}.jpg`;
          }

          // Create a File object from the buffer
          const file = new File([processedImageBuffer], filename, {
            type: "image/jpeg",
          });

          formData.append("files", file);

          // Add car association and metadata information
          if (originalCarId) {
            formData.append("carId", originalCarId);
          }

          formData.append(
            "metadata",
            JSON.stringify({
              category: "processed",
              processing: "image_crop",
              originalImage: imageUrl,
              parameters: {
                cropX: scaledCropX,
                cropY: scaledCropY,
                cropWidth: scaledCropWidth,
                cropHeight: scaledCropHeight,
                outputWidth,
                outputHeight,
                scale,
              },
              processedAt: new Date().toISOString(),
            })
          );

          console.log("📤 Calling upload API with:", {
            filename,
            fileSize: processedImageBuffer.length,
            carId: originalCarId,
            hasMetadata: true,
          });

          const uploadResponse = await fetch(
            `${request.nextUrl.origin}/api/images/upload`,
            {
              method: "POST",
              body: formData,
            }
          );

          console.log("📥 Upload response status:", uploadResponse.status);

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            console.log("✅ Upload result:", uploadResult);
            result.cloudflareUpload = uploadResult;
            console.log("✅ Cloudflare upload successful");
          } else {
            const errorText = await uploadResponse.text();
            console.error(
              "❌ Failed to upload to Cloudflare:",
              uploadResponse.status,
              errorText
            );
            result.cloudflareUpload = {
              success: false,
              error: `Upload failed: ${uploadResponse.status} - ${errorText}`,
            };
          }
        } catch (uploadError) {
          console.error("❌ Error uploading to Cloudflare:", uploadError);
          result.cloudflareUpload = {
            success: false,
            error: `Upload error: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`,
          };
        }
      } else {
        // Return the image as base64 for preview
        try {
          result.imageData = processedImageBuffer.toString("base64");
          console.log(
            "📤 Returning image data for preview, base64 length:",
            result.imageData.length
          );
        } catch (base64Error) {
          console.error("❌ Failed to convert to base64:", base64Error);
          throw new Error(
            `Failed to convert image to base64: ${base64Error instanceof Error ? base64Error.message : "Unknown base64 error"}`
          );
        }
      }

      console.log("🎉 Crop operation completed successfully");
      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ Error in crop-image processing:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to process image crop",
          details: error instanceof Error ? error.stack : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Error in crop-image API:", error);
    return NextResponse.json(
      {
        error: "Failed to process image crop request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
