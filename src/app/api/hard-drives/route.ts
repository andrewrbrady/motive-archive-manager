import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { HardDrive } from "@/models/hard-drive";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "name";
  const direction = searchParams.get("direction") === "asc" ? 1 : -1;
  const ids = searchParams.get("ids");
  const includeAssets = searchParams.get("include_assets") === "true";
  const id = searchParams.get("id"); // Support for single ID fetch

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
    requestParams: {
      page,
      limit,
      search: search ? true : false,
      ids: ids ? true : false,
      id: id ? true : false,
      includeAssets,
    },
    collections: [] as string[],
  };

  console.time("hard-drives-api-fetch");

  try {
    const db = await getDatabase();

    // Check if collection exists to provide better error messages
    const collections = await db.collections();
    const collectionNames = collections.map((c) => c.collectionName);
    debugInfo.collections = collectionNames;
    debugInfo.hasCollection = collectionNames.includes("hard_drives");

    if (!debugInfo.hasCollection) {
      console.warn("Collection 'hard_drives' not found in database");

      // Return empty array with metadata to avoid frontend errors
      return NextResponse.json({
        data: [], // Always return an array
        drives: [], // Alternative format for older code
        meta: {
          currentPage: page,
          totalPages: 0,
          totalCount: 0,
          limit,
        },
        debug: { ...debugInfo, error: "Collection not found" },
      });
    }

    const hardDrivesCollection = db.collection("hard_drives");

    // Build query
    let query: any = {};

    // Support for single ID fetch
    if (id) {
      try {
        query = { _id: new ObjectId(id) };
      } catch (e) {
        console.warn(`Invalid ObjectId format for ID: ${id}`);
        // Use a more flexible query to match by ID in different formats
        query = {
          $or: [
            { _id: id }, // Try string match
            { label: id }, // Try matching by label
            { name: id }, // Try matching by name
          ],
        };
      }
    }
    // If IDs are provided, filter by those specific IDs
    else if (ids) {
      try {
        const idArray = ids
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        if (idArray.length > 0) {
          // Convert string IDs to ObjectId if valid, otherwise keep as string for backup search
          const objectIdArray = idArray.map((id) => {
            try {
              return new ObjectId(id);
            } catch (e) {
              console.warn(`Invalid ObjectId format for ID: ${id}`);
              return id; // Keep the original string as fallback
            }
          });

          // Create a query that can handle both ObjectId and string _id values
          const validObjectIds = objectIdArray.filter(
            (id) => id instanceof ObjectId
          );
          const stringIds = idArray.filter((id) => typeof id === "string");

          // Build a more comprehensive query
          const queryConditions = [];

          if (validObjectIds.length > 0) {
            queryConditions.push({ _id: { $in: validObjectIds } });
          }

          if (stringIds.length > 0) {
            queryConditions.push({ _id: { $in: stringIds } });
            // Also try matching by label or name (might help in some cases)
            queryConditions.push({ label: { $in: stringIds } });
            queryConditions.push({ name: { $in: stringIds } });
          }

          query = queryConditions.length > 0 ? { $or: queryConditions } : {};

          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Hard drives query:", JSON.stringify(query, null, 2));
        }
      } catch (error) {
        console.error("Error parsing IDs parameter:", error);
        // If ID parsing fails, continue with empty query to avoid complete failure
        query = {};
      }
    } else if (search) {
      // Text search if no specific IDs
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { label: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Executing query:", JSON.stringify(query, null, 2));

    // Get count for pagination
    const totalCount = await hardDrivesCollection.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Get sorted and paginated results
    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sort] = direction;

    // Execute the query
    const hardDrives = await hardDrivesCollection
      .find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .toArray();

    // Update debug info
    debugInfo.returnedCount = hardDrives?.length || 0;
    debugInfo.totalCount = totalCount;

    // Double-check we have an array (defense against possible null from MongoDB)
    const safelyTypedDrives = Array.isArray(hardDrives) ? hardDrives : [];

    // Make sure to convert ObjectId values to strings and set default values
    const formattedDrives = safelyTypedDrives.map((drive) => ({
      ...drive,
      _id: drive._id ? drive._id.toString() : Math.random().toString(),
      // Add required fields with defaults to ensure consistent response
      name: drive.name || "Unnamed Drive",
      label: drive.label || drive.name || "Unnamed Drive",
      description: drive.description || "",
      capacity: drive.capacity || { total: 0, used: 0 },
      type: drive.type || "Unknown",
      interface: drive.interface || "Unknown",
      status: drive.status || "Unknown",
      // Convert any ObjectId arrays to string arrays
      rawAssetIds: Array.isArray(drive.rawAssetIds)
        ? drive.rawAssetIds.map((id) => id?.toString() || "")
        : [],
      // Add empty arrays for related data if not present
      rawAssetDetails: Array.isArray(drive.rawAssetDetails)
        ? drive.rawAssetDetails
        : [],
      locationDetails: drive.locationDetails || null,
    }));

    console.timeEnd("hard-drives-api-fetch");
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Returned ${formattedDrives.length} hard drives`);

    // Return in both formats to support different client needs
    return NextResponse.json({
      data: formattedDrives,
      drives: formattedDrives, // Alternative format for older code
      meta: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
      debug: debugInfo,
    });
  } catch (error) {
    console.error("Failed to fetch hard drives:", error);
    // Return empty data with error to avoid frontend errors
    return NextResponse.json(
      {
        data: [], // Always include an empty array rather than null/undefined
        drives: [], // Alternative format for older code
        meta: {
          currentPage: page,
          totalPages: 0,
          totalCount: 0,
          limit,
        },
        error: "Failed to fetch hard drives",
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
      name,
      description,
      capacity,
      rawAssetIds = [],
    } = await request.json();

    // Validate required fields
    if (!name || !description || !capacity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const hardDrivesCollection = db.collection("hard_drives");

    // Create new hard drive
    const newDrive = {
      name,
      description,
      capacity,
      rawAssetIds: rawAssetIds.map((id: string) => new ObjectId(id)),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await hardDrivesCollection.insertOne(newDrive);

    return NextResponse.json(
      {
        ...newDrive,
        _id: result.insertedId.toString(),
        rawAssetIds: rawAssetIds,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating hard drive:", error);
    return NextResponse.json(
      { error: "Failed to create hard drive" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const db = await getDatabase();
    const hardDrivesCollection = db.collection("hard_drives");

    // Delete all hard drives
    await hardDrivesCollection.deleteMany({});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting hard drives:", error);
    return NextResponse.json(
      { error: "Failed to delete hard drives" },
      { status: 500 }
    );
  }
}
