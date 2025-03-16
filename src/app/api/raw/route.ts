import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { RawAsset } from "@/models/raw_assets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "date";
  const direction = searchParams.get("direction") === "asc" ? 1 : -1;
  const client = searchParams.get("client") || "";
  const hardDriveId = searchParams.get("hardDriveId") || "";

  const skip = (page - 1) * limit;

  // Enhanced debug info to help diagnose issues
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    vercel: process.env.VERCEL === "1",
    database: process.env.MONGODB_DB || "motive_archive",
    connectionPoolSize: 5,
    hasCollection: false,
    returnedCount: 0,
    totalCount: 0,
    retryCount: 0,
    executedQuery: null as string | null,
  };

  console.time("raw-assets-api-fetch");

  const attemptFetch = async () => {
    try {
      const db = await getDatabase();
      const rawCollection = db.collection("raw_assets");

      // Check if the collection exists
      const collections = await db
        .listCollections({ name: "raw_assets" })
        .toArray();
      debugInfo.hasCollection = collections.length > 0;

      if (!debugInfo.hasCollection) {
        console.warn("Collection 'raw_assets' not found in database");
      }

      // Build query
      const query: any = {};

      if (search) {
        query.$or = [
          { date: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      if (client) {
        query.client = { $regex: client, $options: "i" };
      }

      if (hardDriveId) {
        try {
          // Check if it's a valid ObjectId
          query.hardDriveIds = new ObjectId(hardDriveId);
        } catch (e) {
          // If conversion to ObjectId fails, log the issue and try different approaches
          console.log(
            `Cannot convert hardDriveId ${hardDriveId} to ObjectId:`,
            e
          );

          // Try both string and ObjectId matching for maximum compatibility
          query.$or = query.$or || [];

          // Add both conditions: match as string or as ObjectId string representation
          query.$or.push(
            { hardDriveIds: hardDriveId },
            { hardDriveIds: { $regex: new RegExp(hardDriveId, "i") } }
          );
        }
      }

      // Store the executed query for debugging
      debugInfo.executedQuery = JSON.stringify(query);
      console.log("Executing MongoDB query:", debugInfo.executedQuery);

      // Get count for pagination
      const totalCount = await rawCollection.countDocuments(query);
      const totalPages = Math.ceil(totalCount / limit);

      // Update debug info
      debugInfo.totalCount = totalCount;
      console.log(`Found ${totalCount} total raw assets matching query`);

      // Get sorted and paginated results
      const sortOptions: Record<string, 1 | -1> = {};
      sortOptions[sort] = direction;

      const rawAssets = await rawCollection
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .toArray();

      // Update debug info
      debugInfo.returnedCount = rawAssets.length;
      console.log(`Returning ${rawAssets.length} raw assets for page ${page}`);

      // Ensure assets is always an array, even if the database returns null or undefined
      const safelyTypedAssets = Array.isArray(rawAssets) ? rawAssets : [];

      // Make sure to convert ObjectId values to strings and set default values
      const formattedAssets = safelyTypedAssets.map((asset) => ({
        ...asset,
        _id: asset._id?.toString() || "",
        // Set default values for required fields
        date: asset.date || "Unknown Date",
        description: asset.description || "",
        // Convert any ObjectId arrays to string arrays
        hardDriveIds: Array.isArray(asset.hardDriveIds)
          ? asset.hardDriveIds.map((id) => id?.toString() || "")
          : [],
        carIds: Array.isArray(asset.carIds)
          ? asset.carIds.map((id) => id?.toString() || "")
          : [],
      }));

      console.timeEnd("raw-assets-api-fetch");

      return NextResponse.json({
        data: formattedAssets,
        meta: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
        },
        debug: debugInfo,
      });
    } catch (error) {
      console.error("Error fetching raw assets:", error);
      throw error;
    }
  };

  try {
    return await attemptFetch();
  } catch (error) {
    console.error("Failed to fetch raw assets:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch raw assets",
        details: error instanceof Error ? error.message : String(error),
        debug: debugInfo,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const {
      date,
      description,
      hardDriveIds,
      carIds = [],
    } = await request.json();

    // Validate required fields
    if (!date || !description || !hardDriveIds) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const rawCollection = db.collection("raw_assets");

    // Create new raw asset
    const newAsset = {
      date,
      description,
      hardDriveIds: hardDriveIds.map((id: string) => new ObjectId(id)),
      carIds: carIds.map((id: string) => new ObjectId(id)),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await rawCollection.insertOne(newAsset);

    return NextResponse.json(
      {
        ...newAsset,
        _id: result.insertedId.toString(),
        hardDriveIds: hardDriveIds,
        carIds: carIds,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating raw asset:", error);
    return NextResponse.json(
      { error: "Failed to create raw asset" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const db = await getDatabase();
    const rawCollection = db.collection("raw_assets");

    // Delete all raw assets
    await rawCollection.deleteMany({});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting raw assets:", error);
    return NextResponse.json(
      { error: "Failed to delete raw assets" },
      { status: 500 }
    );
  }
}
