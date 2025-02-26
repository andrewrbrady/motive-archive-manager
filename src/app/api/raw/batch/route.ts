import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const rawCollection = db.collection("raw_assets");

    const { ids, carIds } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No assets selected" },
        { status: 400 }
      );
    }

    // Convert string IDs to ObjectIds
    const objectIds = ids.map((id) => new ObjectId(id));
    const carObjectIds = carIds.map((id: string) => new ObjectId(id));

    // Update all selected assets
    const result = await rawCollection.updateMany(
      { _id: { $in: objectIds } },
      {
        $set: {
          carIds: carObjectIds,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "No matching assets found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error updating raw assets:", error);
    return NextResponse.json(
      { error: "Failed to update raw assets" },
      { status: 500 }
    );
  }
}
