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

    // Validate required fields
    if (!updates.date || !updates.description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Convert hardDriveIds to ObjectIds if present
    if (updates.hardDriveIds) {
      updates.hardDriveIds = updates.hardDriveIds.map(
        (id: string) => new ObjectId(id)
      );
    }

    // Convert carIds to ObjectIds if present
    if (updates.carIds) {
      updates.carIds = updates.carIds.map((id: string) => new ObjectId(id));
    }

    // Add updatedAt timestamp
    updates.updatedAt = new Date();

    const result = await rawCollection.findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      { $set: updates },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Raw asset not found" },
        { status: 404 }
      );
    }

    // Convert ObjectIds back to strings for response
    const formattedResult = {
      ...result,
      _id: result._id.toString(),
      hardDriveIds:
        result.hardDriveIds?.map((id: ObjectId) => id.toString()) || [],
      carIds: result.carIds?.map((id: ObjectId) => id.toString()) || [],
    };

    return NextResponse.json(formattedResult);
  } catch (error) {
    console.error("Error updating raw asset:", error);
    return NextResponse.json(
      { error: "Failed to update raw asset" },
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

    const result = await rawCollection.deleteOne({
      _id: new ObjectId(params.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Raw asset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting raw asset:", error);
    return NextResponse.json(
      { error: "Failed to delete raw asset" },
      { status: 500 }
    );
  }
}
