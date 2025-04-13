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
    const images = await db
      .collection("images")
      .find({ _id: { $in: imageIds } })
      .toArray();

    // Process the response
    return NextResponse.json({
      ...gallery,
      _id: gallery._id.toString(),
      images: images.map((img) => ({
        ...img,
        _id: img._id.toString(),
        url: getFormattedImageUrl(img.url), // Format the URL with /public suffix
      })),
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
