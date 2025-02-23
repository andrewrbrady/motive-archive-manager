import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { RawAsset, RawAssetData } from "../../../models/raw";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db();
    const rawCollection = db.collection("raw");

    // Build query
    const query: any = {};
    if (search) {
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

      // Get matching car IDs first - separate queries for text and year matches
      const [textMatchingCarIds, yearMatchingCarIds] = await Promise.all([
        // Text-based matches (make, model, color)
        db
          .collection("cars")
          .find({
            $or: [
              { make: searchRegex },
              { model: searchRegex },
              { color: searchRegex },
            ],
          })
          .project({ _id: 1 })
          .map((car) => car._id)
          .toArray(),

        // Year-based matches - handle both string and number types
        yearTerms.length > 0
          ? db
              .collection("cars")
              .find({
                $or: yearTerms.map((year) => ({
                  $or: [
                    { year: year }, // Match number
                    { year: year.toString() }, // Match string
                  ],
                })),
              })
              .project({ _id: 1 })
              .map((car) => car._id)
              .toArray()
          : Promise.resolve([]),
      ]);

      // Combine all matching car IDs
      const matchingCarIds = [
        ...new Set([...textMatchingCarIds, ...yearMatchingCarIds]),
      ];

      console.log("Search terms:", searchTerms);
      console.log("Year terms:", yearTerms);
      console.log("Text matching car IDs:", textMatchingCarIds.length);
      console.log("Year matching car IDs:", yearMatchingCarIds.length);
      console.log("Total matching car IDs:", matchingCarIds.length);

      query.$or = [{ date: searchRegex }, { description: searchRegex }];

      // Only add car ID search if we found matching cars
      if (matchingCarIds.length > 0) {
        query.$or.push({ carIds: { $in: matchingCarIds } });
      }
    }

    // Get total count for pagination
    const totalCount = await rawCollection.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch assets with car details
    const assets = await rawCollection
      .aggregate([
        { $match: query },
        {
          $lookup: {
            from: "cars",
            localField: "carIds",
            foreignField: "_id",
            as: "cars",
          },
        },
        {
          $addFields: {
            cars: {
              $map: {
                input: "$cars",
                as: "car",
                in: {
                  $mergeObjects: [
                    "$$car",
                    {
                      _id: { $toString: "$$car._id" },
                      series: { $ifNull: ["$$car.manufacturing.series", ""] },
                      trim: { $ifNull: ["$$car.manufacturing.trim", ""] },
                    },
                  ],
                },
              },
            },
          },
        },
        { $sort: { date: -1 } },
        { $skip: skip },
        { $limit: limit },
      ])
      .toArray();

    // Format response
    const formattedAssets = assets.map((asset) => ({
      ...asset,
      _id: asset._id.toString(),
      carIds: asset.carIds?.map((id: ObjectId) => id.toString()),
      cars: asset.cars?.map((car: any) => ({
        ...car,
        _id: car._id.toString(),
      })),
    }));

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
      { error: "Failed to fetch raw assets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { date, description, locations } = await request.json();

    // Validate required fields
    if (!date || !description || !locations) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    // Create new raw asset
    const newAsset = await RawAsset.create({
      date,
      description,
      locations,
      cars: [],
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
    const client = await clientPromise;
    const db = client.db();
    const rawCollection = db.collection("raw");

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
