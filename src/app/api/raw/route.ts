import { NextResponse } from "next/server";
import {
  getMongoClient,
  getDatabase,
  validateConnection,
  ensureCollectionExists,
  type MongoDebugInfo,
} from "@/lib/mongodb";
import { RawAsset, RawAssetData } from "../../../models/raw_assets";
import { ObjectId } from "mongodb";

// Helper function for timeouts with better error messages
const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> => {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(`Operation '${operation}' timed out after ${timeoutMs}ms`)
      );
    }, timeoutMs);
  });

  try {
    // Race the original promise against the timeout
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result as T;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const currentPage = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");
  const skip = (currentPage - 1) * limit;
  const sort = searchParams.get("sort") || "createdAt";
  const direction = searchParams.get("direction") === "asc" ? 1 : -1;
  const search = searchParams.get("search") || "";
  const client = searchParams.get("client") || "";
  const hardDriveId = searchParams.get("hardDriveId") || "";

  // Create debug info object
  const debugInfo: MongoDebugInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    vercel: process.env.VERCEL === "1",
    database: process.env.MONGODB_DB || "motive_archive",
    connectionPoolSize: 10,
    connectionStatus: "error",
    retryCount: 0,
  };

  let mongoClient;
  let hasCollection = false;
  let retryCount = 0;
  const maxRetries = 3;

  // Function to attempt fetching with retry
  async function attemptFetch() {
    try {
      // Check connection validity first
      const isConnected = await validateConnection();
      if (!isConnected) {
        throw new Error("MongoDB connection validation failed");
      }

      // Get MongoDB client
      mongoClient = await getMongoClient(2, 500);

      // Use our enhanced collection check function
      const { exists, client: collectionClient } = await ensureCollectionExists(
        "raw_assets",
        mongoClient
      );
      mongoClient = collectionClient;
      hasCollection = exists;

      debugInfo.hasCollection = hasCollection;
      debugInfo.connectionStatus = "success";

      // If collection doesn't exist, return empty result
      if (!hasCollection) {
        return NextResponse.json(
          {
            data: [],
            meta: {
              page: currentPage,
              limit,
              total: 0,
              totalPages: 0,
            },
            debug: {
              ...debugInfo,
              returnedCount: 0,
              totalCount: 0,
            },
          },
          { status: 200 }
        );
      }

      // Make sure client is defined before using it
      if (!mongoClient) {
        throw new Error("MongoDB client is undefined after collection check");
      }

      // Get database and collection
      const db = mongoClient.db();
      const rawCollection = db.collection("raw_assets");

      // Build query
      const query: Record<string, any> = {};

      if (search) {
        query.$or = [
          { description: { $regex: search, $options: "i" } },
          { client: { $regex: search, $options: "i" } },
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
          query.hardDriveIds = hardDriveId;
        }
      }

      // Get count for pagination
      const totalCount = await rawCollection.countDocuments(query);
      const totalPages = Math.ceil(totalCount / limit);

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
      debugInfo.totalCount = totalCount;
      debugInfo.retryCount = retryCount;

      return NextResponse.json(
        {
          data: rawAssets,
          meta: {
            page: currentPage,
            limit,
            total: totalCount,
            totalPages,
          },
          debug: debugInfo,
        },
        { status: 200 }
      );
    } catch (error) {
      // Check if we should retry
      if (retryCount < maxRetries) {
        retryCount++;
        debugInfo.retryCount = retryCount;
        console.log(
          `Retrying raw assets fetch (attempt ${retryCount} of ${maxRetries})`
        );

        // Exponential backoff
        const delay = Math.min(100 * Math.pow(2, retryCount), 1000);
        await new Promise((resolve) => setTimeout(resolve, delay));

        return attemptFetch();
      }

      // All retries failed, throw the error
      throw error;
    }
  }

  try {
    return await attemptFetch();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Error fetching raw assets: ${errorMessage}`);

    // Handle different types of errors
    const isConnectionError =
      errorMessage.includes("connect") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("network");

    const statusCode = isConnectionError ? 503 : 500;

    return NextResponse.json(
      {
        error: "Failed to fetch raw assets",
        message: errorMessage,
        data: [],
        meta: {
          page: currentPage,
          limit,
          total: 0,
          totalPages: 0,
        },
        debug: {
          ...debugInfo,
          connectionStatus: "error",
          connectionError: errorMessage,
          retryCount,
          hasCollection,
        },
      },
      { status: statusCode }
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
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    // Create new raw asset
    const client = await getMongoClient(3, 1000);
    const db = client.db();
    const rawCollection = db.collection("raw_assets");
    const newAsset = await RawAsset.create({
      date,
      description,
      hardDriveIds,
      carIds,
    });

    return new Response(JSON.stringify(newAsset), { status: 201 });
  } catch (error) {
    console.error("Error creating raw asset:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create raw asset" }),
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const client = await getMongoClient(3, 1000);
    const db = client.db();
    const rawCollection = db.collection("raw_assets");

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
