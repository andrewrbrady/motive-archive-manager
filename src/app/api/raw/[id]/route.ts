import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { RawAsset } from "@/models/raw_assets";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const rawCollection = db.collection("raw_assets");

    const rawAsset = await rawCollection.findOne({
      _id: new ObjectId(params.id),
    });

    if (!rawAsset) {
      return NextResponse.json(
        { error: "Raw asset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(rawAsset);
  } catch (error) {
    console.error("Error fetching raw asset:", error);
    return NextResponse.json(
      { error: "Failed to fetch raw asset" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json();
    const db = await getDatabase();
    const rawCollection = db.collection("raw_assets");

    // Validate ID format
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: "Invalid asset ID format" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!updates.date || !updates.description) {
      return NextResponse.json(
        { error: "Missing required fields: date and description are required" },
        { status: 400 }
      );
    }

    // Validate date format (YYMMDD)
    if (!/^\d{6}$/.test(updates.date)) {
      return NextResponse.json(
        { error: "Date must be in YYMMDD format" },
        { status: 400 }
      );
    }

    // Prepare the update object - remove _id if present to prevent immutable field error
    const { _id, ...updateFields } = updates;
    const updateData = {
      ...updateFields,
      updatedAt: new Date(),
    };

    // Convert IDs if present
    if (Array.isArray(updateData.hardDriveIds)) {
      try {
        updateData.hardDriveIds = updateData.hardDriveIds.map(
          (id: string | any) => {
            // Handle different input formats
            if (typeof id === "object" && id !== null) {
              // If it's already an ObjectId or similar object with toString
              return id.toString ? new ObjectId(id.toString()) : id;
            } else if (typeof id === "string") {
              // If it's a string
              return ObjectId.isValid(id) ? new ObjectId(id) : id;
            }
            // Return as is if we can't handle it
            return id;
          }
        );
      } catch (error) {
        console.error("Error converting hardDriveIds:", error);
        return NextResponse.json(
          { error: "Invalid hard drive ID format" },
          { status: 400 }
        );
      }
    }

    if (Array.isArray(updateData.carIds)) {
      try {
        updateData.carIds = updateData.carIds.map((id: string) =>
          ObjectId.isValid(id) ? new ObjectId(id) : id
        );
      } catch (error) {
        console.error("Error converting carIds:", error);
        return NextResponse.json(
          { error: "Invalid car ID format" },
          { status: 400 }
        );
      }
    }

    // Attempt to update the document
    const result = await rawCollection.findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Raw asset not found" },
        { status: 404 }
      );
    }

    // Format the response
    const formattedResult = {
      ...result,
      _id: result._id.toString(),
      hardDriveIds: result.hardDriveIds?.map((id: any) => id.toString()) || [],
      carIds: result.carIds?.map((id: any) => id.toString()) || [],
      createdAt: result.createdAt
        ? typeof result.createdAt === "string"
          ? result.createdAt
          : result.createdAt instanceof Date
          ? result.createdAt.toISOString()
          : result.createdAt
        : null,
      updatedAt: result.updatedAt
        ? typeof result.updatedAt === "string"
          ? result.updatedAt
          : result.updatedAt instanceof Date
          ? result.updatedAt.toISOString()
          : result.updatedAt
        : null,
    };

    return NextResponse.json(formattedResult);
  } catch (error) {
    console.error("Error updating raw asset:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to update raw asset",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const rawCollection = db.collection("raw_assets");

    // Validate ID format
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: "Invalid asset ID format" },
        { status: 400 }
      );
    }

    // Check if the asset exists before trying to delete
    const asset = await rawCollection.findOne({ _id: new ObjectId(params.id) });
    if (!asset) {
      return NextResponse.json(
        { error: "Raw asset not found" },
        { status: 404 }
      );
    }

    // Attempt to delete the asset
    const result = await rawCollection.deleteOne({
      _id: new ObjectId(params.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete asset" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Asset deleted successfully",
      deletedId: params.id,
    });
  } catch (error) {
    console.error("Error deleting raw asset:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to delete raw asset",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
