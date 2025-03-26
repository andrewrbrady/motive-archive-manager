import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { RawAsset } from "@/models/raw_assets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const sort = searchParams.get("sort") || "date";
  const direction = searchParams.get("direction") === "asc" ? 1 : -1;
  const searchTerm = searchParams.get("search") || "";

  // Debug info object
  const debugInfo: any = {
    query: {},
    searchTerm,
    page,
    limit,
    sort,
    direction,
  };

  console.time("raw-assets-api-fetch");

  const attemptFetch = async () => {
    try {
      const db = await getDatabase();
      const rawCollection = db.collection("raw_assets");

      // Build the query
      const query: any = {};
      if (searchTerm) {
        query.$or = [
          { date: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
        ];
      }

      // Update debug info
      debugInfo.query = query;

      // Get total count for pagination
      const totalCount = await rawCollection.countDocuments(query);
      const totalPages = Math.ceil(totalCount / limit);
      const skip = (page - 1) * limit;

      // Update debug info
      debugInfo.totalCount = totalCount;
      debugInfo.totalPages = totalPages;
      debugInfo.skip = skip;

      // Get sorted and paginated results with populated car data
      const sortOptions: Record<string, 1 | -1> = {};
      sortOptions[sort] = direction;

      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: "cars",
            let: { carIds: "$carIds" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$_id", "$$carIds"],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  year: 1,
                  make: 1,
                  model: 1,
                  color: 1,
                  exteriorColor: 1,
                },
              },
            ],
            as: "cars",
          },
        },
        { $sort: sortOptions },
        { $skip: skip },
        { $limit: limit },
      ];

      const rawAssets = await rawCollection.aggregate(pipeline).toArray();

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
        // Format car data
        cars: Array.isArray(asset.cars)
          ? asset.cars.map((car) => ({
              ...car,
              _id: car._id.toString(),
              color: car.exteriorColor || car.color || "",
            }))
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
