import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Set maximum execution time
export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CompletionRequest {
  imageId: string;
  carId: string;
  imageUrl: string;
  fileName: string;
  fileSize?: number;
  selectedPromptId?: string;
  selectedModelId?: string;
}

interface CompletionResponse {
  success: boolean;
  message?: string;
  error?: string;
  imageId?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CompletionResponse>> {
  try {
    console.log("=== CLOUDFLARE UPLOAD COMPLETION HANDLER ===");

    const body: CompletionRequest = await request.json();
    const {
      imageId,
      carId,
      imageUrl,
      fileName,
      fileSize,
      selectedPromptId,
      selectedModelId,
    } = body;

    // Validate required inputs
    if (!imageId || !carId || !imageUrl || !fileName) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: imageId, carId, imageUrl, fileName",
        },
        { status: 400 }
      );
    }

    console.log(
      `Processing completion for image: ${fileName} (ID: ${imageId})`
    );

    // Connect to database
    const { db } = await connectToDatabase();

    // Create image document for database
    const imageDocument = {
      carId,
      imageId,
      fileName,
      fileSize: fileSize || 0,
      imageUrl,
      uploadedAt: new Date(),
      source: "direct-upload",
      metadata: {
        originalFileName: fileName,
        uploadMethod: "direct-cloudflare",
        timestamp: new Date().toISOString(),
      },
      analysis: null as any, // Will be populated by AI analysis if configured
    };

    // If AI analysis is requested, we'll handle it here
    if (selectedPromptId && selectedModelId) {
      try {
        // Get the prompt details
        const prompt = await db.collection("image_analysis_prompts").findOne({
          _id: new ObjectId(selectedPromptId),
        });

        if (prompt) {
          console.log(
            `Starting AI analysis for ${fileName} with prompt: ${prompt.name}`
          );

          // TODO: Integrate with existing AI analysis logic from the main upload route
          // For now, we'll just mark it as pending analysis
          imageDocument.analysis = {
            status: "pending",
            promptId: selectedPromptId,
            modelId: selectedModelId,
            startedAt: new Date(),
          };
        }
      } catch (aiError) {
        console.error("Error setting up AI analysis:", aiError);
        // Continue with upload completion even if AI analysis setup fails
      }
    }

    // Insert the image document into the database
    const result = await db.collection("car_images").insertOne(imageDocument);

    if (!result.acknowledged) {
      throw new Error("Failed to save image to database");
    }

    console.log(`Image ${fileName} completed and saved to database`);

    return NextResponse.json({
      success: true,
      message: "Upload completed successfully",
      imageId,
    });
  } catch (error) {
    console.error("Error in upload completion handler:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to complete upload",
      },
      { status: 500 }
    );
  }
}
