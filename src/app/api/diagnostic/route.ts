import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { MongoClient } from "mongodb";

export async function GET() {
  try {
    const db = await getDatabase();

    // Get database stats
    const stats = await db.stats();

    // Get collection stats
    const collections = await db.listCollections().toArray();
    const collectionStats = await Promise.all(
      collections.map(async (collection) => {
        const stats = await db.command({
          collStats: collection.name,
        });
        return {
          name: collection.name,
          stats,
        };
      })
    );

    // Get collection counts
    const collectionCounts = await Promise.all(
      collections.map(async (collection) => {
        const count = await db.collection(collection.name).countDocuments();
        return {
          name: collection.name,
          count,
        };
      })
    );

    // Get indexes for each collection
    const collectionIndexes = await Promise.all(
      collections.map(async (collection) => {
        const indexes = await db.collection(collection.name).indexes();
        return {
          name: collection.name,
          indexes,
        };
      })
    );

    // Get environment information
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      region: process.env.VERCEL_REGION,
      hasMongoUri: !!process.env.MONGODB_URI,
      mongoUriStart: process.env.MONGODB_URI
        ? `${process.env.MONGODB_URI.substring(0, 15)}...`
        : null,
      mongoDbName: process.env.MONGODB_DB || "motive_archive",
    };

    return NextResponse.json({
      status: "success",
      databaseStats: stats,
      collections: collections.map((c) => c.name),
      collectionStats,
      collectionCounts,
      collectionIndexes,
      environment: envInfo,
    });
  } catch (error) {
    console.error("Error in diagnostic route:", error);
    return NextResponse.json(
      {
        error: "Failed to get diagnostic information",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
