import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId, Collection } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { analyzeImage } from "@/lib/imageAnalyzer";

// Set maximum execution time to 300 seconds (5 minutes) - matches vercel.json
export const maxDuration = 300;
export const runtime = "nodejs";

// Force dynamic rendering for uploads
export const dynamic = "force-dynamic";

// Configure for large file uploads (Vercel Pro)
export const preferredRegion = "auto";
export const revalidate = false;

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
  name: string;
  description?: string;
}

// Add type for MongoDB collections
interface Collections {
  images: Collection<Image>;
  cars: Collection<Car>;
  galleries: Collection<Gallery>;
  projects: Collection<Project>;
}

// Batch size for MongoDB operations
const BATCH_SIZE = 50;
// High-Performance Parallel Processing Configuration
const CLOUDFLARE_UPLOAD_CONCURRENCY = 20; // Significantly increased for faster uploads
const ANALYSIS_RETRY_COUNT = 3;
const ANALYSIS_CONCURRENCY = 16; // Much higher concurrency for OpenAI analysis
const ANALYSIS_TIMEOUT = 45000; // Balanced timeout
const ASYNC_ANALYSIS_ENABLED = true; // Enable non-blocking analysis

// File size limits and validation
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB per file to avoid Vercel limits
const MAX_TOTAL_SIZE = 8 * 1024 * 1024; // 8MB total request size to avoid 413 errors
const VERCEL_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks to stay well under Vercel body limits
const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/svg+xml",
];

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

  // Enhanced logging for debugging Vercel 413 issues
  const requestHeaders = Object.fromEntries([...request.headers.entries()]);
  const requestStartTime = Date.now();

  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("=== CLOUDFLARE IMAGES UPLOAD REQUEST START ===");
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Timestamp:", new Date().toISOString());
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Request URL:", request.url);
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Method:", request.method);
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Content-Type:", requestHeaders["content-type"]);
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Content-Length:", requestHeaders["content-length"] || "unknown");
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("User-Agent:", requestHeaders["user-agent"]);
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Environment:", process.env.NODE_ENV);
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Vercel Environment:", process.env.VERCEL_ENV || "unknown");
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("All Request Headers:", JSON.stringify(requestHeaders, null, 2));

  // Log Vercel limits for reference
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("=== VERCEL LIMITS ===");
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Vercel Body Size Limit: 4.5MB (4,718,592 bytes)");
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Our MAX_TOTAL_SIZE config:", MAX_TOTAL_SIZE, "bytes");
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Our MAX_FILE_SIZE config:", MAX_FILE_SIZE, "bytes");
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Our VERCEL_CHUNK_SIZE config:", VERCEL_CHUNK_SIZE, "bytes");

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
          projects: db.collection<Project>("projects"),
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
    entityId: string,
    entityInfo: any,
    collections: Collections,
    now: string,
    selectedPromptId?: string,
    selectedModelId?: string,
    isCarMode: boolean = true,
    isProjectMode: boolean = false
  ) => {
    const fileId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const formData = new FormData();
    formData.append("file", file);

    try {
      await sendProgress({
        type: "start",
        fileIndex: i,
        fileId,
        fileName: file.name,
        status: "uploading",
        progress: 0,
        message: "Starting upload...",
      });

      // Upload to Cloudflare Images
      await sendProgress({
        type: "progress",
        fileIndex: i,
        fileId,
        fileName: file.name,
        status: "uploading",
        progress: 25,
        message: "Uploading to Cloudflare Images...",
        stepProgress: {
          cloudflare: {
            status: "uploading",
            progress: 25,
            message: "Uploading to Cloudflare Images",
          },
          openai: {
            status: "pending",
            progress: 0,
            message: "Waiting for upload to complete",
          },
        },
      });

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare upload failed: ${errorText}`);
      }

      const result = await response.json();

      // Construct the image URL using the new ID
      const imageUrl = `https://imagedelivery.net/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/${result.result.id}/public`;

      await sendProgress({
        type: "progress",
        fileIndex: i,
        fileId,
        fileName: file.name,
        status: "analyzing",
        progress: 60,
        message: "Analyzing image with AI",
        stepProgress: {
          cloudflare: {
            status: "complete",
            progress: 100,
            message: "Upload complete",
          },
          openai: {
            status: "analyzing",
            progress: 25,
            message: "Starting AI image analysis",
          },
        },
      });

      // ENHANCED: Auto-enable analysis with defaults if not provided
      let analysisPromptId = selectedPromptId;
      let analysisModelId = selectedModelId;

      // If no explicit settings provided, use defaults for automatic analysis
      if (!analysisPromptId && !analysisModelId && isCarMode) {
        // Use default model for car images
        const { IMAGE_ANALYSIS_CONFIG } = await import(
          "@/constants/image-analysis"
        );
        const defaultModel = IMAGE_ANALYSIS_CONFIG.availableModels.find(
          (model) => model.isDefault
        );
        analysisModelId = defaultModel?.id || "gpt-4o-mini";
        console.log(
          `🤖 Auto-enabling OpenAI analysis with default model: ${analysisModelId}`
        );
      }

      // Try to analyze the image with retries (if analysis is enabled)
      let imageAnalysis = null;
      let analysisError = null;

      // Only attempt analysis if we have at least a model ID
      if (analysisModelId) {
        for (let attempt = 0; attempt <= ANALYSIS_RETRY_COUNT; attempt++) {
          try {
            if (attempt > 0) {
              await sendProgress({
                type: "progress",
                fileIndex: i,
                fileId,
                fileName: file.name,
                status: "analyzing",
                progress: 75,
                message: `Retry #${attempt}: Analyzing image with AI`,
                stepProgress: {
                  cloudflare: {
                    status: "complete",
                    progress: 100,
                    message: "Upload complete",
                  },
                  openai: {
                    status: "retrying",
                    progress: 50,
                    message: `Retry attempt ${attempt} - analyzing image`,
                  },
                },
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
                  vehicleInfo: isCarMode ? entityInfo : undefined,
                  projectInfo: isProjectMode ? entityInfo : undefined,
                  promptId: analysisPromptId,
                  modelId: analysisModelId,
                }),
                // Adding a longer timeout for the analysis request
                signal: AbortSignal.timeout(ANALYSIS_TIMEOUT), // 30 seconds timeout
              }
            );

            if (!analysisResponse.ok) {
              throw new Error(
                `Analysis failed: ${analysisResponse.statusText}`
              );
            }

            const { analysis } = await analysisResponse.json();
            imageAnalysis = analysis;
            // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Image analysis result for ${file.name}:`, imageAnalysis);
            break; // Success, exit retry loop
          } catch (error) {
            analysisError = error;
            console.error(
              `OpenAI analysis attempt ${attempt + 1} failed:`,
              error
            );

            if (attempt === ANALYSIS_RETRY_COUNT) {
              console.warn(
                `All analysis attempts failed for image ${file.name}`
              );
            } else {
              // Wait before retry
              await new Promise((resolve) =>
                setTimeout(resolve, 2000 * (attempt + 1))
              );
            }
          }
        }
      } else {
        console.log(
          `⚠️ Skipping OpenAI analysis for ${file.name} - no model selected`
        );
      }

      // Create image document
      const imageDoc = {
        _id: new ObjectId(),
        cloudflareId: result.result.id,
        url: imageUrl,
        filename: file.name,
        metadata: {
          category: isCarMode
            ? "exterior"
            : isProjectMode
              ? "project"
              : "unclassified",
          isPrimary: false,
          vehicleInfo: isCarMode ? entityInfo : undefined,
          projectInfo: isProjectMode ? entityInfo : undefined,
          ...(imageAnalysis || {}),
          aiAnalysis: imageAnalysis,
          analysisStatus: imageAnalysis
            ? "success"
            : analysisModelId
              ? "failed"
              : "skipped",
          analysisError: analysisError
            ? analysisError instanceof Error
              ? analysisError.message
              : String(analysisError)
            : null,
          // Store analysis settings used
          analysisSettings: analysisModelId
            ? {
                promptId: analysisPromptId || "default",
                modelId: analysisModelId,
                autoEnabled: !selectedPromptId && !selectedModelId,
              }
            : null,
        },
        carId: isCarMode && entityId ? new ObjectId(entityId) : null,
        projectId: isProjectMode && entityId ? new ObjectId(entityId) : null,
        createdAt: now,
        updatedAt: now,
      };

      // Send complete progress with enhanced step tracking
      await sendProgress({
        type: "complete",
        fileIndex: i,
        fileId,
        fileName: file.name,
        status: "complete",
        progress: 100,
        message: imageAnalysis
          ? "Upload and analysis complete"
          : analysisModelId
            ? "Upload complete, analysis failed"
            : "Upload complete (analysis not enabled)",
        imageUrl,
        metadata: imageDoc.metadata,
        stepProgress: {
          cloudflare: {
            status: "complete",
            progress: 100,
            message: "Successfully uploaded to Cloudflare Images",
          },
          openai: {
            status: imageAnalysis
              ? "complete"
              : analysisModelId
                ? "failed"
                : "skipped",
            progress: imageAnalysis ? 100 : analysisModelId ? 0 : 100,
            message: imageAnalysis
              ? "AI analysis completed successfully"
              : analysisModelId
                ? "AI analysis failed - will retry"
                : "AI analysis skipped",
          },
        },
      });

      return imageDoc;
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      await sendProgress({
        type: "error",
        fileIndex: i,
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
    selectedModelId?: string,
    isCarMode: boolean = true
  ) => {
    try {
      console.log(
        `Processing batch of ${batch.length} images (starting at index ${startIndex})`
      );

      // Process files with true parallel processing - using Promise.all for faster processing
      console.log(
        `Processing ${batch.length} files with concurrency limit: ${CLOUDFLARE_UPLOAD_CONCURRENCY}`
      );

      // Create chunks based on concurrency limit for better resource management
      const processChunks: File[][] = [];
      for (let i = 0; i < batch.length; i += CLOUDFLARE_UPLOAD_CONCURRENCY) {
        processChunks.push(batch.slice(i, i + CLOUDFLARE_UPLOAD_CONCURRENCY));
      }

      const results: Array<PromiseSettledResult<any>> = [];

      // Process chunks in parallel for maximum throughput
      for (
        let chunkIndex = 0;
        chunkIndex < processChunks.length;
        chunkIndex++
      ) {
        const chunk = processChunks[chunkIndex];
        const chunkOffset = chunkIndex * CLOUDFLARE_UPLOAD_CONCURRENCY;

        console.log(
          `Processing chunk ${chunkIndex + 1}/${processChunks.length} with ${chunk.length} files`
        );

        // Use Promise.all for faster failure handling within each chunk
        const chunkPromises = chunk.map((file, i) =>
          processFile(
            file,
            startIndex + chunkOffset + i,
            carId,
            vehicleInfo,
            collections,
            now,
            selectedPromptId,
            selectedModelId,
            isCarMode
          )
        );

        const chunkResults = await Promise.allSettled(chunkPromises);
        results.push(...chunkResults);
      }

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

        // Update car document with image IDs (only for car mode) - store as ObjectIds
        if (isCarMode && carId) {
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
        } else {
          console.log(
            `General mode upload: ${successfulDocs.length} images inserted without car association`
          );
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

  // Helper function to validate file size and type
  const validateFile = (
    file: File,
    index: number
  ): { valid: boolean; error?: string } => {
    // Check file type
    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `File ${index + 1} (${file.name}): Unsupported file type "${file.type}". Supported types: ${SUPPORTED_MIME_TYPES.join(", ")}`,
      };
    }

    // Check individual file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File ${index + 1} (${file.name}): File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    return { valid: true };
  };

  const processImages = async () => {
    let mongoClient;
    try {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("=== PARSING FORM DATA ===");
      const formDataParseStart = Date.now();

      const formData = await request.formData();
      const formDataParseTime = Date.now() - formDataParseStart;

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("FormData parsing time:", formDataParseTime, "ms");

      // Log FormData structure for debugging
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("FormData entries:");
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`  ${key}: File {`);
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`    name: "${value.name}"`);
          console.log(
            `    size: ${value.size} bytes (${(value.size / 1024 / 1024).toFixed(2)}MB)`
          );
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`    type: "${value.type}"`);
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`    lastModified: ${value.lastModified}`);
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`  }`);
        } else {
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`  ${key}: "${value}"`);
        }
      }

      const carId = formData.get("carId") as string;
      const fileCount = parseInt(formData.get("fileCount") as string);
      const selectedPromptId = formData.get("selectedPromptId") as string;
      const selectedModelId = formData.get("selectedModelId") as string;
      const metadata = formData.get("metadata") as string;

      // Determine upload mode based on carId presence
      const isCarMode = carId && carId !== "undefined" && carId !== "null";
      const isGeneralMode = !isCarMode;

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("=== EXTRACTED PARAMETERS ===");
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Car ID:", carId);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("File Count:", fileCount);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Selected Prompt ID:", selectedPromptId);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Selected Model ID:", selectedModelId);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Metadata:", metadata);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Upload Mode:", isCarMode ? "car" : "general");

      // For car mode, carId is required. For general mode, it's optional
      if (isCarMode && !carId) {
        await sendProgress({ error: "No car ID provided for car mode upload" });
        return;
      }

      // Collect all files and validate them first
      const files: File[] = [];
      let totalSize = 0;

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("=== COLLECTING FILES ===");

      for (let i = 0; i < fileCount; i++) {
        const file = formData.get(`file${i}`) as File;
        if (file) {
          // Validate individual file
          const validation = validateFile(file, i);
          if (!validation.valid) {
            await sendProgress({ error: validation.error });
            return;
          }

          files.push(file);
          totalSize += file.size;
          console.log(
            `  File ${i}: ${file.name} - ${file.size} bytes (${(file.size / 1024 / 1024).toFixed(2)}MB)`
          );
        } else {
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`  File ${i} not found in FormData`);
        }
      }

      // Calculate and log payload size overhead
      const requestContentLength = requestHeaders["content-length"]
        ? parseInt(requestHeaders["content-length"])
        : null;

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("=== PAYLOAD SIZE ANALYSIS ===");
      console.log(
        "Raw files total size:",
        totalSize,
        "bytes",
        `(${(totalSize / 1024 / 1024).toFixed(2)}MB)`
      );
      console.log(
        "Request Content-Length header:",
        requestContentLength,
        "bytes",
        requestContentLength
          ? `(${(requestContentLength / 1024 / 1024).toFixed(2)}MB)`
          : "(unknown)"
      );

      if (requestContentLength && totalSize > 0) {
        const overhead = requestContentLength - totalSize;
        const overheadPercent = ((overhead / totalSize) * 100).toFixed(1);
        console.log(
          "Multipart form overhead:",
          overhead,
          "bytes",
          `(${(overhead / 1024 / 1024).toFixed(2)}MB)`
        );
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Overhead percentage:", overheadPercent + "%");

        // Log proximity to Vercel limit
        const vercelLimit = 4718592; // 4.5MB in bytes
        const proximityToLimit = (
          (requestContentLength / vercelLimit) *
          100
        ).toFixed(1);
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Proximity to Vercel 4.5MB limit:", proximityToLimit + "%");

        if (requestContentLength > vercelLimit) {
          console.error("🚨 REQUEST EXCEEDS VERCEL LIMIT!");
          console.error("Request size:", requestContentLength, "bytes");
          console.error("Vercel limit:", vercelLimit, "bytes");
          console.error(
            "Overage:",
            requestContentLength - vercelLimit,
            "bytes"
          );
        } else if (requestContentLength > vercelLimit * 0.9) {
          console.warn("⚠️ Request approaching Vercel limit (>90%)");
        }
      }

      // Validate total request size
      if (totalSize > MAX_TOTAL_SIZE) {
        await sendProgress({
          error: `Total file size ${(totalSize / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed total size of ${MAX_TOTAL_SIZE / 1024 / 1024}MB for batch upload. Please upload fewer or smaller files.`,
        });
        return;
      }

      console.log(
        `Validated ${files.length} files with total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`
      );

      if (files.length === 0) {
        await sendProgress({ error: "No valid files to process" });
        return;
      }

      // Initialize MongoDB connection with retry logic
      const collections = await initMongoConnection();

      // Fetch car information for car mode uploads
      let car = null;
      let vehicleInfo = null;

      if (isCarMode) {
        car = await collections.cars.findOne({ _id: new ObjectId(carId) });
        if (!car) {
          throw new Error("Car not found");
        }

        // Extract vehicle info for analysis
        vehicleInfo = {
          make: car.make,
          model: car.model,
          year: car.year,
          color: car.color,
          engine: car.engine,
          condition: car.condition,
          additionalContext: car.description,
        };
      } else {
        // For general mode, use provided metadata or defaults
        let parsedMetadata = {};
        try {
          parsedMetadata = metadata ? JSON.parse(metadata) : {};
        } catch (error) {
          console.warn("Failed to parse metadata, using defaults:", error);
        }

        vehicleInfo = {
          make: "Unknown",
          model: "General Upload",
          year: new Date().getFullYear(),
          color: "Unknown",
          engine: "Unknown",
          condition: "Unknown",
          additionalContext: "General gallery upload",
          ...parsedMetadata,
        };
      }

      // Use the already collected and validated files from above
      // (files array was already created in the validation section)

      const now = new Date().toISOString();
      const results = [];

      // Process files in batches for parallel uploading
      for (let i = 0; i < files.length; i += CLOUDFLARE_UPLOAD_CONCURRENCY) {
        const batch = files.slice(i, i + CLOUDFLARE_UPLOAD_CONCURRENCY);
        try {
          const batchResults = await processBatch(
            batch,
            i,
            carId || "",
            vehicleInfo,
            collections,
            now,
            selectedPromptId,
            selectedModelId,
            Boolean(isCarMode)
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
      const requestEndTime = Date.now();
      const totalProcessingTime = requestEndTime - requestStartTime;

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("=== REQUEST COMPLETION ===");
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Total processing time:", totalProcessingTime, "ms");
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Successful uploads:", results.length);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Failed uploads:", fileCount - results.length);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Request completed successfully");

      await sendProgress({
        type: "complete",
        success: true,
        totalFiles: fileCount,
        successfulUploads: results.length,
        failedUploads: fileCount - results.length,
      });
    } catch (error) {
      const requestEndTime = Date.now();
      const totalProcessingTime = requestEndTime - requestStartTime;

      console.error("=== REQUEST ERROR ===");
      console.error("Processing time before error:", totalProcessingTime, "ms");
      console.error("Error type:", error?.constructor?.name || "Unknown");
      console.error(
        "Error message:",
        error instanceof Error ? error.message : "Failed to process images"
      );
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );

      // Special handling for common 413-related errors
      if (error instanceof Error) {
        if (
          error.message.includes("413") ||
          error.message.includes("Content Too Large")
        ) {
          console.error(
            "🚨 DETECTED 413 ERROR - VERCEL BODY SIZE LIMIT EXCEEDED!"
          );
          console.error("This confirms the request payload exceeded 4.5MB");
        }
        if (
          error.message.includes("PayloadTooLargeError") ||
          error.message.includes("request entity too large")
        ) {
          console.error(
            "🚨 PAYLOAD TOO LARGE ERROR - MULTIPART FORM EXCEEDED LIMITS!"
          );
        }
      }

      await sendProgress({
        type: "error",
        error:
          error instanceof Error ? error.message : "Failed to process images",
      });
    } finally {
      const requestEndTime = Date.now();
      const totalRequestTime = requestEndTime - requestStartTime;
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("=== REQUEST CLEANUP ===");
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Total request duration:", totalRequestTime, "ms");
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Closing writer stream");
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

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("======== CLOUDFLARE DIRECT DELETE API CALLED ========");
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Request URL:", request.url);
    console.log(
      "Request headers:",
      Object.fromEntries([...request.headers.entries()])
    );
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("DELETE body:", JSON.stringify(requestData, null, 2));

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
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Attempting to delete image ${id} from Cloudflare`);
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
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Successfully deleted image ${id} from Cloudflare`);
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
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Building query to match MongoDB documents...");

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

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Generated ${objectIdQuery.length} valid ObjectId queries`);

    const cloudflareIdQuery = { cloudflareId: { $in: allPossibleIds } };

    // Build the final query conditions
    const queryConditions = [];
    if (objectIdQuery.length > 0) queryConditions.push(...objectIdQuery);
    queryConditions.push(cloudflareIdQuery);

    const query = { $or: queryConditions };
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Final MongoDB query:", JSON.stringify(query, null, 2));

    // Find all matching images
    const imagesToDelete = await imagesCollection.find(query).toArray();
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Found ${imagesToDelete.length} images to delete in MongoDB`);

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
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Image deletion result: ${JSON.stringify(deleteResult)}`);

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
