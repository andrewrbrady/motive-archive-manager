import { NextRequest, NextResponse } from "next/server";
import { ObjectId, UpdateFilter } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

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

// Add OPTIONS handler to make the endpoint testable
export async function OPTIONS(request: NextRequest) {
  console.log("========== BATCH OPTIONS REQUEST RECEIVED ==========");
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "DELETE, OPTIONS",
    },
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: Promise<string> } }
) {
  console.log("========== BATCH IMAGE DELETION API CALLED ==========");
  console.log("Request method:", request.method);
  console.log("Request URL:", request.url);

  try {
    const id = await context.params.id;
    console.log("Car ID from URL params:", id);

    // Validate car ID is valid ObjectId
    let carObjectId: ObjectId;
    try {
      carObjectId = new ObjectId(id);
    } catch (error) {
      console.error(`Invalid car ID format: ${id}`);
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    const requestData = await request.json();

    console.log(
      "DELETE images API called with data:",
      JSON.stringify(requestData, null, 2)
    );
    console.log("Request URL:", request.url);

    // Handle both single imageUrl and batch indices
    const {
      imageUrl,
      indices: rawIndices,
      imageIds: rawImageIds,
      imageId,
      cloudflareId,
      filename,
    } = requestData;

    // Ensure deleteFromStorage is interpreted as a boolean
    const deleteFromStorage = Boolean(requestData.deleteFromStorage);

    // Ensure indices is an array
    const indices = Array.isArray(rawIndices) ? rawIndices : [];

    // Ensure imageIds is an array
    const imageIds = Array.isArray(rawImageIds) ? rawImageIds : [];

    console.log("deleteFromStorage value:", deleteFromStorage);
    console.log("indices value:", indices);
    console.log("imageIds value:", imageIds);
    if (imageId) console.log("imageId provided:", imageId);
    if (cloudflareId) console.log("cloudflareId provided:", cloudflareId);
    if (filename) console.log("filename provided:", filename);

    if (!indices.length && !imageIds.length) {
      console.log("Error: No indices or imageIds provided in request");
      return NextResponse.json(
        { error: "No indices or imageIds provided for deletion" },
        { status: 400 }
      );
    }

    // Use the getDatabase helper
    const db = await getDatabase();
    const imagesCollection = db.collection<Image>("images");
    const carsCollection = db.collection<CarDocument>("cars");

    // First check if the car exists
    const carCheck = await carsCollection.findOne({ _id: carObjectId });
    console.log(
      `Car check result: Found=${!!carCheck}, imageIds=${
        carCheck?.imageIds?.length || 0
      }`
    );

    if (!carCheck) {
      console.log(`Error: Car with ID ${id} not found`);
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Get the car with its images
    const car = (await carsCollection
      .aggregate([
        { $match: { _id: carObjectId } },
        {
          $lookup: {
            from: "images",
            localField: "imageIds",
            foreignField: "_id",
            as: "images",
          },
        },
      ])
      .next()) as CarDocument;

    if (!car) {
      console.log(`Error: Car with ID ${id} not found after aggregation`);
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    console.log(`Found car with ID ${id}, checking image data...`);

    // Debug the image IDs stored in the car document
    console.log(
      `Car imageIds (${car.imageIds?.length || 0}):`,
      car.imageIds?.map((id) => id.toString()).slice(0, 5)
    );

    // Check if lookup worked correctly
    console.log(
      `Car images after lookup (${car.images?.length || 0}):`,
      car.images?.slice(0, 3).map((img) => ({
        id: img._id.toString(),
        url: img.url,
        cloudflareId: img.cloudflareId || "none",
      }))
    );

    // Try direct lookup if the aggregation didn't work
    if (!car.images || car.images.length === 0) {
      if (car.imageIds && car.imageIds.length > 0) {
        console.log(
          `No images found in lookup, but car has ${car.imageIds.length} imageIds. Trying direct image fetch.`
        );

        // Try to fetch images directly
        const imageObjectIds = car.imageIds
          .map((id) => {
            try {
              // Handle cases where imageIds might be stored as strings
              return typeof id === "string" ? new ObjectId(id) : id;
            } catch (e) {
              console.log(`Invalid ObjectId: ${id}`);
              return null;
            }
          })
          .filter((id) => id !== null);

        if (imageObjectIds.length > 0) {
          console.log(`Searching for ${imageObjectIds.length} image IDs`);
          try {
            const directImages = await imagesCollection
              .find({
                _id: { $in: imageObjectIds },
              })
              .toArray();

            console.log(
              `Direct image fetch found ${directImages.length} images`
            );

            if (directImages.length > 0) {
              car.images = directImages as Image[];
              console.log("Sample image data:", directImages[0]);
            } else {
              console.log("No images found with direct fetch");
            }
          } catch (fetchError) {
            console.error("Error fetching images directly:", fetchError);
          }
        }
      }
    }

    // If we still don't have images, try a different approach with the actual indices
    if (!car.images || car.images.length === 0) {
      console.log(
        `Still no images found. Trying to fetch all images for car ${id}`
      );

      // Try to fetch all images associated with this car
      const allCarImages = await imagesCollection
        .find({
          carId: carObjectId,
        })
        .toArray();

      console.log(`Found ${allCarImages.length} images associated with car ID`);

      if (allCarImages && allCarImages.length > 0) {
        car.images = allCarImages as Image[];
      }
    }

    if (!car.images || car.images.length === 0) {
      console.log(`Error: Car ${id} has no images (after all lookups)`);
      return NextResponse.json({ error: "No images found" }, { status: 404 });
    }

    console.log(`Car has ${car.images.length} images`);
    console.log(`Car imageIds: ${car.imageIds?.length} ids`);

    // Process all valid indices
    const validIndices = indices.filter(
      (index: number | string) =>
        typeof index === "number" && index >= 0 && index < car.images!.length
    );

    console.log(
      `Valid indices after filtering: ${validIndices.length}`,
      validIndices
    );

    // If we have imageIds, convert them to ObjectIds and query directly
    let imagesToDelete: Image[] = [];

    if (imageIds.length > 0) {
      console.log(`Finding images by ids: ${imageIds.join(", ")}`);

      // Convert string ids to ObjectIds
      const objectIds = [];
      for (const imageIdStr of imageIds) {
        try {
          if (
            typeof imageIdStr === "string" &&
            /^[0-9a-fA-F]{24}$/.test(imageIdStr)
          ) {
            objectIds.push(new ObjectId(imageIdStr));
          } else {
            console.error(`Invalid ObjectId format: ${imageIdStr}`);
          }
        } catch (e) {
          console.error(`Error converting to ObjectId: ${imageIdStr}`, e);
        }
      }

      console.log(`Converted ${objectIds.length} valid ObjectIds`);

      // Find images directly by their ids if we have any valid ones
      if (objectIds.length > 0) {
        const images = await imagesCollection
          .find({ _id: { $in: objectIds } })
          .toArray();

        console.log(`Found ${images.length} images by id`);
        imagesToDelete = images as Image[];
      }
    } else if (validIndices.length > 0) {
      // Use indices to get images if no imageIds were provided
      imagesToDelete = validIndices.map((index: number) => car.images![index]);
    }

    console.log(
      `Found ${imagesToDelete.length} images to delete:`,
      imagesToDelete.map((img: Image) => ({
        id: img._id.toString(),
        url: img.url.substring(0, 30) + "...", // truncate for readability
        cloudflareId: img.cloudflareId,
      }))
    );

    if (imagesToDelete.length === 0) {
      console.log("Error: No valid images to delete");
      return NextResponse.json(
        { error: "No valid images to delete" },
        { status: 400 }
      );
    }

    // Track successful deletions
    const deletedImages = [];
    const failedImages = [];

    // Collect all imageIds to remove in one operation
    const imageIdsToRemove = [];

    // Delete each image
    for (const image of imagesToDelete) {
      try {
        console.log(
          `Deleting image: ${image._id.toString()}, url: ${image.url}`
        );

        // Convert image._id to string if it's an ObjectId
        const imageIdString =
          typeof image._id === "object" && image._id !== null
            ? image._id.toString()
            : image._id;

        // Add to the list of IDs to remove
        imageIdsToRemove.push(imageIdString);

        // Delete image document
        const deleteResult = await imagesCollection.deleteOne({
          _id: image._id,
        });
        console.log(`Delete result: ${JSON.stringify(deleteResult)}`);

        // Delete from Cloudflare if requested
        if (deleteFromStorage && image.cloudflareId) {
          try {
            console.log(
              `🔄 Attempting Cloudflare deletion for image ${image._id}, cloudflareId=${image.cloudflareId}`
            );
            console.log(
              `CLOUDFLARE_ACCOUNT_ID: ${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID?.substring(
                0,
                5
              )}...`
            );
            console.log(
              `CLOUDFLARE_API_TOKEN available: ${!!process.env
                .NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`
            );

            const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1/${image.cloudflareId}`;
            console.log(`Cloudflare DELETE URL: ${cloudflareUrl}`);

            const cloudflareResponse = await fetch(cloudflareUrl, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
              },
            });

            const cloudflareResult = await cloudflareResponse.json();
            console.log(
              `Cloudflare response status: ${cloudflareResponse.status}`
            );
            console.log(
              `Cloudflare response body: ${JSON.stringify(
                cloudflareResult,
                null,
                2
              )}`
            );

            if (!cloudflareResponse.ok) {
              console.error(
                `❌ ERROR deleting from Cloudflare: ${
                  cloudflareResult.errors?.[0]?.message || "Unknown error"
                }`,
                cloudflareResult
              );
            } else {
              console.log(
                `✅ Successfully deleted image from Cloudflare: ${image.cloudflareId}`
              );
            }
          } catch (cloudflareError) {
            console.error(
              `❌ EXCEPTION in Cloudflare deletion for image ${image._id}:`,
              cloudflareError
            );
          }
        } else {
          console.log(
            `⚠️ SKIPPING Cloudflare deletion for image ${
              image._id
            } - deleteFromStorage=${deleteFromStorage}, cloudflareId=${
              image.cloudflareId || "none"
            }`
          );
        }

        deletedImages.push({
          id: image._id.toString(),
          url: image.url,
        });
      } catch (error) {
        console.error(`Error deleting image ${image._id.toString()}:`, error);
        failedImages.push({
          id: image._id.toString(),
          url: image.url,
          error: String(error),
        });
      }
    }

    // After all image documents are deleted and Cloudflare requests made,
    // update the car document in a single operation
    try {
      // If we deleted all images, set imageIds to an empty array explicitly
      if (
        deletedImages.length === imagesToDelete.length &&
        imagesToDelete.length > 0
      ) {
        console.log(`All images deleted, setting imageIds to empty array`);
        await carsCollection.updateOne(
          { _id: carObjectId },
          {
            $set: {
              imageIds: [],
              updatedAt: new Date().toISOString(),
            },
          }
        );
      } else if (imageIdsToRemove.length > 0) {
        // Otherwise, remove only the specific image IDs in one operation
        console.log(
          `Removing ${imageIdsToRemove.length} image IDs from car document`
        );
        await carsCollection.updateOne(
          { _id: carObjectId },
          {
            $pullAll: { imageIds: imageIdsToRemove },
            $set: { updatedAt: new Date().toISOString() },
          }
        );
      }

      // Double-check that the car document was updated correctly
      const updatedCar = await carsCollection.findOne({
        _id: carObjectId,
      });
      console.log(
        `Updated car imageIds count: ${updatedCar?.imageIds?.length || 0}`
      );
    } catch (refreshError) {
      console.error(`Error updating car document: ${refreshError}`);
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedImages.length} images${
        failedImages.length > 0
          ? `, failed to delete ${failedImages.length} images`
          : ""
      }`,
      deletedImages,
      failedImages: failedImages.length > 0 ? failedImages : undefined,
    });
  } catch (error) {
    console.error("❌ CRITICAL ERROR in batch delete API route:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
