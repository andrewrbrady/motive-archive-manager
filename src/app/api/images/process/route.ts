import { NextRequest, NextResponse } from "next/server";

export type ProcessingType = "canvas-extension" | "image-matte" | "image-crop";

interface ProcessImageRequest {
  imageId: string;
  processingType: ProcessingType;
  parameters: any;
}

export async function POST(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🚀 Unified image processing API called");

  try {
    const body: ProcessImageRequest = await request.json();
    console.log("📝 Request body received:", {
      imageId: body.imageId,
      processingType: body.processingType,
      parameters: Object.keys(body.parameters || {}),
      sourceImageWidth: body.parameters?.sourceImageWidth,
      scale: body.parameters?.scale,
      outputWidth: body.parameters?.outputWidth,
      outputHeight: body.parameters?.outputHeight,
    });

    const { imageId, processingType, parameters } = body;

    if (!imageId || !processingType || !parameters) {
      return NextResponse.json(
        {
          error: "Missing required fields: imageId, processingType, parameters",
        },
        { status: 400 }
      );
    }

    // Route to the appropriate existing endpoint based on processing type
    let endpoint: string;
    let payload: any;

    switch (processingType) {
      case "image-crop":
        endpoint = "/api/images/crop-image";

        // SIMPLIFIED: Apply scaling here in unified API
        const baseOutputWidth = parseInt(parameters.outputWidth) || 1080;
        const baseOutputHeight = parseInt(parameters.outputHeight) || 1920;
        const scaleMultiplier =
          parameters.scaleMultiplier || parameters.scale || 1.0;

        payload = {
          imageUrl: parameters.imageUrl,
          cropX: parameters.cropArea?.x || 0,
          cropY: parameters.cropArea?.y || 0,
          cropWidth: parameters.cropArea?.width || 100,
          cropHeight: parameters.cropArea?.height || 100,
          outputWidth: Math.round(baseOutputWidth * scaleMultiplier),
          outputHeight: Math.round(baseOutputHeight * scaleMultiplier),
          scale: parameters.scale || 1.0,
          uploadToCloudflare: true,
          originalFilename: parameters.originalFilename,
          originalCarId: parameters.originalCarId,
          sourceImageWidth: parameters.sourceImageWidth, // Pass through high-res source width
          previewImageDimensions: parameters.previewImageDimensions, // Pass through preview dimensions for coordinate scaling
          scaleMultiplier: scaleMultiplier, // Pass through for filename generation
        };
        break;

      case "canvas-extension":
        endpoint = "/api/images/extend-canvas";

        // SIMPLIFIED: Apply scaling here in unified API for canvas extension
        // NOTE: Only use desiredHeight - do NOT send requestedWidth/Height as they cause distortion
        const baseDesiredHeight = parseInt(parameters.desiredHeight) || 1350;
        const canvasScaleMultiplier =
          parameters.scaleMultiplier || parameters.scale || 1.0;

        payload = {
          imageUrl: parameters.imageUrl,
          desiredHeight: Math.round(baseDesiredHeight * canvasScaleMultiplier),
          paddingPct: parseFloat(parameters.paddingPercentage) || 0.05,
          whiteThresh: parseInt(parameters.whiteThreshold) || 90,
          uploadToCloudflare: true,
          originalFilename: parameters.originalFilename,
          originalCarId: parameters.originalCarId,
          scaleMultiplier: canvasScaleMultiplier,
          previewImageDimensions: parameters.previewImageDimensions,
          // DO NOT SEND requestedWidth/requestedHeight - let canvas extension work naturally!
        };
        break;

      case "image-matte":
        endpoint = "/api/images/create-matte";

        // FIXED: Use canvasWidth/Height for both processing and filename generation
        // Apply scaling here in unified API for image matte
        const baseCanvasWidth = parseInt(parameters.canvasWidth) || 1827;
        const baseCanvasHeight = parseInt(parameters.canvasHeight) || 1080;
        const matteScaleMultiplier =
          parameters.scaleMultiplier || parameters.scale || 1.0;

        payload = {
          imageUrl: parameters.imageUrl,
          canvasWidth: Math.round(baseCanvasWidth * matteScaleMultiplier),
          canvasHeight: Math.round(baseCanvasHeight * matteScaleMultiplier),
          paddingPercent: parseFloat(parameters.paddingPercentage) || 0,
          matteColor: parameters.matteColor || "#000000",
          uploadToCloudflare: true,
          originalFilename: parameters.originalFilename,
          originalCarId: parameters.originalCarId,
          requestedWidth: Math.round(baseCanvasWidth * matteScaleMultiplier),
          requestedHeight: Math.round(baseCanvasHeight * matteScaleMultiplier),
          scaleMultiplier: matteScaleMultiplier,
        };
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported processing type: ${processingType}` },
          { status: 400 }
        );
    }

    console.log(`🔄 Routing to ${endpoint} with payload:`, {
      ...payload,
      imageUrl: payload.imageUrl?.substring(0, 50) + "..." || "NO URL",
    });

    // Make internal API call to the specific endpoint
    // For development, always use localhost. For production, use the request's origin
    const baseUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    console.log(
      `🔗 Making request to: ${baseUrl}${endpoint} (NODE_ENV: ${process.env.NODE_ENV})`
    );
    console.log(
      `🖼️ Image URL being passed: ${payload.imageUrl?.substring(0, 100)}...`
    );

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward any authorization headers
        ...(request.headers.get("authorization") && {
          authorization: request.headers.get("authorization")!,
        }),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ${endpoint} failed:`, response.status, errorText);
      return NextResponse.json(
        { error: `Processing failed: ${errorText}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log(`✅ ${endpoint} succeeded with result:`, {
      success: result.success,
      hasCloudflareUpload: !!result.cloudflareUpload,
      cloudflareUploadSuccess: result.cloudflareUpload?.success,
      resultKeys: Object.keys(result),
      cloudflareUploadKeys: result.cloudflareUpload
        ? Object.keys(result.cloudflareUpload)
        : [],
    });

    // Extract mongoId from cloudflareUpload object if it exists
    const mongoId =
      result.cloudflareUpload?.mongoId || result.mongoId || result.imageId;
    const processedImageUrl =
      result.cloudflareUpload?.imageUrl ||
      result.processedImageUrl ||
      result.imageUrl;
    const filename =
      result.cloudflareUpload?.filename ||
      result.filename ||
      parameters.originalFilename ||
      "processed";

    console.log("🔍 Unified Process API - Extracted values:", {
      processingType,
      mongoId,
      processedImageUrl,
      filename,
      cloudflareUploadExists: !!result.cloudflareUpload,
      cloudflareUploadMongoId: result.cloudflareUpload?.mongoId,
      originalImageId: imageId,
      scaleMultiplier: parameters.scaleMultiplier,
      hasPreviewImageDimensions: !!parameters.previewImageDimensions,
      fullResult: JSON.stringify(result, null, 2),
    });

    if (!mongoId) {
      console.error("❌ Unified Process API - No mongoId found!", {
        result,
        cloudflareUpload: result.cloudflareUpload,
        availableFields: {
          resultMongoId: result.mongoId,
          resultImageId: result.imageId,
          cloudflareMongoId: result.cloudflareUpload?.mongoId,
        },
      });
    }

    // Validate that we have a mongoId before proceeding
    if (!mongoId) {
      console.error("❌ Unified Process API - Cannot proceed without mongoId");
      return NextResponse.json(
        {
          error: "Processing failed: Unable to get processed image ID",
          details: {
            endpoint,
            resultStructure: Object.keys(result),
            cloudflareUpload: result.cloudflareUpload,
          },
        },
        { status: 500 }
      );
    }

    console.log(
      "✅ Unified Process API - Successfully extracted mongoId:",
      mongoId
    );

    // Return a standardized response format that matches what the hook expects
    return NextResponse.json({
      success: true,
      processedImageUrl,
      originalImage: {
        _id: imageId,
        url: parameters.imageUrl,
        filename: parameters.originalFilename || "unknown",
        metadata: {},
        carId: parameters.originalCarId || "",
      },
      processedImage: {
        _id: mongoId,
        url: processedImageUrl,
        filename,
        metadata: result.metadata || {},
        carId: parameters.originalCarId || "",
      },
      processingResult: result,
    });
  } catch (error) {
    console.error("❌ Unified processing error:", error);
    return NextResponse.json(
      {
        error: "Processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
