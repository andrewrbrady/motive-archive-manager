import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface RawAsset {
  _id: ObjectId;
  date: string;
  description: string;
  hardDriveIds: ObjectId[];
  carIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export async function POST(request: Request) {
  try {
    const { assets } = await request.json();

    if (!Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json(
        { error: "No assets provided" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const rawCollection = db.collection<RawAsset>("raw_assets");

    // Validate and prepare assets
    const preparedAssets = assets.map((asset) => ({
      ...asset,
      hardDriveIds:
        asset.hardDriveIds?.map((id: string) => new ObjectId(id)) || [],
      carIds: asset.carIds?.map((id: string) => new ObjectId(id)) || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Insert all assets
    const result = await rawCollection.insertMany(preparedAssets);

    // Format response
    const insertedAssets = preparedAssets.map((asset, index) => ({
      ...asset,
      _id: result.insertedIds[index].toString(),
      hardDriveIds: asset.hardDriveIds.map((id: ObjectId) => id.toString()),
      carIds: asset.carIds.map((id: ObjectId) => id.toString()),
    }));

    return NextResponse.json({
      success: true,
      insertedCount: result.insertedCount,
      insertedAssets,
    });
  } catch (error) {
    console.error("Error importing raw assets:", error);
    return NextResponse.json(
      {
        error: "Failed to import assets",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
