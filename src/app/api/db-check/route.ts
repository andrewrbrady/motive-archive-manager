import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

interface CarCollectionResult {
  count?: number;
  sampleCount?: number;
  sampleIds?: string[];
  fields?: string[];
  error?: string;
}

export async function GET() {
  try {
    console.log("Performing comprehensive database check...");

    // Connect to MongoDB
    const client = await clientPromise;

    // Get all available databases
    const adminDb = client.db().admin();
    let dbInfo;
    try {
      dbInfo = await adminDb.listDatabases();
      console.log(
        "Admin command successful, databases:",
        dbInfo.databases.map((db) => db.name)
      );
    } catch (adminError) {
      console.log("Admin command failed:", adminError);
      // Continue execution, might not have admin permissions
    }

    // Get current database name from environment or use default
    const DB_NAME = process.env.MONGODB_DB || "motive_archive";
    console.log("Using database from environment or default:", DB_NAME);

    // Get current database
    const db = client.db(DB_NAME);
    const dbName = db.databaseName;

    // List all collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    // Get document counts for each collection
    const collectionStats = [];
    for (const collName of collectionNames) {
      try {
        const count = await db.collection(collName).countDocuments({});
        const sample = await db.collection(collName).findOne({});
        collectionStats.push({
          name: collName,
          count,
          sampleDocumentKeys: sample ? Object.keys(sample) : [],
          sampleId: sample && sample._id ? sample._id.toString() : null,
        });
      } catch (collError) {
        collectionStats.push({
          name: collName,
          error:
            collError instanceof Error ? collError.message : String(collError),
        });
      }
    }

    // Try various ways to get cars
    const carResults: Record<string, CarCollectionResult> = {};
    const possibleCarCollections = [
      "cars",
      "Cars",
      "car",
      "Car",
      "vehicles",
      "Vehicles",
    ];

    for (const collName of possibleCarCollections) {
      if (!collectionNames.includes(collName)) continue;

      try {
        const count = await db.collection(collName).countDocuments({});
        const sampleCars = await db
          .collection(collName)
          .find({})
          .limit(3)
          .toArray();

        carResults[collName] = {
          count,
          sampleCount: sampleCars.length,
          sampleIds: sampleCars.map((car) => car._id.toString()),
          fields: sampleCars.length > 0 ? Object.keys(sampleCars[0]) : [],
        };
      } catch (carError) {
        carResults[collName] = {
          error:
            carError instanceof Error ? carError.message : String(carError),
        };
      }
    }

    // Check MongoDB connection string (redacted)
    const connStr = process.env.MONGODB_URI || "";
    const redactedConnStr = connStr
      .replace(/:([^@/]+)@/, ":****@")
      .replace(/mongodb\+srv:\/\/([^:]+):/, "mongodb+srv://$1:");

    // Check environment
    const environment = {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      region: process.env.VERCEL_REGION,
      vercelUrl: process.env.VERCEL_URL,
    };

    return NextResponse.json({
      status: "success",
      message: "Database check completed",
      connection: {
        uri: redactedConnStr,
        databaseName: dbName,
      },
      databases: dbInfo
        ? dbInfo.databases.map((db) => ({
            name: db.name,
            sizeOnDisk: db.sizeOnDisk,
          }))
        : null,
      collections: collectionStats,
      carCollections: carResults,
      environment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Database check failed",
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
