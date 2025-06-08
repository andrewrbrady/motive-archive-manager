import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId, Collection } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { analyzeImage } from "@/lib/imageAnalyzer";

// Set maximum execution time to 300 seconds (5 minutes)
export const maxDuration = 300;
export const runtime = "nodejs";

// Increase body size limit for Vercel (max 4.5MB for Hobby/Pro)
export const dynamic = "force-dynamic";
export const maxBodySize = "10mb";

// Ensure environment variables are set
if (
  !process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID ||
  !process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN
) {
  throw new Error("Cloudflare credentials not set in environment variables");
}

interface CloudflareImage {
  id: string;
  filename: string;
  uploaded: string;
  requireSignedURLs: boolean;
  variants: string[];
}

interface CloudflareResponse {
  result: {
    images: CloudflareImage[];
  };
  success: boolean;
  errors: Array<{
    code: number;
    message: string;
  }>;
}

interface Image {
  _id: ObjectId;
  cloudflareId: string;
  url: string;
  filename: string;
  metadata: any;
  carId: ObjectId;
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

// Add type for MongoDB collections
interface Collections {
  images: Collection<Image>;
  cars: Collection<Car>;
  galleries: Collection<Gallery>;
}

// Batch size for MongoDB operations
const BATCH_SIZE = 50;
// Parallel upload configuration
const CLOUDFLARE_UPLOAD_CONCURRENCY = 4;
const ANALYSIS_RETRY_COUNT = 2;
const ANALYSIS_CONCURRENCY = 4;

export async function GET() {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    const result = (await response.json()) as CloudflareResponse;

    if (!result.success) {
      return NextResponse.json(
        { error: result.errors[0].message },
        { status: 400 }
      );
    }

    // Transform the response to return only the image URLs without the /public suffix
    const images = result.result.images.map((image) =>
      image.variants[0].replace(/\/public$/, "")
    );

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Error fetching images from Cloudflare:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const customStream = new TransformStream();
  const writer = customStream.writable.getWriter();
  let mongoClient: MongoClient | undefined;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  const sendProgress = async (data: any) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const initMongoConnection = async (): Promise<Collections> => {
    while (retryCount < MAX_RETRIES) {
      try {
        const db = await getDatabase();

        return {
          images: db.collection<Image>("images"),
          cars: db.collection<Car>("cars"),
          galleries: db.collection<Gallery>("galleries"),
        };
      } catch (error) {
        retryCount++;
        console.error(
          `MongoDB connection attempt ${retryCount} failed:`,
          error
        );

        if (retryCount >= MAX_RETRIES) {
          throw new Error(
            `Failed to connect to MongoDB after ${MAX_RETRIES} attempts: ${error}`
          );
        }

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, retryCount) * 1000)
        );
      }
    }

    throw new Error("Failed to establish MongoDB connection");
  };

  // Helper function to process a single image
  const processFile = async (
    file: File,
    i: number,
    carId: string,
    vehicleInfo: any,
    collections: Collections,
    now: string,
    selectedPromptId?: string,
    selectedModelId?: string
  ) => {
    const fileId = `${i}-${file.name}`;
    try {
      await sendProgress({
        fileId,
        fileName: file.name,
        status: "uploading",
        progress: 0,
        currentStep: "Starting upload to Cloudflare",
      });

      // Upload to Cloudflare
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("requireSignedURLs", "false");

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
          },
          body: uploadFormData,
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to upload to Cloudflare: ${response.statusText}`
        );
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(
          `Cloudflare API error: ${result.errors[0]?.message || "Unknown error"}`
        );
      }

      const imageUrl = result.result.variants[0].replace(/\/public$/, "");

      // Update progress for analysis phase
      await sendProgress({
        fileId,
        fileName: file.name,
        status: "analyzing",
        progress: 75,
        currentStep: "Analyzing image with AI",
      });

      // Try to analyze the image with retries
      let imageAnalysis = null;
      let analysisError = null;

      for (let attempt = 0; attempt <= ANALYSIS_RETRY_COUNT; attempt++) {
        try {
          if (attempt > 0) {
            await sendProgress({
              fileId,
              fileName: file.name,
              status: "analyzing",
              progress: 75,
              currentStep: `Retry #${attempt}: Analyzing image with AI`,
            });
          }

          const analysisResponse = await fetch(
            `${request.nextUrl.origin}/api/openai/analyze-image`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                imageUrl,
                vehicleInfo,
                promptId: selectedPromptId,
                modelId: selectedModelId,
              }),
              // Adding a longer timeout for the analysis request
              signal: AbortSignal.timeout(60000), // 60 seconds timeout
            }
          );

          if (!analysisResponse.ok) {
            throw new Error(`Analysis failed: ${analysisResponse.statusText}`);
          }

          const { analysis } = await analysisResponse.json();
          imageAnalysis = analysis;
          // [REMOVED] // [REMOVED] console.log(`Image analysis result for ${file.name}:`, imageAnalysis);
          break; // Success, exit retry loop
        } catch (error) {
          analysisError = error;
          console.error(
            `OpenAI analysis attempt ${attempt + 1} failed:`,
            error
          );

          if (attempt === ANALYSIS_RETRY_COUNT) {
            console.warn(`All analysis attempts failed for image ${file.name}`);
          } else {
            // Wait before retry
            await new Promise((resolve) =>
              setTimeout(resolve, 2000 * (attempt + 1))
            );
          }
        }
      }

      // Create image document
      const imageDoc = {
        _id: new ObjectId(),
        cloudflareId: result.result.id,
        url: imageUrl,
        filename: file.name,
        metadata: {
          category: "exterior",
          isPrimary: false,
          vehicleInfo,
          ...(imageAnalysis || {}),
          aiAnalysis: imageAnalysis,
          analysisStatus: imageAnalysis ? "success" : "failed",
          analysisError: analysisError
            ? analysisError instanceof Error
              ? analysisError.message
              : String(analysisError)
            : null,
        },
        carId: new ObjectId(carId),
        createdAt: now,
        updatedAt: now,
      };

      // Send complete progress
      await sendProgress({
        fileId,
        fileName: file.name,
        status: "complete",
        progress: 100,
        currentStep: imageAnalysis
          ? "Upload and analysis complete"
          : "Upload complete, analysis failed",
        imageUrl,
        metadata: imageDoc.metadata,
      });

      return imageDoc;
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      await sendProgress({
        fileId,
        fileName: file.name,
        status: "error",
        progress: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  };

  // Function to process batch of files in parallel
  const processBatch = async (
    batch: File[],
    startIndex: number,
    carId: string,
    vehicleInfo: any,
    collections: Collections,
    now: string,
    selectedPromptId?: string,
    selectedModelId?: string
  ) => {
    try {
      console.log(
        `Processing batch of ${batch.length} images (starting at index ${startIndex})`
      );

      // Process each file in the batch concurrently
      const imageDocPromises = batch.map((file, i) =>
        processFile(
          file,
          startIndex + i,
          carId,
          vehicleInfo,
          collections,
          now,
          selectedPromptId,
          selectedModelId
        )
      );

      // Await all promises, handle errors individually
      const results = await Promise.allSettled(imageDocPromises);

      // Extract successful results
      const successfulDocs = results
        .filter(
          (result): result is PromiseFulfilledResult<any> =>
            result.status === "fulfilled"
        )
        .map((result) => result.value);

      console.log(
        `Successfully processed ${successfulDocs.length} of ${batch.length} images in batch`
      );

      if (successfulDocs.length > 0) {
        // Insert successful images
        const insertResult =
          await collections.images.insertMany(successfulDocs);

        if (!insertResult.acknowledged) {
          throw new Error("Failed to insert images into database");
        }

        // Update car document with image IDs
        const imageIds = successfulDocs.map((doc) => doc._id);
        const updateResult = await collections.cars.updateOne(
          { _id: new ObjectId(carId) },
          {
            $push: { imageIds: { $each: imageIds } },
            $set: { updatedAt: now },
          }
        );

        if (!updateResult.acknowledged) {
          // If car update fails, try to rollback image insertions
          console.error(
            "Car update failed, attempting to rollback image insertions"
          );
          try {
            await collections.images.deleteMany({
              _id: { $in: imageIds },
            });
          } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError);
          }
          throw new Error("Failed to update car with new images");
        }

        return successfulDocs;
      }

      return [];
    } catch (error) {
      console.error(
        `Error processing batch starting at index ${startIndex}:`,
        error
      );
      throw error;
    }
  };

  const processImages = async () => {
    let mongoClient;
    try {
      const formData = await request.formData();
      const carId = formData.get("carId") as string;
      const fileCount = parseInt(formData.get("fileCount") as string);
      const selectedPromptId = formData.get("selectedPromptId") as string;
      const selectedModelId = formData.get("selectedModelId") as string;

      if (!carId) {
        await sendProgress({ error: "No car ID provided" });
        return;
      }

      // Initialize MongoDB connection with retry logic
      const collections = await initMongoConnection();

      // Fetch car information first
      const car = await collections.cars.findOne({ _id: new ObjectId(carId) });
      if (!car) {
        throw new Error("Car not found");
      }

      // Extract vehicle info for analysis
      const vehicleInfo = {
        make: car.make,
        model: car.model,
        year: car.year,
        color: car.color,
        engine: car.engine,
        condition: car.condition,
        additionalContext: car.description,
      };

      // Collect all files into an array for better processing
      const files: File[] = [];
      for (let i = 0; i < fileCount; i++) {
        const file = formData.get(`file${i}`) as File;
        if (file) {
          files.push(file);
        } else {
          // [REMOVED] // [REMOVED] console.log(`File ${i} not found in FormData`);
        }
      }

      const now = new Date().toISOString();
      const results = [];

      // Process files in batches for parallel uploading
      for (let i = 0; i < files.length; i += CLOUDFLARE_UPLOAD_CONCURRENCY) {
        const batch = files.slice(i, i + CLOUDFLARE_UPLOAD_CONCURRENCY);
        try {
          const batchResults = await processBatch(
            batch,
            i,
            carId,
            vehicleInfo,
            collections,
            now,
            selectedPromptId,
            selectedModelId
          );
          results.push(...batchResults);
        } catch (error) {
          console.error(
            `Error in batch ${i / CLOUDFLARE_UPLOAD_CONCURRENCY + 1}:`,
            error
          );
          // Continue with next batch even if this one failed
        }
      }

      // Final status update
      await sendProgress({
        type: "complete",
        success: true,
        totalFiles: fileCount,
        successfulUploads: results.length,
        failedUploads: fileCount - results.length,
      });
    } catch (error) {
      console.error("Error processing images:", error);
      await sendProgress({
        type: "error",
        error:
          error instanceof Error ? error.message : "Failed to process images",
      });
    } finally {
      await writer.close();
    }
  };

  processImages();

  return new Response(customStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function DELETE(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { imageIds = [], cloudflareIds = [] } = requestData;

    // [REMOVED] // [REMOVED] console.log("======== CLOUDFLARE DIRECT DELETE API CALLED ========");
    // [REMOVED] // [REMOVED] console.log("Request URL:", request.url);
    console.log(
      "Request headers:",
      Object.fromEntries([...request.headers.entries()])
    );
    // [REMOVED] // [REMOVED] console.log("DELETE body:", JSON.stringify(requestData, null, 2));

    if (imageIds.length === 0 && cloudflareIds.length === 0) {
      return NextResponse.json(
        { error: "No image IDs provided for deletion" },
        { status: 400 }
      );
    }

    // 1. Delete from Cloudflare first
    const deletedFromCloudflare = [];
    const cloudflareErrors = [];

    // Combine all IDs for maximum matching potential
    const allPossibleIds = [...new Set([...imageIds, ...cloudflareIds])];
    console.log(
      `Processing ${allPossibleIds.length} unique IDs for deletion:`,
      allPossibleIds
    );

    for (const id of allPossibleIds) {
      try {
        // [REMOVED] // [REMOVED] console.log(`Attempting to delete image ${id} from Cloudflare`);
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1/${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
            },
          }
        );

        const result = await response.json();

        if (result.success) {
          // [REMOVED] // [REMOVED] console.log(`Successfully deleted image ${id} from Cloudflare`);
          deletedFromCloudflare.push(id);
        } else {
          console.error(
            `Failed to delete image ${id} from Cloudflare:`,
            result.errors
          );
          cloudflareErrors.push({
            id,
            errors: result.errors,
          });
        }
      } catch (error) {
        console.error(`Error deleting image ${id} from Cloudflare:`, error);
        cloudflareErrors.push({
          id,
          error: String(error),
        });
      }
    }

    // 2. Delete from MongoDB
    const db = await getDatabase();
    const imagesCollection = db.collection("images");
    const carsCollection = db.collection("cars");
    const galleriesCollection = db.collection("galleries");

    // First check if these are UUIDs rather than ObjectIds (Cloudflare IDs)
    // Handle both ObjectIds and string IDs to maximize compatibility
    // [REMOVED] // [REMOVED] console.log("Building query to match MongoDB documents...");

    // Try multiple query strategies for maximum effectiveness
    const objectIdQuery = allPossibleIds
      .filter((id) => /^[0-9a-fA-F]{24}$/.test(id))
      .map((id) => {
        try {
          return { _id: new ObjectId(id) };
        } catch (e) {
          return null;
        }
      })
      .filter((item) => item !== null);

    // [REMOVED] // [REMOVED] console.log(`Generated ${objectIdQuery.length} valid ObjectId queries`);

    const cloudflareIdQuery = { cloudflareId: { $in: allPossibleIds } };

    // Build the final query conditions
    const queryConditions = [];
    if (objectIdQuery.length > 0) queryConditions.push(...objectIdQuery);
    queryConditions.push(cloudflareIdQuery);

    const query = { $or: queryConditions };
    // [REMOVED] // [REMOVED] console.log("Final MongoDB query:", JSON.stringify(query, null, 2));

    // Find all matching images
    const imagesToDelete = await imagesCollection.find(query).toArray();
    // [REMOVED] // [REMOVED] console.log(`Found ${imagesToDelete.length} images to delete in MongoDB`);

    if (imagesToDelete.length > 0) {
      console.log("Sample image found:", {
        id: imagesToDelete[0]._id.toString(),
        cloudflareId: imagesToDelete[0].cloudflareId,
        carId: imagesToDelete[0].carId,
      });
    }

    // Prepare response structure
    const responseData: {
      success: boolean;
      message?: string;
      totalProcessed: number;
      cloudflare: {
        success: number;
        failed: number;
        details: {
          successes: string[];
          errors?: Array<{ id: string; errors?: any[]; error?: string }>;
        };
      };
      mongodb: {
        found: number;
        processed: number;
        success: number;
        failed: number;
        details: Array<{
          imageId: string;
          cloudflareId: string;
          carUpdateResult?: boolean;
          galleryUpdateResult?: boolean;
          imageDeleteResult?: boolean;
          error?: string;
          success: boolean;
        }>;
      };
    } = {
      success: true,
      totalProcessed: allPossibleIds.length,
      cloudflare: {
        success: deletedFromCloudflare.length,
        failed: cloudflareErrors.length,
        details: {
          successes: deletedFromCloudflare,
          errors: cloudflareErrors.length > 0 ? cloudflareErrors : undefined,
        },
      },
      mongodb: {
        found: imagesToDelete.length,
        processed: 0,
        success: 0,
        failed: 0,
        details: [],
      },
    };

    if (imagesToDelete.length === 0) {
      return NextResponse.json({
        ...responseData,
        message: "No images found to delete in database",
      });
    }

    // Process each image for deletion
    const mongoDeleteResults = [];

    for (const image of imagesToDelete) {
      try {
        console.log(
          `Processing deletion for image: ${image._id}, carId: ${image.carId}, cloudflareId: ${image.cloudflareId}`
        );

        // 1. Remove image ID from the car document (both imageIds and processedImageIds)
        let carUpdateResult = { modifiedCount: 0 };

        if (image.carId) {
          // Handle both string and ObjectId carIds
          let carObjectId;
          if (typeof image.carId === "string") {
            if (ObjectId.isValid(image.carId)) {
              carObjectId = new ObjectId(image.carId);
            } else {
              console.log(
                `Invalid carId string: ${image.carId}, skipping car update`
              );
              carObjectId = null;
            }
          } else {
            carObjectId = image.carId;
          }

          if (carObjectId) {
            carUpdateResult = await carsCollection.updateOne(
              { _id: carObjectId },
              {
                $pull: {
                  imageIds: image._id,
                  processedImageIds: image._id,
                } as any,
              }
            );
          }
        }

        // 2. Remove image ID from all galleries (both imageIds and orderedImages)
        const galleryUpdateResult = await galleriesCollection.updateMany(
          {
            $or: [{ imageIds: image._id }, { "orderedImages.id": image._id }],
          },
          {
            $pull: {
              imageIds: image._id,
              orderedImages: { id: image._id },
            } as any,
            $set: { updatedAt: new Date().toISOString() },
          }
        );

        // 3. Delete the image document
        const deleteResult = await imagesCollection.deleteOne({
          _id: image._id,
        });
        // [REMOVED] // [REMOVED] console.log(`Image deletion result: ${JSON.stringify(deleteResult)}`);

        const resultItem = {
          imageId: image._id.toString(),
          cloudflareId: image.cloudflareId,
          carUpdateResult: carUpdateResult.modifiedCount > 0,
          galleryUpdateResult: galleryUpdateResult.modifiedCount > 0,
          imageDeleteResult: deleteResult.deletedCount > 0,
          success: deleteResult.deletedCount > 0, // Main success criteria is image deletion
        };

        mongoDeleteResults.push(resultItem);
        responseData.mongodb.processed++;

        if (resultItem.success) {
          responseData.mongodb.success++;
        } else {
          responseData.mongodb.failed++;
        }
      } catch (error) {
        console.error(
          `Error processing MongoDB deletion for image ${image._id}:`,
          error
        );
        const errorItem = {
          imageId: image._id.toString(),
          cloudflareId: image.cloudflareId,
          error: String(error),
          success: false,
        };
        mongoDeleteResults.push(errorItem);
        responseData.mongodb.processed++;
        responseData.mongodb.failed++;
      }
    }

    responseData.mongodb.details = mongoDeleteResults;
    responseData.message = `Successfully processed ${responseData.mongodb.success} of ${imagesToDelete.length} images`;

    console.log(
      "DELETE operation completed. Response:",
      JSON.stringify(responseData, null, 2)
    );
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error in DELETE /api/cloudflare/images:", error);
    return NextResponse.json(
      { error: "Failed to delete images", details: String(error) },
      { status: 500 }
    );
  }
}
