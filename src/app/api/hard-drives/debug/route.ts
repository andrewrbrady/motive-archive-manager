import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface HardDriveDocument {
  _id: ObjectId;
  name: string;
  description: string;
  capacity: number;
  rawAssetIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export async function GET() {
  try {
    const db = await getDatabase();
    const hardDrivesCollection =
      db.collection<HardDriveDocument>("hard_drives");

    // Get all hard drives
    const hardDrives = await hardDrivesCollection.find({}).toArray();

    // Get database stats
    const stats = await db.stats();

    // Get collection stats
    const collectionStats = await db.command({
      collStats: "hard_drives",
    });

    // Get collection indexes
    const indexes = await hardDrivesCollection.indexes();

    // Format response
    const response = {
      hardDrives: hardDrives.map((drive) => ({
        ...drive,
        _id: drive._id.toString(),
        rawAssetIds: drive.rawAssetIds?.map((id) => id.toString()) || [],
      })),
      stats: {
        database: stats,
        collection: collectionStats,
        indexes,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        region: process.env.VERCEL_REGION,
        hasMongoUri: !!process.env.MONGODB_URI,
        mongoUriStart: process.env.MONGODB_URI
          ? `${process.env.MONGODB_URI.substring(0, 15)}...`
          : null,
        mongoDbName: process.env.MONGODB_DB || "motive_archive",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in hard drives debug route:", error);
    return NextResponse.json(
      {
        error: "Failed to get debug information",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
