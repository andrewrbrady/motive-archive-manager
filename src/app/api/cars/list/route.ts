import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { fixCloudflareImageUrl } from "@/lib/image-utils";
import { ObjectId } from "mongodb";
import { createDynamicResponse } from "@/lib/cache-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    // Add pagination support
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const db = await getDatabase();

    // Count total documents for pagination metadata
    const totalCars = await db.collection("cars").countDocuments();

    // Modified query to only get primary image or first image
    const cars = await db
      .collection("cars")
      .aggregate([
        { $match: {} },
        // Skip and limit for pagination
        { $skip: skip },
        { $limit: limit },
        // First, look up the primary image if set
        {
          $lookup: {
            from: "images",
            let: {
              primaryId: {
                $cond: [
                  { $ifNull: ["$primaryImageId", false] },
                  { $toObjectId: "$primaryImageId" },
                  null,
                ],
              },
              carId: "$_id",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$_id", "$$primaryId"] }],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: "primaryImage",
          },
        },
        // If no primary image, look up first image from imageIds
        {
          $lookup: {
            from: "images",
            let: {
              imageIds: {
                $map: {
                  input: { $ifNull: ["$imageIds", []] },
                  as: "id",
                  in: { $toObjectId: "$$id" },
                },
              },
              carId: "$_id",
              hasPrimary: { $gt: [{ $size: "$primaryImage" }, 0] },
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$_id", "$$imageIds"] },
                      { $eq: ["$$hasPrimary", false] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: "firstImage",
          },
        },
        // Combine results into a single images array
        {
          $addFields: {
            displayImage: {
              $cond: {
                if: { $gt: [{ $size: "$primaryImage" }, 0] },
                then: { $arrayElemAt: ["$primaryImage", 0] },
                else: {
                  $cond: {
                    if: { $gt: [{ $size: "$firstImage" }, 0] },
                    then: { $arrayElemAt: ["$firstImage", 0] },
                    else: null,
                  },
                },
              },
            },
          },
        },
        // Format response
        {
          $project: {
            _id: 1,
            make: 1,
            model: 1,
            year: 1,
            description: 1,
            status: 1,
            mileage: 1,
            price: 1,
            primaryImageId: 1,
            // Include a single optimized image for the list view
            primaryImage: {
              $cond: {
                if: "$displayImage",
                then: {
                  _id: { $toString: "$displayImage._id" },
                  url: "$displayImage.url",
                  metadata: {
                    category: "$displayImage.metadata.category",
                    isPrimary: true,
                  },
                },
                else: null,
              },
            },
          },
        },
        { $sort: { make: 1, model: 1, year: -1 } },
      ])
      .toArray();

    // Process the images with our utility function
    const processedCars = cars.map((car) => ({
      ...car,
      primaryImage: car.primaryImage
        ? {
            ...car.primaryImage,
            url: fixCloudflareImageUrl(car.primaryImage.url), // Simple fix for Cloudflare URLs
          }
        : null,
    }));

    // Create response data
    const responseData = {
      cars: processedCars,
      pagination: {
        total: totalCars,
        page,
        limit,
        pages: Math.ceil(totalCars / limit),
      },
    };

    // Return with shorter cache duration as this is dynamic content
    return createDynamicResponse(responseData);
  } catch (error) {
    console.error("Error fetching cars list:", error);
    return NextResponse.json(
      { error: "Failed to fetch cars list" },
      { status: 500 }
    );
  }
}
