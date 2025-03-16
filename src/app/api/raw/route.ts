import { NextResponse } from "next/server";
import { getMongoClient, getDatabase, validateConnection } from "@/lib/mongodb";
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
  console.time("raw-assets-api");
  let retryCount = 0;
  const maxRetries = 3;
  let lastError: Error | null = null;

  async function attemptFetch() {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "10");
      const search = searchParams.get("search") || "";
      const skip = (page - 1) * limit;

      console.log(
        `Fetching raw assets: page=${page}, limit=${limit}, search=${search}`
      );

      // Validate connection before proceeding (new check)
      const isConnected = await validateConnection();
      if (!isConnected) {
        console.error(
          "MongoDB connection validation failed, cannot proceed with request"
        );
        return NextResponse.json(
          {
            error: "Database connection error",
            message: "Failed to establish database connection",
            assets: [],
            total: 0,
            currentPage: page,
            limit,
            totalPages: 0,
            debug: {
              environment: process.env.NODE_ENV,
              vercel: process.env.VERCEL === "1",
              timestamp: new Date().toISOString(),
              retryCount,
              database: process.env.MONGODB_DB || "motive_archive",
              connectionStatus: "failed",
            },
          },
          { status: 503 } // Service Unavailable
        );
      }

      // Use enhanced getMongoClient with retry mechanism
      const client = await getMongoClient(3, 500);
      const db = client.db();
      const rawCollection = db.collection("raw_assets");

      // Build query
      const query: any = {};

      if (search) {
        console.time("search-processing");
        // Split search terms and escape special regex characters
        const searchTerms = search
          .split(/\s+/)
          .filter((term) => term)
          .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

        console.log("Search terms:", searchTerms);

        // Create a regex that matches any of the terms
        const searchRegex = {
          $regex:
            searchTerms.length > 1
              ? searchTerms.join("|") // Match any of the terms
              : searchTerms[0] || "",
          $options: "i",
        };

        // Look for year patterns (4 digits)
        const yearTerms = searchTerms
          .filter((term) => /^\d{4}$/.test(term))
          .map((term) => parseInt(term));

        // Search directly without preprocessing car and drive relationships for better performance
        query.$or = [{ date: searchRegex }, { description: searchRegex }];

        // If there are specific year terms, add direct search on those years
        if (yearTerms.length > 0) {
          query.$or.push({
            date: {
              $in: yearTerms.map((year) => new RegExp(`${year}`, "i")),
            },
          });
        }
        console.timeEnd("search-processing");
      }

      // Quick check if the collection exists and contains data
      console.time("collection-check");
      const collectionExists = await withTimeout(
        rawCollection.findOne({}, { projection: { _id: 1 } }),
        2000,
        "raw-assets-collection-check"
      );
      console.timeEnd("collection-check");

      console.log(
        collectionExists
          ? "Raw assets collection exists with data"
          : "Raw assets collection may be empty"
      );

      console.time("count-query");
      // Get total count for pagination (with timeout)
      const totalCount = await withTimeout(
        new Promise<number>((resolve) => {
          rawCollection
            .countDocuments(query)
            .then((count) => resolve(count))
            .catch((err) => {
              console.error("Error in count query:", err);
              resolve(0); // Use default on error
            });
        }),
        5000,
        "raw-assets-count"
      );

      const totalPages = Math.ceil(totalCount / limit);
      console.timeEnd("count-query");
      console.log(`Found ${totalCount} raw assets matching criteria`);

      // Create pipeline for the main query
      const pipeline = [
        { $match: query },
        { $sort: { date: -1 } },
        { $skip: skip },
        { $limit: limit },
        // Use simplified lookups with minimal data projection for performance
        {
          $lookup: {
            from: "cars",
            localField: "carIds",
            foreignField: "_id",
            as: "cars",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  make: 1,
                  model: 1,
                  year: 1,
                  color: 1,
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "hard_drives",
            localField: "hardDriveIds",
            foreignField: "_id",
            as: "hardDrives",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  label: 1,
                  status: 1,
                },
              },
            ],
          },
        },
      ];

      console.time("main-query");
      // Execute the main query with timeout
      const assets = await withTimeout(
        rawCollection.aggregate(pipeline).toArray(),
        10000,
        "raw-assets-query"
      );
      console.timeEnd("main-query");
      console.log(`Query returned ${assets.length} raw assets`);

      // Format response
      const formattedAssets = assets.map((asset) => ({
        ...asset,
        _id: asset._id.toString(),
        carIds: asset.carIds?.map((id: ObjectId) => id.toString()) || [],
        hardDriveIds:
          asset.hardDriveIds?.map((id: ObjectId) => id.toString()) || [],
        cars:
          asset.cars?.map((car: any) => ({
            ...car,
            _id: car._id.toString(),
          })) || [],
        hardDrives:
          asset.hardDrives?.map((drive: any) => ({
            ...drive,
            _id: drive._id.toString(),
          })) || [],
      }));

      console.timeEnd("raw-assets-api");
      console.log(
        `Returning ${formattedAssets.length} raw assets out of ${totalCount} total`
      );

      return NextResponse.json({
        assets: formattedAssets,
        total: totalCount,
        currentPage: page,
        limit,
        totalPages,
        debug: {
          environment: process.env.NODE_ENV,
          vercel: process.env.VERCEL === "1",
          timestamp: new Date().toISOString(),
          retryCount,
          database: process.env.MONGODB_DB || "motive_archive",
          connectionPoolSize: client.options?.maxPoolSize,
          hasCollection: Boolean(collectionExists),
          returnedCount: formattedAssets.length,
          totalCount,
          connectionStatus: "success",
        },
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      console.error(
        `Error fetching raw assets (attempt ${retryCount + 1}):`,
        error
      );

      // Determine if this is a connection error
      const errorMessage = lastError.message.toLowerCase();
      const isConnectionError =
        errorMessage.includes("connect") ||
        errorMessage.includes("network") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("topology");

      // Extract request parameters or use defaults
      let currentPage = 1;
      let currentLimit = 10;
      try {
        const { searchParams } = new URL(request.url);
        currentPage = parseInt(searchParams.get("page") || "1");
        currentLimit = parseInt(searchParams.get("limit") || "10");
      } catch (parseError) {
        console.error("Error parsing URL parameters:", parseError);
      }

      if (retryCount < maxRetries && (isConnectionError || retryCount === 0)) {
        retryCount++;
        const delay = Math.pow(1.5, retryCount) * 500; // Less aggressive backoff
        console.log(`Retrying in ${delay}ms... (attempt ${retryCount + 1})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return attemptFetch();
      }

      // Type assertion to ensure TypeScript knows lastError is an Error when it's not null
      const errorDetail = lastError
        ? (lastError as Error).message
        : "Unknown error";

      return NextResponse.json(
        {
          error: "Failed to fetch raw assets",
          message: error instanceof Error ? error.message : String(error),
          details: errorDetail,
          assets: [],
          total: 0,
          currentPage,
          limit: currentLimit,
          totalPages: 0,
          debug: {
            environment: process.env.NODE_ENV,
            vercel: process.env.VERCEL === "1",
            timestamp: new Date().toISOString(),
            retryCount,
            database: process.env.MONGODB_DB || "motive_archive",
            errorName: error instanceof Error ? error.name : "Unknown",
            connectionError: isConnectionError,
            errorType: isConnectionError ? "connection" : "query",
          },
          stack:
            process.env.NODE_ENV === "development"
              ? error instanceof Error
                ? error.stack
                : undefined
              : undefined,
        },
        { status: isConnectionError ? 503 : 500 } // Use 503 for connection errors
      );
    }
  }

  try {
    return await attemptFetch();
  } catch (error) {
    console.error("All attempts to fetch raw assets failed:", error);

    // Type assertion here as well
    const errorDetail = lastError
      ? (lastError as Error).message
      : "Unknown error";

    // Default values for outer catch block
    const defaultPage = 1;
    const defaultLimit = 10;

    return NextResponse.json(
      {
        error: "Failed to fetch raw assets",
        message: error instanceof Error ? error.message : String(error),
        details: errorDetail,
        assets: [],
        total: 0,
        currentPage: defaultPage,
        limit: defaultLimit,
        totalPages: 0,
        stack:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.stack
              : undefined
            : undefined,
      },
      { status: 503 } // Service Unavailable for outer catch
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
