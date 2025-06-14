// Location: app/api/cars/[id]/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId, UpdateFilter } from "mongodb";
import { getDatabase, getMongoClient } from "@/lib/mongodb";
import { DB_NAME } from "@/constants";
import { fixCloudflareImageUrl } from "@/lib/image-utils";

// ✅ PERFORMANCE FIX: Images change less frequently
export const revalidate = 600; // 10 minutes

// Rate limiting to prevent infinite loops
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const MAX_REQUESTS_PER_WINDOW = 20; // Max 20 requests per 10 seconds per car

function checkRateLimit(carId: string): boolean {
  const now = Date.now();
  const key = `car-${carId}`;
  const current = requestCounts.get(key);

  if (!current || now > current.resetTime) {
    // Reset window
    requestCounts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    console.warn(
      `🚨 Rate limit exceeded for car ${carId}: ${current.count} requests in ${RATE_LIMIT_WINDOW}ms`
    );
    return false;
  }

  current.count++;
  return true;
}

interface ImageData {
  imageUrl: string;
  imageId: string;
  metadata?: any;
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

interface CarDocument {
  _id: ObjectId;
  imageIds: string[];
  updatedAt?: string;
  images?: Image[];
}

async function getCloudflareAuth() {
  const apiToken = process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN;
  const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;

  if (!apiToken || !accountId) {
    throw new Error("Cloudflare API token or account ID is missing");
  }

  return { apiToken, accountId };
}

// GET images for a car
export async function GET(request: Request) {
  const startTime = Date.now();

  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const id = segments[segments.length - 2]; // -2 because URL is /cars/[id]/images

  try {
    // Rate limiting check first
    if (!checkRateLimit(id)) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Too many requests in a short time.",
          rateLimited: true,
          retryAfter: 10,
        },
        { status: 429 }
      );
    }

    // Parse query parameters
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const skip =
      parseInt(url.searchParams.get("skip") || "0") || (page - 1) * limit;

    // Add logging for debugging infinite loop issues
    console.log(
      `🔍 Image API Request - CarId: ${id}, Page: ${page}, Limit: ${limit}, Skip: ${skip}`
    );

    // Validate pagination parameters to prevent infinite loops
    if (page < 1) {
      return NextResponse.json(
        { error: "Invalid page number. Page must be 1 or greater." },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 200) {
      return NextResponse.json(
        { error: "Invalid limit. Limit must be between 1 and 200." },
        { status: 400 }
      );
    }

    if (skip < 0) {
      return NextResponse.json(
        { error: "Invalid skip value. Skip must be 0 or greater." },
        { status: 400 }
      );
    }

    // Safeguard against potentially infinite loops - if skip is extremely high, likely a bug
    if (skip > 10000) {
      console.warn(
        `⚠️ Extremely high skip value detected: ${skip} for car ${id}. Possible infinite loop.`
      );
      return NextResponse.json(
        {
          error: "Skip value too high. This might indicate a pagination issue.",
          pagination: {
            totalImages: 0,
            totalPages: 0,
            currentPage: 1,
            itemsPerPage: limit,
            startIndex: 1,
            endIndex: 0,
          },
        },
        { status: 400 }
      );
    }

    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    const angle = url.searchParams.get("angle");
    const movement = url.searchParams.get("movement");
    const timeOfDay = url.searchParams.get("timeOfDay");
    const view = url.searchParams.get("view");
    const side = url.searchParams.get("side");
    const imageType = url.searchParams.get("imageType");
    const sort = url.searchParams.get("sort") || "updatedAt";
    const sortDirection = url.searchParams.get("sortDirection") || "desc";

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const carObjectId = new ObjectId(id);

    // PERFORMANCE OPTIMIZATION: Build optimized query with proper indexing
    const query: any = { carId: carObjectId };

    // Add metadata filters with support for nested metadata
    if (category) query["metadata.category"] = category;

    // Collect filter conditions to combine with AND
    const filterConditions = [];

    if (angle) {
      filterConditions.push({
        $or: [
          { "metadata.angle": angle },
          { "metadata.originalImage.metadata.angle": angle },
        ],
      });
    }

    if (movement) {
      filterConditions.push({
        $or: [
          { "metadata.movement": movement },
          { "metadata.originalImage.metadata.movement": movement },
        ],
      });
    }

    if (timeOfDay) {
      filterConditions.push({
        $or: [
          { "metadata.tod": timeOfDay },
          { "metadata.originalImage.metadata.tod": timeOfDay },
        ],
      });
    }

    if (view) {
      filterConditions.push({
        $or: [
          { "metadata.view": view },
          { "metadata.originalImage.metadata.view": view },
        ],
      });
    }

    if (side) {
      filterConditions.push({
        $or: [
          { "metadata.side": side },
          { "metadata.originalImage.metadata.side": side },
        ],
      });
    }

    // Handle imageType filter for original vs processed images
    if (imageType) {
      if (imageType === "with-id") {
        // Show only original images (those WITHOUT originalImage metadata)
        filterConditions.push({
          "metadata.originalImage": { $exists: false },
        });
      } else if (imageType === "processed") {
        // Show only processed images (those WITH originalImage metadata)
        filterConditions.push({
          "metadata.originalImage": { $exists: true },
        });
      }
    }

    // Combine filter conditions with AND
    if (filterConditions.length > 0) {
      query.$and = (query.$and || []).concat(filterConditions);
    }

    // Handle search separately
    if (search) {
      const searchConditions = [
        { filename: { $regex: search, $options: "i" } },
        { "metadata.description": { $regex: search, $options: "i" } },
      ];

      // Add search as an additional AND condition
      query.$and = (query.$and || []).concat([{ $or: searchConditions }]);
    }

    // PERFORMANCE OPTIMIZATION: Use parallel queries for better performance
    const [car, totalImages, images] = await Promise.all([
      // Get car info
      db.collection("cars").findOne(
        { _id: carObjectId },
        {
          projection: { imageIds: 1, primaryImageId: 1 },
        }
      ),

      // Count total matching images
      db.collection("images").countDocuments(query),

      // Get paginated images with optimized projection and dynamic sorting
      db
        .collection("images")
        .find(query, {
          projection: {
            cloudflareId: 1,
            url: 1,
            filename: 1,
            metadata: 1,
            carId: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        })
        .sort({
          [sort]: sortDirection === "asc" ? 1 : -1,
          // Add secondary sort to ensure consistency
          ...(sort !== "createdAt" && { createdAt: -1 }),
        })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // PERFORMANCE OPTIMIZATION: Only create missing documents if really needed
    if (
      totalImages === 0 &&
      car.imageIds &&
      Array.isArray(car.imageIds) &&
      car.imageIds.length > 0
    ) {
      // Create image documents from imageIds (batched for performance)
      const now = new Date().toISOString();
      const imageDocuments = car.imageIds
        .map((imgId: string) => {
          try {
            if (!imgId) return null;

            let imgObjectId;
            if (ObjectId.isValid(imgId)) {
              imgObjectId = new ObjectId(imgId);
            } else {
              imgObjectId = new ObjectId();
            }

            return {
              _id: imgObjectId,
              carId: carObjectId,
              cloudflareId: imgId,
              url: `https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/${imgId}/public`,
              filename: `Image ${imgId.substring(0, 8)}`,
              metadata: {
                category: category || "exterior",
                isPrimary: car.primaryImageId === imgId,
              },
              createdAt: now,
              updatedAt: now,
            };
          } catch (error) {
            return null;
          }
        })
        .filter((doc): doc is NonNullable<typeof doc> => doc !== null);

      if (imageDocuments.length > 0) {
        try {
          await db.collection("images").insertMany(imageDocuments, {
            ordered: false,
            // PERFORMANCE: Use unacknowledged writes for better performance
            writeConcern: { w: 0 },
          });
        } catch (error: any) {
          // Ignore duplicate key errors
          if (error.code !== 11000) {
            console.error("Error creating image documents:", error);
          }
        }
      }

      // Re-fetch images after creation with dynamic sorting
      const newImages = await db
        .collection("images")
        .find(query, {
          projection: {
            cloudflareId: 1,
            url: 1,
            filename: 1,
            metadata: 1,
            carId: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        })
        .sort({
          [sort]: sortDirection === "asc" ? 1 : -1,
          // Add secondary sort to ensure consistency
          ...(sort !== "createdAt" && { createdAt: -1 }),
        })
        .skip(skip)
        .limit(limit)
        .toArray();

      // Process images with our utility function
      const processedImages = newImages.map((image) => ({
        ...image,
        _id: image._id.toString(),
        carId: image.carId.toString(),
        url: fixCloudflareImageUrl(image.url),
      }));

      const newTotalImages = await db
        .collection("images")
        .countDocuments(query);
      const totalPages = Math.ceil(newTotalImages / limit);

      const endTime = Date.now();
      const duration = endTime - startTime;

      return NextResponse.json({
        images: processedImages,
        pagination: {
          totalImages: newTotalImages,
          totalPages,
          currentPage: page,
          itemsPerPage: limit,
          startIndex: skip + 1,
          endIndex: Math.min(skip + limit, newTotalImages),
        },
        debug: {
          queryDuration: `${duration}ms`,
          cacheStatus: "created_documents",
        },
      });
    }

    // PERFORMANCE OPTIMIZATION: Streamlined image processing
    const processedImages = images.map((image) => ({
      ...image,
      _id: image._id.toString(),
      carId: image.carId.toString(),
      url: fixCloudflareImageUrl(image.url),
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalImages / limit);

    const endTime = Date.now();
    const duration = endTime - startTime;

    return NextResponse.json({
      images: processedImages,
      pagination: {
        totalImages,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        startIndex: skip + 1,
        endIndex: Math.min(skip + limit, totalImages),
      },
      debug: {
        queryDuration: `${duration}ms`,
        cacheStatus: "existing_documents",
      },
    });
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.error(
      `💥 GET /cars/${id}/images failed after ${duration}ms:`,
      error
    );
    return NextResponse.json(
      {
        error: `Failed to fetch car images: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}

// POST handler for adding images to a car
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // -2 because URL is /cars/[id]/images

    const formData = await request.formData();
    const imageData = formData.get("imageData");

    if (!imageData) {
      console.error("No image data provided in request");
      return NextResponse.json(
        { error: "No image data provided" },
        { status: 400 }
      );
    }

    const {
      imageUrl,
      imageId,
      metadata = {},
    } = JSON.parse(imageData as string) as ImageData;

    const db = await getDatabase();
    const carsCollection = db.collection<CarDocument>("cars");
    const imagesCollection = db.collection<Image>("images");

    // Create new image document with a proper MongoDB ObjectId
    const imageObjectId = new ObjectId();

    // Check if imageId is a Cloudflare ID (GUID format) or some other format
    const isCloudflareIdFormat =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        imageId
      );

    console.log(
      `imageId ${imageId} is ${
        isCloudflareIdFormat
          ? "in Cloudflare format"
          : "not in Cloudflare format"
      }`
    );

    const imageDoc = {
      _id: imageObjectId,
      // Store the Cloudflare ID separately from the MongoDB _id
      cloudflareId: imageId,
      url: imageUrl,
      filename: imageUrl.split("/").pop() || "",
      metadata,
      carId: new ObjectId(id),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Insert the image document
    await imagesCollection.insertOne(imageDoc);
    console.log(
      "Created new image document:",
      imageDoc._id,
      "with cloudflareId:",
      imageDoc.cloudflareId
    );

    // Update the car document with the new image ID (use our MongoDB ObjectId)
    const updateDoc: UpdateFilter<CarDocument> = {
      $push: { imageIds: imageObjectId.toString() },
      $set: { updatedAt: new Date().toISOString() },
    };

    const result = await carsCollection.updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

    if (result.matchedCount === 0) {
      console.error("Car not found with ID:", id);
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    if (result.modifiedCount === 0) {
      console.error("Car found but not modified:", id);
      return NextResponse.json(
        { error: "Failed to update car" },
        { status: 500 }
      );
    }

    // Get the updated car document with populated images
    const updatedCar = await carsCollection
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
          $lookup: {
            from: "images",
            localField: "imageIds",
            foreignField: "_id",
            as: "images",
          },
        },
      ])
      .next();

    return NextResponse.json(updatedCar);
  } catch (error) {
    console.error("Error processing image upload:", error);
    return NextResponse.json(
      {
        error: `Failed to process image upload: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}

// DELETE handler for removing an image
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // -2 because URL is /cars/[id]/images

    // Parse the request data
    const requestData = await request.json().catch((e) => {
      console.error("Failed to parse request body:", e);
      return null;
    });

    // Get the image IDs from the request body
    const {
      imageIds = [],
      cloudflareIds = [],
      deleteFromStorage = false,
      isUserInitiated: bodyUserInitiated,
    } = requestData || {};

    // Get MongoDB client and start session
    const client = await getMongoClient();
    const db = await getDatabase();
    let session = null;

    try {
      session = client.startSession();
      // [REMOVED] // [REMOVED] console.log("MongoDB session started");

      // Start a transaction
      let result = null;

      try {
        session.startTransaction();
        // [REMOVED] // [REMOVED] console.log("Transaction started");

        // Convert carId to ObjectId
        const carObjectId = new ObjectId(id);

        // Fetch the car to get its images - using a safer approach
        const car = await db.collection("cars").findOne({
          _id: carObjectId,
        });

        // First step: Find images by their MongoDB ObjectIds (if provided)
        let imageObjectIds: ObjectId[] = [];
        if (Array.isArray(imageIds) && imageIds.length > 0) {
          // Attempt to convert input IDs to ObjectIds when possible
          imageObjectIds = imageIds
            .map((id) => {
              try {
                // Check if it's already a valid ObjectId string
                if (ObjectId.isValid(id)) {
                  return new ObjectId(id);
                } else {
                  console.log(
                    `ID ${id} is not a valid MongoDB ObjectId format`
                  );
                  return null;
                }
              } catch (e) {
                console.error(`Invalid ObjectId: ${id}`);
                return null;
              }
            })
            .filter((id): id is ObjectId => id !== null);

          console.log(
            "Valid MongoDB ObjectIds:",
            imageObjectIds.map((id) => id.toString())
          );
        }

        // Second step: If we have Cloudflare IDs, find the corresponding image documents
        let imageDocs: any[] = [];

        // Build a query that can handle both ObjectIds and Cloudflare IDs
        const query: any = { carId: carObjectId };

        if (imageObjectIds.length > 0 && cloudflareIds.length > 0) {
          // If we have both types, use $or to find matches for either
          query.$or = [
            { _id: { $in: imageObjectIds } },
            { cloudflareId: { $in: cloudflareIds } },
          ];
        } else if (imageObjectIds.length > 0) {
          // Only MongoDB ObjectIds provided
          query._id = { $in: imageObjectIds };
        } else if (cloudflareIds.length > 0) {
          // Only Cloudflare IDs provided
          query.cloudflareId = { $in: cloudflareIds };
        }

        // [REMOVED] // [REMOVED] console.log("Image lookup query:", JSON.stringify(query));

        // Find all matching image documents
        imageDocs = await db.collection("images").find(query).toArray();

        // [REMOVED] // [REMOVED] console.log(`Found ${imageDocs.length} image documents to delete`);

        // Extract the ObjectIds from the found documents
        const foundImageObjectIds = imageDocs.map((doc) => doc._id);
        console.log(
          "ObjectIds of images to delete:",
          foundImageObjectIds.map((id) => id.toString())
        );

        // Extract cloudflare IDs from the found documents
        // IMPORTANT FIX: Always use the cloudflareId field from the document, not the MongoDB ID
        const foundCloudflareIds = deleteFromStorage
          ? imageDocs.map((img) => img.cloudflareId).filter(Boolean)
          : [];

        console.log(
          "CloudflareIds to delete from storage:",
          foundCloudflareIds
        );

        // Update the car document to remove the image IDs (both imageIds and processedImageIds)
        const updateResult = await db.collection("cars").updateOne(
          { _id: carObjectId },
          {
            $pullAll: {
              imageIds: foundImageObjectIds,
              processedImageIds: foundImageObjectIds,
            } as any,
            $set: { updatedAt: new Date().toISOString() },
          },
          { session }
        );

        // Remove images from all galleries (both imageIds and orderedImages)
        const galleryUpdateResult = await db.collection("galleries").updateMany(
          {
            $or: [
              { imageIds: { $in: foundImageObjectIds } },
              { "orderedImages.id": { $in: foundImageObjectIds } },
            ],
          },
          {
            $pull: {
              imageIds: { $in: foundImageObjectIds },
              orderedImages: { id: { $in: foundImageObjectIds } },
            } as any,
            $set: { updatedAt: new Date().toISOString() },
          },
          { session }
        );

        // [REMOVED] // [REMOVED] console.log("Car update result:", updateResult);

        // Delete the image documents
        const deleteImagesResult = await db
          .collection("images")
          .deleteMany({ _id: { $in: foundImageObjectIds } }, { session });

        // [REMOVED] // [REMOVED] console.log("Delete images result:", deleteImagesResult);

        // Commit the transaction
        await session.commitTransaction();
        // [REMOVED] // [REMOVED] console.log("Transaction committed successfully");

        // Delete from Cloudflare if requested
        const cloudflareResults: any[] = [];
        if (deleteFromStorage && foundCloudflareIds.length > 0) {
          try {
            const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
            const apiToken = process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN;

            if (!accountId || !apiToken) {
              throw new Error("Missing Cloudflare credentials");
            }

            console.log(
              `Deleting ${foundCloudflareIds.length} images from Cloudflare`
            );

            for (const cloudflareId of foundCloudflareIds) {
              try {
                console.log(
                  `Deleting image with Cloudflare ID: ${cloudflareId}`
                );
                const cloudflareResponse = await fetch(
                  `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${cloudflareId}`,
                  {
                    method: "DELETE",
                    headers: {
                      Authorization: `Bearer ${apiToken}`,
                    },
                  }
                );

                const cloudflareResult = await cloudflareResponse.json();
                cloudflareResults.push({
                  id: cloudflareId,
                  success: cloudflareResult.success,
                  errors: cloudflareResult.errors,
                });

                console.log(
                  `Cloudflare deletion for ${cloudflareId}:`,
                  cloudflareResult.success ? "Success" : "Failed"
                );
              } catch (cfError: unknown) {
                console.error(
                  `Error deleting image ${cloudflareId} from Cloudflare:`,
                  cfError
                );
                cloudflareResults.push({
                  id: cloudflareId,
                  success: false,
                  error:
                    cfError instanceof Error
                      ? cfError.message
                      : String(cfError),
                });
              }
            }
          } catch (cfAuthError) {
            console.error("Error getting Cloudflare auth:", cfAuthError);
            cloudflareResults.push({
              error: "Failed to get Cloudflare auth",
              success: false,
            });
          }
        }

        // Fetch the updated car to return
        const updatedCar = await db
          .collection("cars")
          .findOne({ _id: carObjectId });

        console.log("Updated car:", {
          _id: updatedCar?._id,
          imageIds: updatedCar?.imageIds?.length || 0,
        });

        // Return success response
        return NextResponse.json({
          success: true,
          message: `Deleted ${foundImageObjectIds.length} images successfully`,
          deletedCount: foundImageObjectIds.length,
          imagesDeletedCount: deleteImagesResult.deletedCount,
          cloudflareResults,
          car: updatedCar,
        });
      } catch (txError) {
        console.error("Transaction error:", txError);
        // Abort transaction on error
        if (session.inTransaction()) {
          await session.abortTransaction();
          // [REMOVED] // [REMOVED] console.log("Transaction aborted due to error");
        }
        throw txError;
      }
    } finally {
      // End session if it exists
      if (session) {
        await session.endSession();
        // [REMOVED] // [REMOVED] console.log("MongoDB session ended");
      }
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      {
        error: `Failed to delete image: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
