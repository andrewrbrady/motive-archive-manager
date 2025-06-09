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
  uploadToCloudflare?: boolean;
  originalFilename?: string;
  originalCarId?: string;
  sourceImageWidth?: number; // For high-quality processing, specify source resolution
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

    // 🐛 SIMPLIFIED DEBUG: Check sourceImageWidth
    console.log("🚨🚨🚨 BACKEND RECEIVED 🚨🚨🚨");
    console.log("sourceImageWidth:", body.sourceImageWidth);
    console.log("uploadToCloudflare:", body.uploadToCloudflare);
    console.log("scale:", body.scale);

    console.log("📝 Request body received:", {
      imageUrl: body.imageUrl?.substring(0, 100) + "...",
      cropX: body.cropX,
      cropY: body.cropY,
      cropWidth: body.cropWidth,
      cropHeight: body.cropHeight,
      outputWidth: body.outputWidth,
      outputHeight: body.outputHeight,
      scale: body.scale,
      sourceImageWidth: body.sourceImageWidth,
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
      uploadToCloudflare = false,
      originalFilename,
      originalCarId,
      previewImageDimensions,
      requestedWidth,
      requestedHeight,
      sourceImageWidth,
    } = body;

    if (!imageUrl) {
      console.error("❌ No image URL provided");
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // For Cloudflare URLs, construct the proper URL based on requirements
    let processableImageUrl = imageUrl;

    if (imageUrl.includes("imagedelivery.net")) {
      // Extract the base Cloudflare URL (account + image ID) regardless of current format
      const cloudflareMatch = imageUrl.match(
        /https:\/\/imagedelivery\.net\/([^\/]+)\/([^\/]+)/
      );

      if (cloudflareMatch) {
        const [, accountHash, imageId] = cloudflareMatch;
        const baseCloudflareUrl = `https://imagedelivery.net/${accountHash}/${imageId}`;

        // SIMPLIFIED: Use our new variants instead of flexible sizing
        const scaleMultiplier = scale || 1.0;
        if (scaleMultiplier >= 2) {
          // For 2x+ processing, use highres variant
          processableImageUrl = `${baseCloudflareUrl}/highres`;
          console.log("🎯 Using highres variant for 2x+ processing:", {
            original: imageUrl,
            variant: "highres",
            scaleMultiplier,
            processableImageUrl,
          });
        } else {
          // For 1x processing, use large variant
          processableImageUrl = `${baseCloudflareUrl}/large`;
          console.log("🔧 Using large variant for 1x processing:", {
            original: imageUrl,
            variant: "large",
            scaleMultiplier,
            processableImageUrl,
          });
        }
      } else {
        console.warn("⚠️ Could not parse Cloudflare URL format:", imageUrl);
        // Fallback: if URL doesn't match expected format, use as-is or add /public
        if (!imageUrl.includes("/public") && !imageUrl.match(/\/w=\d+/)) {
          processableImageUrl = `${imageUrl}/public`;
        }
      }
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
      // Always use Sharp for image processing - reliable on both local and Vercel
      console.log("🔧 Using Sharp for image processing");

      // Local processing using Sharp (in-memory)
      console.log("📥 Downloading image from:", processableImageUrl);
      console.log("🔍 Image URL details:", {
        url: processableImageUrl,
        length: processableImageUrl?.length,
        protocol: processableImageUrl?.split("://")[0],
        domain: processableImageUrl?.split("/")[2],
        isCloudflare: processableImageUrl?.includes("cloudflare"),
        isImageDelivery: processableImageUrl?.includes("imagedelivery"),
      });

      let imageResponse;
      try {
        // Add headers for Cloudflare Images if needed
        const fetchHeaders: Record<string, string> = {
          "User-Agent": "Mozilla/5.0 (compatible; Next.js Image Processor)",
        };

        // If it's a Cloudflare Image Delivery URL, we might need special handling
        if (processableImageUrl.includes("imagedelivery.net")) {
          console.log("🔧 Detected Cloudflare Image Delivery URL");
          // Add any necessary headers for Cloudflare
          fetchHeaders["Accept"] = "image/*";
        }

        console.log("🌐 Making fetch request with headers:", fetchHeaders);

        imageResponse = await fetch(processableImageUrl, {
          headers: fetchHeaders,
          method: "GET",
        });

        console.log("📊 Fetch response details:", {
          status: imageResponse.status,
          statusText: imageResponse.statusText,
          headers: Object.fromEntries(imageResponse.headers.entries()),
          url: imageResponse.url,
        });
      } catch (fetchError) {
        console.error("❌ Fetch error details:", {
          error: fetchError,
          message: fetchError instanceof Error ? fetchError.message : "Unknown",
          stack: fetchError instanceof Error ? fetchError.stack : undefined,
          imageUrl: imageUrl,
        });
        throw new Error(
          `Failed to fetch image from ${processableImageUrl}: ${fetchError instanceof Error ? fetchError.message : "Unknown fetch error"}`
        );
      }

      if (!imageResponse.ok) {
        console.error("❌ Image fetch failed:", {
          status: imageResponse.status,
          statusText: imageResponse.statusText,
          url: processableImageUrl,
          responseHeaders: Object.fromEntries(imageResponse.headers.entries()),
        });

        // Try to get response body for more details
        let responseBody = "";
        try {
          responseBody = await imageResponse.text();
          console.error("❌ Response body:", responseBody.substring(0, 500));
        } catch (bodyError) {
          console.error("❌ Could not read response body:", bodyError);
        }

        throw new Error(
          `Failed to download image: ${imageResponse.status} ${imageResponse.statusText}. URL: ${processableImageUrl}. Response: ${responseBody.substring(0, 200)}`
        );
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
      console.log("📐 Original crop coordinates (from frontend):", {
        cropX,
        cropY,
        cropWidth,
        cropHeight,
      });
      console.log("📱 Preview image dimensions:", previewImageDimensions);

      // Calculate scaling factor if we have preview dimensions
      let scaledCropX = cropX;
      let scaledCropY = cropY;
      let scaledCropWidth = cropWidth;
      let scaledCropHeight = cropHeight;

      if (previewImageDimensions) {
        const scaleFactorX = actualWidth / previewImageDimensions.width;
        const scaleFactorY = actualHeight / previewImageDimensions.height;

        console.log("🔢 Scale factors calculated:", {
          scaleFactorX,
          scaleFactorY,
          calculation: `${actualWidth}/${previewImageDimensions.width} = ${scaleFactorX.toFixed(3)}`,
        });

        // Apply conservative scaling with safety margin
        const conservativeFactorX = scaleFactorX * 0.999;
        const conservativeFactorY = scaleFactorY * 0.999;

        scaledCropX = Math.round(cropX * conservativeFactorX);
        scaledCropY = Math.round(cropY * conservativeFactorY);
        scaledCropWidth = Math.round(cropWidth * conservativeFactorX);
        scaledCropHeight = Math.round(cropHeight * conservativeFactorY);

        console.log(
          "📐 Scaled crop coordinates (after conservative scaling):",
          {
            scaledCropX,
            scaledCropY,
            scaledCropWidth,
            scaledCropHeight,
            conservativeFactorX: conservativeFactorX.toFixed(4),
            conservativeFactorY: conservativeFactorY.toFixed(4),
          }
        );

        // Apply additional safety bounds checking after scaling
        if (scaledCropX + scaledCropWidth > actualWidth) {
          const excess = scaledCropX + scaledCropWidth - actualWidth;
          scaledCropWidth = Math.max(100, scaledCropWidth - excess - 1);
          console.log("⚠️ Applied width safety adjustment:", {
            excess,
            newWidth: scaledCropWidth,
          });
        }

        if (scaledCropY + scaledCropHeight > actualHeight) {
          const excess = scaledCropY + scaledCropHeight - actualHeight;
          scaledCropHeight = Math.max(100, scaledCropHeight - excess - 1);
          console.log("⚠️ Applied height safety adjustment:", {
            excess,
            newHeight: scaledCropHeight,
          });
        }

        console.log("✅ Final crop coordinates after safety checks:", {
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
          previewDimensions: previewImageDimensions,
          originalCrop: { cropX, cropY, cropWidth, cropHeight },
          scaledCrop: {
            scaledCropX,
            scaledCropY,
            scaledCropWidth,
            scaledCropHeight,
          },
          validationChecks: {
            leftBound: scaledCropX >= 0,
            topBound: scaledCropY >= 0,
            rightBound: scaledCropX + scaledCropWidth <= actualWidth,
            bottomBound: scaledCropY + scaledCropHeight <= actualHeight,
          },
          exceedsRight: scaledCropX + scaledCropWidth > actualWidth,
          exceedsBottom: scaledCropY + scaledCropHeight > actualHeight,
          rightExcess: Math.max(0, scaledCropX + scaledCropWidth - actualWidth),
          bottomExcess: Math.max(
            0,
            scaledCropY + scaledCropHeight - actualHeight
          ),
        });

        return NextResponse.json(
          {
            error: `Crop area exceeds image boundaries. Image: ${actualWidth}×${actualHeight}, Crop: ${scaledCropX},${scaledCropY} ${scaledCropWidth}×${scaledCropHeight}`,
            details: {
              actualDimensions: { width: actualWidth, height: actualHeight },
              previewDimensions: previewImageDimensions,
              originalCoordinates: { cropX, cropY, cropWidth, cropHeight },
              scaledCoordinates: {
                scaledCropX,
                scaledCropY,
                scaledCropWidth,
                scaledCropHeight,
              },
            },
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
            console.log("🔍 Upload result structure:", {
              success: uploadResult.success,
              hasImages: !!uploadResult.images,
              imagesLength: uploadResult.images?.length,
              firstImageKeys: uploadResult.images?.[0]
                ? Object.keys(uploadResult.images[0])
                : [],
              firstImageId: uploadResult.images?.[0]?.id,
              uploadResultKeys: Object.keys(uploadResult),
            });

            // Extract the actual image data from the upload response
            if (
              uploadResult.success &&
              uploadResult.images &&
              uploadResult.images.length > 0
            ) {
              const uploadedImage = uploadResult.images[0];
              result.cloudflareUpload = {
                success: true,
                imageId: uploadedImage.cloudflareId,
                imageUrl: uploadedImage.url,
                filename: uploadedImage.filename,
                mongoId: uploadedImage.id, // This is the MongoDB _id from the upload response
              };
              console.log(
                "✅ Processed upload result:",
                result.cloudflareUpload
              );
              console.log("🔍 MongoDB ID extracted:", uploadedImage.id);
            } else {
              console.error(
                "❌ Upload result missing images array:",
                uploadResult
              );
              result.cloudflareUpload = uploadResult;
            }

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
      }

      // Always return the image as base64 for preview/download
      if (!uploadToCloudflare) {
        try {
          result.imageData = processedImageBuffer.toString("base64");
          result.processedImageUrl = `data:image/jpeg;base64,${result.imageData}`;
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
