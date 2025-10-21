import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
// Avoid importing Mongoose model to prevent creating extra connections
type MediaTypeUpdate = {
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: Date;
};
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    const { id } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid media type ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    if (!db) {
      console.error("Failed to get database instance");
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const mediaType = await db
      .collection("media_types")
      .findOne({ _id: new ObjectId(id) });

    if (!mediaType) {
      return NextResponse.json(
        { error: "Media type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ mediaType });
  } catch (error) {
    console.error("Error fetching media type:", error);
    return NextResponse.json(
      { error: "Failed to fetch media type" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication with admin role requirement
    const authResult = await verifyAuthMiddleware(request, ["admin"]);
    if (authResult) {
      return authResult;
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, sortOrder, isActive } = body;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid media type ID" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required and must be a valid string" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    if (!db) {
      console.error("Failed to get database instance");
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    // Check if another media type with the same name exists (excluding current)
    const existingMediaType = await db.collection("media_types").findOne({
      name: name.trim(),
      _id: { $ne: new ObjectId(id) },
    });

    if (existingMediaType) {
      return NextResponse.json(
        { error: "Media type with this name already exists" },
        { status: 409 }
      );
    }

    // Prepare update data
    const updateData: Partial<MediaTypeUpdate> = {
      name: name.trim(),
      description: description?.trim() || "",
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      isActive: typeof isActive === "boolean" ? isActive : true,
      updatedAt: new Date(),
    };

    const result = await db
      .collection("media_types")
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: "after" }
      );

    if (!result) {
      return NextResponse.json(
        { error: "Media type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Media type updated successfully",
      mediaType: result,
    });
  } catch (error: any) {
    console.error("Error updating media type:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Media type with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update media type" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication with admin role requirement
    const authResult = await verifyAuthMiddleware(request, ["admin"]);
    if (authResult) {
      return authResult;
    }

    const { id } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid media type ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    if (!db) {
      console.error("Failed to get database instance");
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    // Check if media type is being used by any deliverables
    const deliverableCount = await db
      .collection("deliverables")
      .countDocuments({ mediaTypeId: new ObjectId(id) });

    if (deliverableCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete media type. It is currently used by ${deliverableCount} deliverable(s). Please reassign those deliverables first.`,
        },
        { status: 409 }
      );
    }

    const result = await db
      .collection("media_types")
      .findOneAndDelete({ _id: new ObjectId(id) });

    if (!result) {
      return NextResponse.json(
        { error: "Media type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Media type deleted successfully",
      mediaType: result,
    });
  } catch (error) {
    console.error("Error deleting media type:", error);
    return NextResponse.json(
      { error: "Failed to delete media type" },
      { status: 500 }
    );
  }
}
