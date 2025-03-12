// Location: app/api/cars/[id]/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId, UpdateFilter } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

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

export async function POST(
  request: NextRequest,
  context: { params: { id: Promise<string> } }
) {
  try {
    const id = await context.params.id;
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

    // Create new image document
    const imageDoc = {
      _id: new ObjectId(),
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
    console.log("Created new image document:", imageDoc._id);

    // Update the car document with the new image ID
    const updateDoc: UpdateFilter<CarDocument> = {
      $push: { imageIds: imageDoc._id.toString() },
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
    console.error("Error in POST /api/cars/[id]/images:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: Promise<string> } }
) {
  try {
    const id = await context.params.id;
    const requestData = await request.json();

    console.log(
      "DELETE images API called with data:",
      JSON.stringify(requestData)
    );
    console.log("Request URL:", request.url);

    // Handle both single imageUrl and batch indices
    const { imageUrl, deleteFromStorage, indices } = requestData;

    // Use the getDatabase helper
    const db = await getDatabase();
    const imagesCollection = db.collection<Image>("images");
    const carsCollection = db.collection<CarDocument>("cars");

    // If indices are provided, forward to the batch endpoint
    if (indices && Array.isArray(indices) && indices.length > 0) {
      console.log("Indices provided in main API, forwarding to batch endpoint");

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
        console.error(`Car not found with ID: ${id}`);
        return NextResponse.json({ error: "Car not found" }, { status: 404 });
      }

      if (!car.images || car.images.length === 0) {
        console.error(`No images found for car ID: ${id}`);
        return NextResponse.json({ error: "No images found" }, { status: 404 });
      }

      console.log(`Car has ${car.images.length} images`);
      console.log(`Car imageIds length: ${car.imageIds?.length}`);

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
        console.error("No valid images to delete after filtering indices");
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
        }))
      );

      // Track successful deletions
      const deletedImages = [];
      const failedImages = [];

      // Delete each image
      for (const image of imagesToDelete) {
        try {
          console.log(`Deleting image: ${image._id.toString()}`);

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
            url: image.url.substring(0, 30) + "...", // truncate for readability
          });
        } catch (error) {
          console.error(`Error deleting image ${image._id.toString()}:`, error);
          failedImages.push({
            id: image._id.toString(),
            url: image.url.substring(0, 30) + "...", // truncate for readability
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
        console.log(
          `Current car imageIds: ${currentCar?.imageIds?.length || 0}`
        );

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
    }

    // Handle single image deletion (original implementation)
    if (!imageUrl) {
      console.error("No image URL provided in request");
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 }
      );
    }

    console.log(`Looking for image with URL: ${imageUrl.substring(0, 30)}...`);

    // First, get the image details
    const image = await imagesCollection.findOne({ url: imageUrl });
    if (!image) {
      console.error(
        `Image not found with URL: ${imageUrl.substring(0, 30)}...`
      );
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    console.log(
      `Found image: ${image._id}, cloudflareId: ${image.cloudflareId}`
    );

    // Convert image._id to string if it's an ObjectId
    const imageIdString =
      typeof image._id === "object" && image._id !== null
        ? image._id.toString()
        : image._id;

    // Remove the image ID from the car document
    const pullDoc: UpdateFilter<CarDocument> = {
      $pull: { imageIds: imageIdString },
      $set: { updatedAt: new Date().toISOString() },
    };

    const result = await carsCollection.updateOne(
      { _id: new ObjectId(id) },
      pullDoc
    );

    if (result.matchedCount === 0) {
      console.error(`Car not found with ID: ${id}`);
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    console.log(`Updated car document, removed image ID: ${image._id}`);

    // Delete the image document from MongoDB
    await imagesCollection.deleteOne({ _id: image._id });
    console.log(`Deleted image document with ID: ${image._id}`);

    // Check if this was the last image and update the car document accordingly
    const updatedCar = await carsCollection.findOne({ _id: new ObjectId(id) });
    if (
      updatedCar &&
      (!updatedCar.imageIds || updatedCar.imageIds.length === 0)
    ) {
      console.log(
        `This was the last image, ensuring imageIds is an empty array`
      );
      await carsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { imageIds: [], updatedAt: new Date().toISOString() } }
      );
    }

    // Return success early to update UI state
    const response = NextResponse.json({
      success: true,
      message: "Image deleted successfully",
      deletedImage: {
        id: image._id.toString(),
        url: image.url.substring(0, 30) + "...", // truncate for readability
      },
    });

    // If deleteFromStorage is true, delete from Cloudflare after response is sent
    if (deleteFromStorage && image.cloudflareId) {
      console.log(`Deleting from Cloudflare: ${image.cloudflareId}`);
      // Delete from Cloudflare in the background
      fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${image.cloudflareId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          },
        }
      ).catch((error) => {
        console.error("Error deleting from Cloudflare:", error);
        // Log error but don't affect response
      });
    }

    return response;
  } catch (error) {
    console.error("Error deleting image(s):", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
