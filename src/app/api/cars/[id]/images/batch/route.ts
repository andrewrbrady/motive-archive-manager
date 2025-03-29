import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

// This file handles batch image deletion requests more efficiently

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
  imageIds: string[] | ObjectId[];
  updatedAt?: string;
}

// Add OPTIONS handler to make the endpoint testable
export async function OPTIONS(request: NextRequest) {
  console.log("======== BATCH OPTIONS REQUEST RECEIVED ========");
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "DELETE, OPTIONS",
    },
  });
}

/**
 * Improved DELETE handler for batch image deletion - handles both UUID and ObjectId formats
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { id: Promise<string> } }
) {
  console.log("======== BATCH IMAGE DELETION API CALLED ========");
  console.log("Request URL:", request.url);
  console.log("Request method:", request.method);
  console.log(
    "Request headers:",
    Object.fromEntries([...request.headers.entries()])
  );

  try {
    const carId = await context.params.id;
    console.log("Car ID from URL params:", carId);

    // Parse request body
    const requestData = await request.json();
    console.log("Request data:", JSON.stringify(requestData, null, 2));

    // Extract and validate image IDs from request
    const {
      imageIds = [],
      cloudflareIds = [],
      deleteFromStorage = false,
    } = requestData;

    console.log("Received imageIds:", imageIds);
    console.log("Received cloudflareIds:", cloudflareIds);

    // Validate car ID
    let carObjectId: ObjectId;
    try {
      carObjectId = new ObjectId(carId);
    } catch (error) {
      console.error(`Invalid car ID format: ${carId}`);
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    // Connect to database
    const db = await getDatabase();
    const imagesCollection = db.collection<Image>("images");
    const carsCollection = db.collection<CarDocument>("cars");

    // First, try to find the images directly by their IDs
    const query = {
      carId: carObjectId,
      $or: [
        { cloudflareId: { $in: cloudflareIds } },
        {
          _id: {
            $in: imageIds.map((id: string) => {
              try {
                return new ObjectId(id);
              } catch (e) {
                return id;
              }
            }),
          },
        },
      ],
    };

    console.log("MongoDB query:", JSON.stringify(query, null, 2));

    // Find images to delete
    const imagesToDelete = await imagesCollection.find(query).toArray();
    console.log("Found images to delete:", imagesToDelete);

    // Track results
    const results = {
      success: true,
      deletedFromMongoDB: 0,
      removedFromCar: false,
      deletedFromCloudflare: 0,
      errors: [] as any[],
    };

    // Extract IDs for operations
    const imageIdsToDelete = imagesToDelete.map((img) => img._id);
    const cloudflareIdsToDelete = imagesToDelete
      .filter((img) => img.cloudflareId)
      .map((img) => img.cloudflareId);

    console.log(
      "MongoDB IDs to delete:",
      imageIdsToDelete.map((id) => id.toString())
    );
    console.log("Cloudflare IDs to delete:", cloudflareIdsToDelete);

    try {
      // 1. First, update the car document to remove image references
      const updateResult = await carsCollection.updateOne(
        { _id: carObjectId },
        {
          $pull: {
            imageIds: { $in: imageIdsToDelete.map((id) => id.toString()) },
          },
        }
      );

      results.removedFromCar = updateResult.modifiedCount > 0;
      console.log("Car update result:", updateResult);

      // 2. Then, delete from MongoDB images collection
      const deleteResult = await imagesCollection.deleteMany({
        _id: { $in: imageIdsToDelete },
      });

      results.deletedFromMongoDB = deleteResult.deletedCount || 0;
      console.log("MongoDB delete result:", deleteResult);

      // 3. Finally, delete from Cloudflare if requested
      if (deleteFromStorage && cloudflareIdsToDelete.length > 0) {
        const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
        const apiToken = process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN;

        if (!accountId || !apiToken) {
          throw new Error("Missing Cloudflare credentials");
        }

        for (const cloudflareId of cloudflareIdsToDelete) {
          try {
            console.log(`Deleting image ${cloudflareId} from Cloudflare`);
            const response = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${cloudflareId}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${apiToken}`,
                },
              }
            );

            const result = await response.json();
            if (result.success) {
              results.deletedFromCloudflare++;
              console.log(
                `Successfully deleted image ${cloudflareId} from Cloudflare`
              );
            } else {
              console.error(
                `Failed to delete image ${cloudflareId} from Cloudflare:`,
                result.errors
              );
              results.errors.push({
                operation: "cloudflare_delete",
                id: cloudflareId,
                errors: result.errors,
              });
            }
          } catch (error) {
            console.error(
              `Error deleting image ${cloudflareId} from Cloudflare:`,
              error
            );
            results.errors.push({
              operation: "cloudflare_delete",
              id: cloudflareId,
              error: String(error),
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Deleted ${results.deletedFromMongoDB} images`,
        deletedFromMongoDB: results.deletedFromMongoDB,
        removedFromCar: results.removedFromCar,
        deletedFromCloudflare: results.deletedFromCloudflare,
        errors: results.errors.length > 0 ? results.errors : undefined,
      });
    } catch (error) {
      console.error("Error in batch image deletion:", error);
      return NextResponse.json(
        {
          error: "Failed to process image deletion",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in batch image deletion:", error);
    return NextResponse.json(
      {
        error: "Failed to process image deletion",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
