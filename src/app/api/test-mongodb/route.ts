import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("Testing MongoDB connection...");

    // Test connection
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "motive_archive");

    // Get basic stats
    const stats = await db.stats();
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    // Check cars collection specifically
    const carsCount = await db.collection("cars").countDocuments();
    const latestCars = await db
      .collection("cars")
      .find({})
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    // Environment information
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
      message: "Successfully connected to MongoDB",
      databaseName: db.databaseName,
      collectionCount: collections.length,
      collections: collectionNames,
      databaseStats: {
        dataSize:
          Math.round((stats.dataSize / (1024 * 1024)) * 100) / 100 + " MB",
        storageSize:
          Math.round((stats.storageSize / (1024 * 1024)) * 100) / 100 + " MB",
        documentsCount: stats.objects,
      },
      carsCollection: {
        documentCount: carsCount,
        latestCarId:
          latestCars.length > 0 ? latestCars[0]._id.toString() : null,
      },
      environment: envInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("MongoDB connection test failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Failed to connect to MongoDB",
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : String(error),
        environment: {
          nodeEnv: process.env.NODE_ENV,
          vercelEnv: process.env.VERCEL_ENV,
          region: process.env.VERCEL_REGION,
          hasMongoUri: !!process.env.MONGODB_URI,
          mongoUriStart: process.env.MONGODB_URI
            ? `${process.env.MONGODB_URI.substring(0, 15)}...`
            : null,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
