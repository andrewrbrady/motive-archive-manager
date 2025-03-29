import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getFormattedImageUrl } from "@/lib/cloudflare";
import { createDynamicResponse } from "@/lib/cache-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await connectToDatabase();

    // Parse query parameters for pagination
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Validate client ID
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: "Invalid client ID format" },
        { status: 400 }
      );
    }

    // Get total count for pagination metadata
    const totalCars = await db.collection("cars").countDocuments({
      client: new ObjectId(params.id),
    });

    // Query for cars with pagination
    const cars = await db
      .collection("cars")
      .aggregate([
        {
          $match: {
            $or: [
              { client: params.id }, // String format
              { client: new ObjectId(params.id) }, // ObjectId format
            ],
          },
        },
        // Add pagination
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
            client: 1,
            clientInfo: 1,
            imageIds: 1,
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
        { $sort: { updatedAt: -1, make: 1, model: 1 } },
      ])
      .toArray();

    // Process the cars with our utility function
    const formattedCars = cars.map((car) => ({
      ...car,
      _id: car._id.toString(),
      client: car.client
        ? typeof car.client === "object"
          ? car.client.toString()
          : car.client
        : null,
      imageIds: car.imageIds?.map((id: string | ObjectId) =>
        typeof id === "object" ? id.toString() : id
      ),
      primaryImage: car.primaryImage
        ? {
            ...car.primaryImage,
            url: getFormattedImageUrl(car.primaryImage.url, "thumbnail"), // Use smaller thumbnail for list
          }
        : null,
    }));

    // Create response data
    const responseData = {
      cars: formattedCars,
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
    console.error("Error fetching client's cars:", error);
    return NextResponse.json(
      { error: "Failed to fetch client's cars" },
      { status: 500 }
    );
  }
}
