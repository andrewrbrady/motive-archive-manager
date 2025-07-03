import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId, Collection } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

export const maxDuration = 300;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Image {
  _id: ObjectId;
  cloudflareId: string;
  url: string;
  filename: string;
  metadata: any;
  carId: ObjectId | null;
  projectId: ObjectId | null;
  locationId?: ObjectId;
  createdAt: string;
  updatedAt: string;
}

interface Car {
  _id: ObjectId;
  imageIds: string[];
  updatedAt: string;
  make: string;
  model: string;
  year: string;
  color: string;
  engine: string;
  condition: string;
  description: string;
}

interface Gallery {
  _id: ObjectId;
  imageIds: string[];
  updatedAt: string;
}

interface Project {
  _id: ObjectId;
  imageIds: string[];
  updatedAt: string;
}

interface Collections {
  images: Collection<Image>;
  cars: Collection<Car>;
  galleries: Collection<Gallery>;
  projects: Collection<Project>;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const cloudflareId = formData.get("cloudflareId") as string;
    const imageUrl = formData.get("imageUrl") as string;
    const fileName = formData.get("fileName") as string;
    const selectedPromptId = formData.get("selectedPromptId") as string;
    const selectedModelId = formData.get("selectedModelId") as string;
    const carId = formData.get("carId") as string;
    const vehicleInfo = formData.get("vehicleInfo") as string;
    const customMetadata = formData.get("metadata") as string;

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🔍 Analyzing image: ${fileName}`);

    if (!cloudflareId || !imageUrl || !fileName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Extract authorization header for passing to OpenAI endpoint
    const authHeader = request.headers.get("authorization") || "";

    // Initialize MongoDB connection
    const db = await getDatabase();
    const collections: Collections = {
      images: db.collection<Image>("images"),
      cars: db.collection<Car>("cars"),
      galleries: db.collection<Gallery>("galleries"),
      projects: db.collection<Project>("projects"),
    };

    const now = new Date().toISOString();
    let analysisResult = null;

    // Determine if we should perform analysis
    // - Always analyze for car uploads (when carId is provided)
    // - Also analyze general uploads when prompt/model are explicitly provided
    const shouldAnalyze =
      !!carId ||
      (!!selectedPromptId &&
        selectedPromptId !== "default" &&
        selectedPromptId !== "__default__") ||
      (!!selectedModelId && selectedModelId !== "none");
    let finalPromptId: string | undefined = selectedPromptId || undefined;
    let finalModelId: string | undefined = selectedModelId || undefined;

    // Handle default values from frontend
    if (selectedPromptId === "default" || selectedPromptId === "__default__")
      finalPromptId = undefined;
    if (selectedModelId === "none") finalModelId = undefined;

    // Use defaults for car uploads when nothing is specified
    if (carId && !finalModelId) {
      const { IMAGE_ANALYSIS_CONFIG } = await import(
        "@/constants/image-analysis"
      );
      const defaultModel = IMAGE_ANALYSIS_CONFIG.availableModels.find(
        (m) => m.isDefault
      );
      finalModelId = defaultModel?.id || "gpt-4o-mini";
      console.log(
        `🤖 Using default model for car image analysis: ${finalModelId}`
      );
    }

    if (shouldAnalyze) {
      console.log(
        `🔍 Analyzing ${carId ? "car" : "general"} image with model: ${finalModelId}, prompt: ${finalPromptId || "base prompt"}`
      );
    }

    // Perform AI analysis for car uploads or when explicitly requested
    if (shouldAnalyze && finalModelId) {
      try {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Starting AI analysis for ${fileName} (car: ${carId})`);

        // Extract imageContext from metadata if present
        let parsedCustomMetadata = {};
        let imageContext = "";
        if (customMetadata) {
          try {
            parsedCustomMetadata = JSON.parse(customMetadata);
            imageContext = (parsedCustomMetadata as any)?.imageContext || "";
          } catch (error) {
            console.error(
              "Failed to parse custom metadata for context:",
              error
            );
          }
        }

        // Call OpenAI analyze endpoint directly with proper auth header
        const analysisResponse = await fetch(
          `${request.nextUrl.origin}/api/openai/analyze-image`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(authHeader && { Authorization: authHeader }),
            },
            body: JSON.stringify({
              imageUrl,
              vehicleInfo: vehicleInfo ? JSON.parse(vehicleInfo) : undefined,
              promptId: finalPromptId,
              modelId: finalModelId,
              imageContext: imageContext || undefined,
            }),
          }
        );

        if (analysisResponse.ok) {
          const result = await analysisResponse.json();
          analysisResult = result.analysis;
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`AI analysis completed for ${fileName}:`, analysisResult);
        } else {
          const errorText = await analysisResponse.text();
          console.error(
            `AI analysis HTTP error for ${fileName}: ${analysisResponse.status} - ${errorText}`
          );
        }
      } catch (error) {
        console.error(`AI analysis failed for ${fileName}:`, error);
        // Continue without analysis result
      }
    } else if (!shouldAnalyze) {
      console.log(
        `⏭️ Skipping analysis for ${fileName} - no analysis settings provided`
      );
    }

    // Prepare metadata and extract projectId if present
    let metadata = {};
    let extractedProjectId: string | null = null;

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🔍 DEBUG: Metadata processing for ${fileName}`);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`  - analysisResult exists: ${!!analysisResult}`);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`  - customMetadata exists: ${!!customMetadata}`);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`  - customMetadata value: ${customMetadata}`);

    // FIRST: Extract projectId and locationId from custom metadata if present
    let originalMetadata = {};
    let extractedLocationId: string | null = null;
    if (customMetadata) {
      try {
        const parsedMetadata = JSON.parse(customMetadata);
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`  - parsedMetadata:`, parsedMetadata);

        // Extract projectId and locationId from metadata if present
        if (parsedMetadata.projectId) {
          extractedProjectId = parsedMetadata.projectId;
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`📋 Extracted projectId: ${extractedProjectId}`);
        }

        if (parsedMetadata.locationId) {
          extractedLocationId = parsedMetadata.locationId;
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`📍 Extracted locationId: ${extractedLocationId}`);
        }

        // Remove projectId and locationId from metadata since they will be top-level fields
        const { projectId, locationId, ...cleanMetadata } = parsedMetadata;
        originalMetadata = cleanMetadata;
      } catch (error) {
        console.error(`Failed to parse custom metadata:`, error);
        console.error(`  - Raw customMetadata: ${customMetadata}`);
      }
    }

    // SECOND: Merge analysis results with original metadata (preserving both)
    if (analysisResult) {
      metadata = {
        ...originalMetadata, // Keep original metadata (category, context, etc.)
        ...analysisResult, // Add AI analysis results
      };
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`✅ Merged analysis results with original metadata`);
    } else {
      metadata = originalMetadata;
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`📁 Using original metadata only (no analysis)`);
    }

    // Create image document
    const imageDoc: Omit<Image, "_id"> = {
      cloudflareId,
      url: imageUrl,
      filename: fileName,
      metadata,
      carId: carId ? new ObjectId(carId) : null,
      projectId: extractedProjectId ? new ObjectId(extractedProjectId) : null,
      ...(extractedLocationId && {
        locationId: new ObjectId(extractedLocationId),
      }),
      createdAt: now,
      updatedAt: now,
    };

    // Insert image
    const imageResult = await collections.images.insertOne(imageDoc as Image);
    const imageId = imageResult.insertedId;

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`✅ Image inserted with ID: ${imageId}`);

    // Update car, project, or gallery if applicable
    if (carId) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🚗 Associating image ${imageId} with car ${carId}`);
      await collections.cars.updateOne(
        { _id: new ObjectId(carId) },
        {
          $push: { imageIds: imageId.toString() },
          $set: { updatedAt: now },
        }
      );
    } else if (extractedProjectId) {
      console.log(
        `📋 Associating image ${imageId} with project ${extractedProjectId}`
      );

      try {
        const projectUpdateResult = await collections.projects.updateOne(
          { _id: new ObjectId(extractedProjectId) },
          {
            $push: { imageIds: imageId.toString() },
            $set: { updatedAt: now },
          }
        );

        if (projectUpdateResult.matchedCount === 0) {
          console.error(`❌ Project ${extractedProjectId} not found!`);
        } else {
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`✅ Associated image with project ${extractedProjectId}`);
        }
      } catch (error) {
        console.error(
          `❌ Failed to update project ${extractedProjectId}:`,
          error
        );
      }
    } else {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`📁 Adding image ${imageId} to general gallery`);
      // Add to general gallery
      await collections.galleries.updateOne(
        {},
        {
          $push: { imageIds: imageId.toString() },
          $set: { updatedAt: now },
        },
        { upsert: true }
      );
    }

    return NextResponse.json({
      success: true,
      imageId: imageId.toString(),
      cloudflareId,
      imageUrl,
      metadata,
    });
  } catch (error) {
    console.error("Analysis endpoint error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
