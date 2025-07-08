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
  createdAt: string;
  updatedAt: string;
}

interface Car {
  _id: ObjectId;
  imageIds: ObjectId[];
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
  imageIds: ObjectId[];
  updatedAt: string;
}

interface Project {
  _id: ObjectId;
  imageIds: ObjectId[];
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

    console.log(`🔍 Analyzing image: ${fileName}`);

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
        console.log(`Starting AI analysis for ${fileName} (car: ${carId})`);

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
            }),
          }
        );

        if (analysisResponse.ok) {
          const result = await analysisResponse.json();
          analysisResult = result.analysis;
          console.log(`AI analysis completed for ${fileName}:`, analysisResult);
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

    if (analysisResult) {
      metadata = analysisResult;
    } else if (customMetadata) {
      try {
        const parsedMetadata = JSON.parse(customMetadata);

        // Extract projectId from metadata if present
        if (parsedMetadata.projectId) {
          extractedProjectId = parsedMetadata.projectId;
          console.log(`📋 Extracted projectId: ${extractedProjectId}`);

          // Remove projectId from metadata since it will be a top-level field
          const { projectId, ...cleanMetadata } = parsedMetadata;
          metadata = cleanMetadata;
        } else {
          metadata = parsedMetadata;
        }
      } catch (error) {
        console.error(`Failed to parse custom metadata:`, error);
      }
    }

    // Create image document
    const imageDoc: Omit<Image, "_id"> = {
      cloudflareId,
      url: imageUrl,
      filename: fileName,
      metadata,
      carId: carId ? new ObjectId(carId) : null,
      projectId: extractedProjectId ? new ObjectId(extractedProjectId) : null,
      createdAt: now,
      updatedAt: now,
    };

    // Insert image
    const imageResult = await collections.images.insertOne(imageDoc as Image);
    const imageId = imageResult.insertedId;

    console.log(`✅ Image inserted with ID: ${imageId}`);

    // Update car, project, or gallery if applicable
    if (carId) {
      console.log(`🚗 Associating image ${imageId} with car ${carId}`);
      await collections.cars.updateOne(
        { _id: new ObjectId(carId) },
        {
          $push: { imageIds: imageId },
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
            $push: { imageIds: imageId },
            $set: { updatedAt: now },
          }
        );

        if (projectUpdateResult.matchedCount === 0) {
          console.error(`❌ Project ${extractedProjectId} not found!`);
        } else {
          console.log(`✅ Associated image with project ${extractedProjectId}`);
        }
      } catch (error) {
        console.error(
          `❌ Failed to update project ${extractedProjectId}:`,
          error
        );
      }
    } else {
      console.log(`📁 Adding image ${imageId} to general gallery`);
      // Add to general gallery (store as ObjectId, not string)
      await collections.galleries.updateOne(
        {},
        {
          $push: { imageIds: imageId },
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
