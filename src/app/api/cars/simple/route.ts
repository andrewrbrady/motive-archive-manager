import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

/**
 * GET /api/cars/simple
 *
 * A simplified car API that prioritizes consistency over optimization.
 * Always returns cars with their images as a simple array.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "48"),
      96 // Maximum page size
    );

    console.log("Simple cars API request:", { page, pageSize });

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "motive_archive");

    // Build simple query with no filtering for now
    const query = {};

    // Count total cars for pagination
    const totalCount = await db.collection("cars").countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    // Simple consistent pipeline
    const pipeline = [
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
      // Look up images from imageIds
      {
        $lookup: {
          from: "images",
          let: { imageIds: { $ifNull: ["$imageIds", []] } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: [{ $toString: "$_id" }, "$$imageIds"],
                },
              },
            },
            { $limit: 10 }, // Only get first 10 images for performance
          ],
          as: "images",
        },
      },
    ];

    // Execute query
    const cars = await db.collection("cars").aggregate(pipeline).toArray();

    // Process data for client
    const processedCars = cars.map((car) => ({
      ...car,
      _id: car._id.toString(),
      images: (car.images || []).map((img: any) => ({
        ...img,
        _id: img._id.toString(),
        url: img.url.endsWith("/public") ? img.url : `${img.url}/public`,
      })),
      client: car.client?.toString(),
      eventIds: (car.eventIds || []).map((id: ObjectId) => id.toString()),
      deliverableIds: (car.deliverableIds || []).map((id: ObjectId) =>
        id.toString()
      ),
      documentationIds: (car.documentationIds || []).map((id: ObjectId) =>
        id.toString()
      ),
    }));

    // Log what we're sending back
    console.log(`Returning ${processedCars.length} cars with images`);

    return NextResponse.json({
      cars: processedCars,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        pageSize,
      },
    });
  } catch (error) {
    console.error("Error in simple cars API:", error);
    return NextResponse.json(
      { error: "Failed to fetch cars" },
      { status: 500 }
    );
  }
}
