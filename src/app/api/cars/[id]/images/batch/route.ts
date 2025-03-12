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

export async function DELETE(
  request: NextRequest,
  context: { params: { id: Promise<string> } }
) {
  try {
    console.log("Batch delete API route called");
    const id = await context.params.id;
    const requestData = await request.json();

    console.log("Request data:", JSON.stringify(requestData));

    // Handle indices array
    const { indices, deleteFromStorage } = requestData;

    if (!indices || !Array.isArray(indices) || indices.length === 0) {
      console.log("Error: No valid indices provided in request");
      return NextResponse.json(
        { error: "No valid indices provided" },
        { status: 400 }
      );
    }

    console.log(`Processing batch delete for car ${id}, indices:`, indices);

    // Use the getDatabase helper
    const db = await getDatabase();
    const imagesCollection = db.collection<Image>("images");
    const carsCollection = db.collection<CarDocument>("cars");

    // First check if the car exists
    const carCheck = await carsCollection.findOne({ _id: new ObjectId(id) });
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
          const directImages = await imagesCollection
            .find({
              _id: { $in: imageObjectIds },
            })
            .toArray();

          console.log(`Direct image fetch found ${directImages.length} images`);
          car.images = directImages as Image[];
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
          carId: new ObjectId(id),
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
      (index) =>
        typeof index === "number" && index >= 0 && index < car.images!.length
    );

    console.log(
      `Valid indices after filtering: ${validIndices.length}`,
      validIndices
    );

    if (validIndices.length === 0) {
      console.log("Error: No valid images to delete after filtering indices");
      return NextResponse.json(
        { error: "No valid images to delete" },
        { status: 400 }
      );
    }

    const imagesToDelete = validIndices.map((index) => car.images![index]);

    console.log(
      `Found ${imagesToDelete.length} images to delete:`,
      imagesToDelete.map((img) => ({
        id: img._id.toString(),
        url: img.url.substring(0, 30) + "...", // truncate for readability
        cloudflareId: img.cloudflareId,
      }))
    );

    // Track successful deletions
    const deletedImages = [];
    const failedImages = [];

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

        // Remove image ID from car
        const updateResult = await carsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $pull: { imageIds: imageIdString },
            $set: { updatedAt: new Date().toISOString() },
          }
        );

        console.log(`Update result: ${JSON.stringify(updateResult)}`);

        // Delete image document
        const deleteResult = await imagesCollection.deleteOne({
          _id: image._id,
        });
        console.log(`Delete result: ${JSON.stringify(deleteResult)}`);

        // Delete from Cloudflare if requested
        if (deleteFromStorage && image.cloudflareId) {
          try {
            console.log(`Deleting from Cloudflare: ${image.cloudflareId}`);
            const cloudflareResponse = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${image.cloudflareId}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                },
              }
            );

            const cloudflareResult = await cloudflareResponse.json();
            console.log(
              `Cloudflare delete result: ${JSON.stringify(cloudflareResult)}`
            );

            if (!cloudflareResponse.ok) {
              console.error(
                `Error deleting from Cloudflare: ${
                  cloudflareResult.errors?.[0]?.message || "Unknown error"
                }`
              );
            }
          } catch (cloudflareError) {
            console.error("Error deleting from Cloudflare:", cloudflareError);
            // Continue with other deletions
          }
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

    // After all deletions, refresh the car document to ensure it's up to date
    // Use a more aggressive approach to ensure the car document is updated
    try {
      // First, get the current car document to see what imageIds are left
      const currentCar = await carsCollection.findOne({
        _id: new ObjectId(id),
      });
      console.log(`Current car imageIds: ${currentCar?.imageIds?.length || 0}`);

      // If we deleted all images, explicitly set imageIds to an empty array
      if (
        deletedImages.length === imagesToDelete.length &&
        imagesToDelete.length > 0
      ) {
        console.log(`All images deleted, setting imageIds to empty array`);
        await carsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              imageIds: [],
              updatedAt: new Date().toISOString(),
            },
          }
        );
      } else {
        // Otherwise, just update the timestamp
        await carsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { updatedAt: new Date().toISOString() } }
        );
      }
    } catch (refreshError) {
      console.error(`Error refreshing car document: ${refreshError}`);
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
    console.error("Error in batch delete:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
