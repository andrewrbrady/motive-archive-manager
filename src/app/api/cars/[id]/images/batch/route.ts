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
      console.log(`Error: Car with ID ${id} not found`);
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

    const imagesToDelete = validIndices.map((index) => car.images![index]);

    if (imagesToDelete.length === 0) {
      console.log("Error: No valid images to delete after filtering indices");
      return NextResponse.json(
        { error: "No valid images to delete" },
        { status: 400 }
      );
    }

    console.log(
      `Found ${imagesToDelete.length} images to delete:`,
      imagesToDelete.map((img) => ({
        id: img._id.toString(),
        url: img.url,
        cloudflareId: img.cloudflareId,
      }))
    );

    // Delete each image
    for (const image of imagesToDelete) {
      console.log(`Deleting image: ${image._id.toString()}, url: ${image.url}`);

      // Remove image ID from car
      await carsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $pull: { imageIds: image._id.toString() },
          $set: { updatedAt: new Date().toISOString() },
        }
      );

      // Delete image document
      await imagesCollection.deleteOne({ _id: image._id });

      // Delete from Cloudflare if requested
      if (deleteFromStorage && image.cloudflareId) {
        try {
          console.log(`Deleting from Cloudflare: ${image.cloudflareId}`);
          await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${image.cloudflareId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
              },
            }
          );
        } catch (cloudflareError) {
          console.error("Error deleting from Cloudflare:", cloudflareError);
          // Continue with other deletions
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${imagesToDelete.length} images`,
      deletedImages: imagesToDelete.map((img) => ({
        id: img._id.toString(),
        url: img.url,
      })),
    });
  } catch (error) {
    console.error("Error in batch delete:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
