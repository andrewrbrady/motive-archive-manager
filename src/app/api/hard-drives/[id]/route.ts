import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid hard drive ID format" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const hardDrivesCollection =
      db.collection<HardDriveDocument>("hard_drives");

    const hardDrive = await hardDrivesCollection.findOne({
      _id: new ObjectId(id),
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
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid hard drive ID format" },
        { status: 400 }
      );
    }

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
      try {
        updates.rawAssetIds = updates.rawAssetIds.map(
          (id: string) => new ObjectId(id)
        );
      } catch (err) {
        return NextResponse.json(
          { error: "Invalid raw asset ID format" },
          { status: 400 }
        );
      }

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

    const result = await hardDrivesCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Hard drive not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid hard drive ID format" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const hardDrivesCollection =
      db.collection<HardDriveDocument>("hard_drives");
    const rawAssetsCollection = db.collection<HardDriveAsset>("raw_assets");

    // Get the hard drive to check if it exists and get its raw assets
    const hardDrive = await hardDrivesCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!hardDrive) {
      return NextResponse.json(
        { error: "Hard drive not found" },
        { status: 404 }
      );
    }

    // Remove the hard drive ID from all associated raw assets
    if (hardDrive.rawAssetIds?.length > 0) {
      await rawAssetsCollection.updateMany(
        { _id: { $in: hardDrive.rawAssetIds } },
        {
          $pull: {
            hardDriveIds: new ObjectId(id),
          },
        }
      );
    }

    // Delete the hard drive
    const result = await hardDrivesCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete hard drive" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
