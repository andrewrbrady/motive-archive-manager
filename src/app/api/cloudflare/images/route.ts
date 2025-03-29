import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId, Collection } from "mongodb";

// Set maximum execution time to 60 seconds
export const maxDuration = 60;
export const runtime = "nodejs";

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
}

// Add type for MongoDB collections
interface Collections {
  images: Collection<Image>;
  cars: Collection<Car>;
}

// Helper function to get MongoDB client
async function getMongoClient() {
  const client = new MongoClient(process.env.MONGODB_URI || "");
  await client.connect();
  return client;
}

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
  let mongoClient;
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const metadata = formData.get("metadata");
    const vehicleInfo = formData.get("vehicleInfo");
    const carId = formData.get("carId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!carId) {
      return NextResponse.json(
        { error: "No car ID provided" },
        { status: 400 }
      );
    }

    // Safely parse metadata and vehicleInfo
    let parsedMetadata = {};
    let parsedVehicleInfo = undefined;

    try {
      if (metadata) {
        parsedMetadata = JSON.parse(metadata as string);
      }
    } catch (e) {
      console.error("Error parsing metadata:", e);
    }

    try {
      if (vehicleInfo) {
        parsedVehicleInfo = JSON.parse(vehicleInfo as string);
      }
    } catch (e) {
      console.error("Error parsing vehicleInfo:", e);
    }

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
      const errorText = await response.text();
      console.error("Cloudflare API error response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText,
      });
      return NextResponse.json(
        { error: `Failed to upload to Cloudflare: ${response.statusText}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (!result.success) {
      console.error("Cloudflare API error:", result.errors);
      return NextResponse.json(
        { error: result.errors?.[0]?.message || "Unknown Cloudflare error" },
        { status: 400 }
      );
    }

    const imageUrl = result.result.variants[0].replace(/\/public$/, "");

    // Analyze the image with OpenAI
    const analysisResponse = await fetch(
      `${request.nextUrl.origin}/api/openai/analyze-image`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          vehicleInfo: parsedVehicleInfo,
        }),
      }
    );

    let combinedMetadata = {};

    if (analysisResponse.ok) {
      const analysisResult = await analysisResponse.json();
      // Combine the original metadata with the AI analysis
      combinedMetadata = {
        ...parsedMetadata,
        angle: analysisResult.analysis?.angle || "",
        view: analysisResult.analysis?.view || "",
        movement: analysisResult.analysis?.movement || "",
        tod: analysisResult.analysis?.tod || "",
        side: analysisResult.analysis?.side || "",
        description: analysisResult.analysis?.description || "",
        aiAnalysis: analysisResult.analysis,
      };
    } else {
      const errorText = await analysisResponse.text();
      console.error("OpenAI analysis error:", {
        status: analysisResponse.status,
        statusText: analysisResponse.statusText,
        body: errorText,
      });
      combinedMetadata = parsedMetadata;
    }

    // Store the image metadata in MongoDB
    mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DB || "motive_archive");
    const collections = {
      images: db.collection("images"),
      cars: db.collection("cars"),
    } as Collections;

    const imageDoc = {
      _id: new ObjectId(),
      cloudflareId: result.result.id,
      url: imageUrl,
      filename: file.name,
      metadata: combinedMetadata,
      carId: new ObjectId(carId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Insert the image document
    await collections.images.insertOne(imageDoc);

    // Update the car document with the new image ID
    await collections.cars.updateOne(
      { _id: new ObjectId(carId) },
      {
        $push: { imageIds: imageDoc._id },
        $set: { updatedAt: new Date().toISOString() },
      }
    );

    // Return both the image ID, URL, and the metadata
    return NextResponse.json({
      success: true,
      imageId: result.result.id,
      imageUrl,
      metadata: combinedMetadata,
    });
  } catch (error) {
    console.error("Error uploading to Cloudflare Images:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

export async function DELETE(request: NextRequest) {
  let mongoClient;
  try {
    const requestData = await request.json();
    const { imageIds = [], cloudflareIds = [] } = requestData;

    console.log("======== CLOUDFLARE DIRECT DELETE API CALLED ========");
    console.log("Request URL:", request.url);
    console.log(
      "Request headers:",
      Object.fromEntries([...request.headers.entries()])
    );
    console.log("DELETE body:", JSON.stringify(requestData, null, 2));

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
        console.log(`Attempting to delete image ${id} from Cloudflare`);
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
          console.log(`Successfully deleted image ${id} from Cloudflare`);
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
    mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DB || "motive_archive");
    const imagesCollection = db.collection("images");
    const carsCollection = db.collection("cars");

    // First check if these are UUIDs rather than ObjectIds (Cloudflare IDs)
    // Handle both ObjectIds and string IDs to maximize compatibility
    console.log("Building query to match MongoDB documents...");

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

    console.log(`Generated ${objectIdQuery.length} valid ObjectId queries`);

    const cloudflareIdQuery = { cloudflareId: { $in: allPossibleIds } };

    // Build the final query conditions
    const queryConditions = [];
    if (objectIdQuery.length > 0) queryConditions.push(...objectIdQuery);
    queryConditions.push(cloudflareIdQuery);

    const query = { $or: queryConditions };
    console.log("Final MongoDB query:", JSON.stringify(query, null, 2));

    // Find all matching images
    const imagesToDelete = await imagesCollection.find(query).toArray();
    console.log(`Found ${imagesToDelete.length} images to delete in MongoDB`);

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

        // 1. Remove image ID from the car document
        const carUpdateResult = await carsCollection.updateOne(
          { _id: image.carId },
          { $pull: { imageIds: image._id } as any }
        );

        console.log(`Car update result: ${JSON.stringify(carUpdateResult)}`);

        // 2. Delete the image document
        const deleteResult = await imagesCollection.deleteOne({
          _id: image._id,
        });
        console.log(`Image deletion result: ${JSON.stringify(deleteResult)}`);

        const resultItem = {
          imageId: image._id.toString(),
          cloudflareId: image.cloudflareId,
          carUpdateResult: carUpdateResult.modifiedCount > 0,
          imageDeleteResult: deleteResult.deletedCount > 0,
          success:
            carUpdateResult.modifiedCount > 0 && deleteResult.deletedCount > 0,
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
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}
