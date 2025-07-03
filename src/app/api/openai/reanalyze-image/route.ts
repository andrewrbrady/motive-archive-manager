import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const maxDuration = 90;

export async function POST(request: NextRequest) {
  try {
    const { imageId, carId, promptId, modelId } = await request.json();

    if (!imageId) {
      return NextResponse.json(
        { error: "No image ID provided" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const db = await getDatabase();
    const imagesCollection = db.collection("images");
    const carsCollection = db.collection("cars");

    // Find the image
    const image = await imagesCollection.findOne({
      $or: [{ _id: new ObjectId(imageId) }, { cloudflareId: imageId }],
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Get car information for context
    let vehicleInfo = null;
    if (image.carId || carId) {
      const car = await carsCollection.findOne({
        _id: new ObjectId(image.carId || carId),
      });

      if (car) {
        vehicleInfo = {
          make: car.make,
          model: car.model,
          year: car.year,
          color: car.color,
          engine: car.engine,
          condition: car.condition,
          additionalContext: car.description,
        };
      }
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Re-analyzing image: ${image.cloudflareId}`);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Current metadata:", JSON.stringify(image.metadata, null, 2));
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Using prompt ID:", promptId || "default");
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Using model ID:", modelId || "default");

    // Prepare request body for analysis
    const analysisRequestBody: any = {
      imageUrl: image.url,
      vehicleInfo,
    };

    // Add custom prompt and model if provided
    if (promptId) {
      analysisRequestBody.promptId = promptId;
    }
    if (modelId) {
      analysisRequestBody.modelId = modelId;
    }

    // Call the enhanced analysis endpoint
    const analysisResponse = await fetch(
      `${request.nextUrl.origin}/api/openai/analyze-image`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(analysisRequestBody),
      }
    );

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      throw new Error(`Analysis failed: ${errorText}`);
    }

    const analysisResult = await analysisResponse.json();

    if (!analysisResult.analysis) {
      throw new Error("No analysis result received");
    }

    // Update the image metadata in MongoDB
    const updatedMetadata = {
      ...image.metadata,
      angle: analysisResult.analysis?.angle || "",
      view: analysisResult.analysis?.view || "",
      movement: analysisResult.analysis?.movement || "",
      tod: analysisResult.analysis?.tod || "",
      side: analysisResult.analysis?.side || "",
      description: analysisResult.analysis?.description || "",
      aiAnalysis: analysisResult.analysis,
      reanalyzedAt: new Date().toISOString(),
      analysisVersion: "enhanced-validation-v2",
      promptId: promptId || null,
      modelId: modelId || null,
    };

    // Update the MongoDB document
    const updateResult = await imagesCollection.updateOne(
      { _id: image._id },
      {
        $set: {
          metadata: updatedMetadata,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error("Failed to update image metadata");
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Successfully re-analyzed image with enhanced validation");

    return NextResponse.json({
      success: true,
      imageId: image._id,
      cloudflareId: image.cloudflareId,
      previousMetadata: image.metadata,
      newMetadata: updatedMetadata,
      analysis: analysisResult.analysis,
    });
  } catch (error) {
    console.error("Error re-analyzing image:", error);

    return NextResponse.json(
      {
        error: "Failed to re-analyze image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
