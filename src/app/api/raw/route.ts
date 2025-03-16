import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/mongodb";
import { RawAsset, RawAssetData } from "../../../models/raw_assets";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  console.time("raw-assets-api");
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    console.log(
      `Fetching raw assets: page=${page}, limit=${limit}, search=${search}`
    );

    const client = await getMongoClient(3, 1000); // Use retry mechanism with 3 retries
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
            : searchTerms[0],
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

    console.time("count-query");
    // Get total count for pagination (with timeout)
    const countPromise = new Promise<number>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        resolve(100); // Default to a reasonable number if timeout
        console.warn("Count query timed out, using default count");
      }, 5000);

      rawCollection
        .countDocuments(query)
        .then((count) => {
          clearTimeout(timeoutId);
          resolve(count);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          console.error("Error in count query:", err);
          resolve(100); // Use default on error
        });
    });

    const totalCount = await countPromise;
    const totalPages = Math.ceil(totalCount / limit);
    console.timeEnd("count-query");

    // Create pipeline for the main query
    const pipeline = [
      { $match: query },
      { $sort: { date: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Only fetch minimal car details to reduce data transfer
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
                "manufacturing.series": 1,
                "manufacturing.trim": 1,
              },
            },
          ],
        },
      },
      // Similarly, fetch minimal hard drive details
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
    const queryPromise = new Promise<any[]>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Raw assets query timed out after 10 seconds"));
      }, 10000);

      rawCollection
        .aggregate(pipeline)
        .toArray()
        .then((results) => {
          clearTimeout(timeoutId);
          resolve(results);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
    });

    const assets = await queryPromise;
    console.timeEnd("main-query");

    // Format response
    const formattedAssets = assets.map((asset) => ({
      ...asset,
      _id: asset._id.toString(),
      carIds: asset.carIds?.map((id: ObjectId) => id.toString()),
      hardDriveIds: asset.hardDriveIds?.map((id: ObjectId) => id.toString()),
      cars: asset.cars?.map((car: any) => ({
        ...car,
        _id: car._id.toString(),
      })),
      hardDrives: asset.hardDrives?.map((drive: any) => ({
        ...drive,
        _id: drive._id.toString(),
      })),
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
    });
  } catch (error) {
    console.error("Error fetching raw assets:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch raw assets",
        message: error instanceof Error ? error.message : String(error),
        stack:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.stack
              : undefined
            : undefined,
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
