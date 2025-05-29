import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getFormattedImageUrl } from "@/lib/cloudflare";

// GET gallery by ID
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid gallery ID format" },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);
    const db = await getDatabase();
    const gallery = await db.collection("galleries").findOne({ _id: objectId });

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    // Get the images associated with this gallery
    const imageIds = gallery.imageIds.map((id: string) => new ObjectId(id));

    console.log(
      `[Gallery ${id}] Starting image lookup - ${gallery.imageIds.length} image IDs in gallery`
    );

    const images = await db
      .collection("images")
      .find({ _id: { $in: imageIds } })
      .toArray();

    console.log(
      `[Gallery ${id}] Found ${images.length} actual images in database`
    );

    // Check for orphaned image references and clean them up
    const foundImageIds = images.map((img) => img._id.toString());
    const originalImageIds = gallery.imageIds.map((id: any) => id.toString());
    const orphanedImageIds = originalImageIds.filter(
      (id: string) => !foundImageIds.includes(id)
    );

    console.log(`[Gallery ${id}] Image count analysis:`, {
      totalInGallery: originalImageIds.length,
      foundInDatabase: foundImageIds.length,
      orphaned: orphanedImageIds.length,
    });

    if (orphanedImageIds.length > 0) {
      console.log(
        `[Gallery ${id}] Found ${orphanedImageIds.length} orphaned image references out of ${originalImageIds.length} total:`,
        orphanedImageIds.slice(0, 5)
      );

      // Clean up the orphaned references
      const cleanImageIds = gallery.imageIds.filter((id: ObjectId | string) => {
        const idString = typeof id === "string" ? id : id.toString();
        return foundImageIds.includes(idString);
      });

      const cleanOrderedImages =
        gallery.orderedImages?.filter(
          (item: { id: ObjectId | string; order: number }) => {
            const idString =
              typeof item.id === "string" ? item.id : item.id.toString();
            return foundImageIds.includes(idString);
          }
        ) || [];

      // Update the gallery to remove orphaned references
      await db.collection("galleries").updateOne(
        { _id: objectId },
        {
          $set: {
            imageIds: cleanImageIds,
            orderedImages: cleanOrderedImages,
            updatedAt: new Date().toISOString(),
          },
        }
      );

      console.log(
        `[Gallery ${id}] Cleaned up gallery - ${cleanImageIds.length} valid images remaining`
      );
    }

    // Check if orderedImages is incomplete compared to imageIds
    const currentImageIds = foundImageIds;
    const currentOrderedImages =
      gallery.orderedImages?.filter(
        (item: { id: ObjectId | string; order: number }) => {
          const idString =
            typeof item.id === "string" ? item.id : item.id.toString();
          return foundImageIds.includes(idString);
        }
      ) || [];

    const orderedImageIds = currentOrderedImages.map((item: any) =>
      typeof item.id === "string" ? item.id : item.id.toString()
    );

    const missingFromOrdered = currentImageIds.filter(
      (id) => !orderedImageIds.includes(id)
    );

    if (missingFromOrdered.length > 0) {
      console.log(
        `[Gallery ${id}] orderedImages is incomplete - missing ${missingFromOrdered.length} images:`,
        missingFromOrdered.slice(0, 5)
      );

      // Rebuild orderedImages to include all valid images
      const rebuiltOrderedImages = [
        // Keep existing ordered images with their current order
        ...currentOrderedImages,
        // Add missing images at the end
        ...missingFromOrdered.map((id, index) => ({
          id,
          order: currentOrderedImages.length + index,
        })),
      ];

      // Update the gallery with complete orderedImages
      await db.collection("galleries").updateOne(
        { _id: objectId },
        {
          $set: {
            orderedImages: rebuiltOrderedImages,
            updatedAt: new Date().toISOString(),
          },
        }
      );

      console.log(
        `[Gallery ${id}] Rebuilt orderedImages - now includes all ${rebuiltOrderedImages.length} images`
      );

      // Update the gallery object for the response
      gallery.orderedImages = rebuiltOrderedImages;
    }

    // Process the response
    return NextResponse.json({
      ...gallery,
      _id: gallery._id.toString(),
      imageIds: foundImageIds, // Return only the valid image IDs
      orderedImages:
        gallery.orderedImages
          ?.filter((item: any) => foundImageIds.includes(item.id.toString()))
          .map((item: any) => ({
            id: item.id.toString(),
            order: item.order,
          })) || [],
      images: images.map((img) => ({
        ...img,
        _id: img._id.toString(),
        url: getFormattedImageUrl(img.url), // Format the URL with /public suffix
      })),
      // Add debugging info
      _debug: {
        originalImageCount: originalImageIds.length,
        foundImageCount: foundImageIds.length,
        orphanedImageCount: orphanedImageIds.length,
        cleanupPerformed: orphanedImageIds.length > 0,
        orderedImagesRebuilt: missingFromOrdered.length > 0,
        orderedImagesMissing: missingFromOrdered.length,
      },
    });
  } catch (error) {
    console.error("Error fetching gallery:", error);
    return NextResponse.json(
      { error: "Failed to fetch gallery" },
      { status: 500 }
    );
  }
}

// PUT/UPDATE gallery
export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];
    const body = await request.json();
    const { name, description, imageIds, orderedImages } = body;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid gallery ID format" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Gallery name is required" },
        { status: 400 }
      );
    }

    // Convert string IDs to ObjectIds
    const processedImageIds = (imageIds || []).map((id: string) => {
      if (!ObjectId.isValid(id)) {
        throw new Error(`Invalid image ID format: ${id}`);
      }
      return new ObjectId(id);
    });

    const objectId = new ObjectId(id);
    const db = await getDatabase();
    const galleriesCollection = db.collection("galleries");

    const update = {
      $set: {
        name,
        description,
        imageIds: processedImageIds,
        orderedImages: orderedImages || null,
        updatedAt: new Date().toISOString(),
      },
    };

    const result = await galleriesCollection.findOneAndUpdate(
      { _id: objectId },
      update,
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    // Convert ObjectIds back to strings for the response
    return NextResponse.json({
      ...result,
      _id: result._id.toString(),
      imageIds: result.imageIds.map((id: ObjectId) => id.toString()),
    });
  } catch (error) {
    console.error("Error updating gallery:", error);
    return NextResponse.json(
      { error: "Failed to update gallery" },
      { status: 500 }
    );
  }
}

// DELETE gallery
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid gallery ID format" },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);
    const db = await getDatabase();
    const result = await db
      .collection("galleries")
      .deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting gallery:", error);
    return NextResponse.json(
      { error: "Failed to delete gallery" },
      { status: 500 }
    );
  }
}
