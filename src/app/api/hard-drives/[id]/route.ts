import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { HardDrive } from "@/models/hard-drive";

interface HardDriveAsset {
  _id: ObjectId;
  date: string;
  description: string;
  hardDriveIds: ObjectId[];
  carIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

interface HardDriveDocument {
  _id: ObjectId;
  name: string;
  description: string;
  capacity: number;
  rawAssetIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const hardDrivesCollection =
      db.collection<HardDriveDocument>("hard_drives");

    const hardDrive = await hardDrivesCollection.findOne({
      _id: new ObjectId(params.id),
    });

    if (!hardDrive) {
      return NextResponse.json(
        { error: "Hard drive not found" },
        { status: 404 }
      );
    }

    // Convert ObjectIds to strings for response
    const formattedDrive = {
      ...hardDrive,
      _id: hardDrive._id.toString(),
      rawAssetIds: hardDrive.rawAssetIds?.map((id) => id.toString()) || [],
    };

    return NextResponse.json(formattedDrive);
  } catch (error) {
    console.error("Error fetching hard drive:", error);
    return NextResponse.json(
      { error: "Failed to fetch hard drive" },
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
    const hardDrivesCollection =
      db.collection<HardDriveDocument>("hard_drives");
    const rawAssetsCollection = db.collection<HardDriveAsset>("raw_assets");

    // Validate required fields
    if (!updates.name || !updates.description || !updates.capacity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Convert rawAssetIds to ObjectIds if present
    if (updates.rawAssetIds) {
      updates.rawAssetIds = updates.rawAssetIds.map(
        (id: string) => new ObjectId(id)
      );

      // Verify all assets exist
      const assetCount = await rawAssetsCollection.countDocuments({
        _id: { $in: updates.rawAssetIds },
      });

      if (assetCount !== updates.rawAssetIds.length) {
        return NextResponse.json(
          { error: "One or more raw assets not found" },
          { status: 400 }
        );
      }
    }

    // Add updatedAt timestamp
    updates.updatedAt = new Date();

    const result = await hardDrivesCollection.findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      { $set: updates },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Hard drive not found" },
        { status: 404 }
      );
    }

    // Convert ObjectIds back to strings for response
    const formattedResult = {
      ...result,
      _id: result._id.toString(),
      rawAssetIds: result.rawAssetIds?.map((id) => id.toString()) || [],
    };

    return NextResponse.json(formattedResult);
  } catch (error) {
    console.error("Error updating hard drive:", error);
    return NextResponse.json(
      { error: "Failed to update hard drive" },
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
    const hardDrivesCollection =
      db.collection<HardDriveDocument>("hard_drives");

    const result = await hardDrivesCollection.deleteOne({
      _id: new ObjectId(params.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Hard drive not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting hard drive:", error);
    return NextResponse.json(
      { error: "Failed to delete hard drive" },
      { status: 500 }
    );
  }
}
