// Location: app/api/cars/[id]/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId, UpdateFilter } from "mongodb";
import { getDatabase, getMongoClient } from "@/lib/mongodb";
import { DB_NAME } from "@/constants";
import { getFormattedImageUrl } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

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
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // -2 because URL is /cars/[id]/images

    console.log(`GET images for car with ID: ${id}`);

    // Parse query parameters
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;
    const category = url.searchParams.get("category");

    if (!ObjectId.isValid(id)) {
      console.log(`Invalid car ID format: ${id}`);
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    console.log("Getting MongoDB database directly using getDatabase...");
    // Use getDatabase instead of getMongoClient for more reliable connection
    const db = await getDatabase();
    console.log("Successfully connected to database");

    const carObjectId = new ObjectId(id);

    // Build query for category filtering
    const query: any = { carId: carObjectId };
    if (category) {
      query["metadata.category"] = category;
    }

    // First, check if the car exists and if it has imageIds
    console.log(`Checking if car exists with ID: ${id}`);
    const car = await db.collection("cars").findOne({ _id: carObjectId });

    if (!car) {
      console.log(`Car not found with ID: ${id}`);
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    console.log(`Found car with ${car.imageIds?.length || 0} imageIds`);

    // Count total existing images for pagination metadata
    const totalImages = await db.collection("images").countDocuments(query);
    console.log(
      `Found ${totalImages} existing image documents in the database`
    );

    // Check if we need to create image documents from imageIds
    if (
      totalImages === 0 &&
      car.imageIds &&
      Array.isArray(car.imageIds) &&
      car.imageIds.length > 0
    ) {
      console.log(
        `Car ${id} has ${car.imageIds.length} imageIds but no image documents. Creating them now.`
      );

      // Create image documents from imageIds
      const now = new Date().toISOString();
      const imageDocuments = car.imageIds
        .map((imgId: string) => {
          try {
            if (!imgId) {
              console.log("Found empty imageId, skipping");
              return null;
            }

            console.log(`Processing imageId: ${imgId}`);
            let imgObjectId;

            if (ObjectId.isValid(imgId)) {
              imgObjectId = new ObjectId(imgId);
            } else {
              console.log(
                `Invalid ObjectId format for ${imgId}, using as string ID`
              );
              // If it's not a valid ObjectId, we can still use it as the cloudflareId
              // Just create a new ObjectId for the document ID
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
            console.error(
              `Error creating image document for ID ${imgId}:`,
              error
            );
            return null;
          }
        })
        .filter((doc): doc is NonNullable<typeof doc> => doc !== null);

      console.log(
        `Prepared ${imageDocuments.length} image documents for insertion`
      );

      if (imageDocuments.length > 0) {
        try {
          // Use insertMany with ordered: false to continue even if some inserts fail
          const insertResult = await db
            .collection("images")
            .insertMany(imageDocuments, { ordered: false });
          console.log(
            `Created ${insertResult.insertedCount} image documents from imageIds`
          );
        } catch (error: any) {
          // Some inserts might fail due to duplicate keys, which is fine
          if (error.code === 11000) {
            console.log("Some documents already exist (duplicate key error)");
          } else {
            console.error("Error creating image documents:", error);
          }
        }
      }
    }

    // Get paginated images
    console.log(
      `Fetching paginated images: page=${page}, limit=${limit}, skip=${skip}`
    );
    const images = await db
      .collection("images")
      .find(query)
      .sort({ updatedAt: -1, createdAt: -1 }) // Show most recently updated/created first
      .skip(skip)
      .limit(limit)
      .toArray();

    console.log(`Found ${images.length} images to return`);

    // Process images with our utility function
    const processedImages = images.map((img) => ({
      ...img,
      _id: img._id.toString(),
      id: img._id.toString(), // Add id for consistency
      carId: img.carId.toString(),
      url: getFormattedImageUrl(img.url),
    }));

    // In development, log useful debugging info
    if (process.env.NODE_ENV === "development") {
      console.log(`Found ${processedImages.length} images for car ${id}`);
      console.log(
        `Pagination info: page=${page}, limit=${limit}, total=${totalImages}, pages=${Math.ceil(
          Math.max(totalImages, images.length) / limit
        )}`
      );
    }

    return NextResponse.json({
      images: processedImages,
      pagination: {
        total: Math.max(totalImages, images.length), // Use the greater of count or actual results
        page,
        limit,
        pages: Math.ceil(Math.max(totalImages, images.length) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching car images:", error);
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

    console.log("Processing request for car ID:", id);

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
    console.log("Received image data:", { imageUrl, imageId });

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

    console.log("MongoDB update result:", result);

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

    console.log("Updated car document:", updatedCar);

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

    console.log("Processing image deletion for car ID:", id);

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

    console.log("MongoDB ObjectIds to delete:", imageIds);
    console.log("Cloudflare IDs to delete:", cloudflareIds);
    console.log("Delete from storage:", deleteFromStorage);
    console.log("User initiated (from body):", bodyUserInitiated);

    // Get MongoDB client and start session
    const client = await getMongoClient();
    const db = await getDatabase();
    let session = null;

    try {
      session = client.startSession();
      console.log("MongoDB session started");

      // Start a transaction
      let result = null;

      try {
        session.startTransaction();
        console.log("Transaction started");

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

        console.log("Image lookup query:", JSON.stringify(query));

        // Find all matching image documents
        imageDocs = await db.collection("images").find(query).toArray();

        console.log(`Found ${imageDocs.length} image documents to delete`);

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

        // Update the car document to remove the image IDs - using $pullAll with type assertion
        const updateResult = await db.collection("cars").updateOne(
          { _id: carObjectId },
          {
            $pullAll: { imageIds: foundImageObjectIds } as any,
            $set: { updatedAt: new Date().toISOString() },
          },
          { session }
        );

        console.log("Car update result:", updateResult);

        // Delete the image documents
        const deleteImagesResult = await db
          .collection("images")
          .deleteMany({ _id: { $in: foundImageObjectIds } }, { session });

        console.log("Delete images result:", deleteImagesResult);

        // Commit the transaction
        await session.commitTransaction();
        console.log("Transaction committed successfully");

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
          console.log("Transaction aborted due to error");
        }
        throw txError;
      }
    } finally {
      // End session if it exists
      if (session) {
        await session.endSession();
        console.log("MongoDB session ended");
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
