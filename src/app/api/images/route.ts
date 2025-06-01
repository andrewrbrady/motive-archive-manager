import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getFormattedImageUrl } from "@/lib/cloudflare";
import { ObjectId } from "mongodb";

// Images can be cached for short periods

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const angle = searchParams.get("angle");
    const movement = searchParams.get("movement");
    const tod = searchParams.get("tod");
    const view = searchParams.get("view");
    const carId = searchParams.get("carId");

    console.log("[API] Images request:", {
      page,
      limit,
      search,
      filters: { angle, movement, tod, view, carId },
    });

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Collect filter conditions to combine with AND
    const filterConditions = [];

    // Add metadata filters with support for nested metadata and case-insensitive matching
    if (angle) {
      filterConditions.push({
        $or: [
          { "metadata.angle": { $regex: new RegExp(`^${angle}$`, "i") } },
          {
            "metadata.originalImage.metadata.angle": {
              $regex: new RegExp(`^${angle}$`, "i"),
            },
          },
        ],
      });
    }

    if (movement) {
      filterConditions.push({
        $or: [
          { "metadata.movement": { $regex: new RegExp(`^${movement}$`, "i") } },
          {
            "metadata.originalImage.metadata.movement": {
              $regex: new RegExp(`^${movement}$`, "i"),
            },
          },
        ],
      });
    }

    if (tod) {
      filterConditions.push({
        $or: [
          { "metadata.tod": { $regex: new RegExp(`^${tod}$`, "i") } },
          {
            "metadata.originalImage.metadata.tod": {
              $regex: new RegExp(`^${tod}$`, "i"),
            },
          },
        ],
      });
    }

    if (view) {
      filterConditions.push({
        $or: [
          { "metadata.view": { $regex: new RegExp(`^${view}$`, "i") } },
          {
            "metadata.originalImage.metadata.view": {
              $regex: new RegExp(`^${view}$`, "i"),
            },
          },
        ],
      });
    }

    if (carId && carId !== "all") {
      try {
        query.carId = new ObjectId(carId);
      } catch (err) {
        console.error("[API] Invalid carId format:", carId);
        return NextResponse.json(
          { error: "Invalid carId format" },
          { status: 400 }
        );
      }
    }

    // Combine filter conditions with AND
    if (filterConditions.length > 0) {
      query.$and = (query.$and || []).concat(filterConditions);
    }

    // Handle search separately
    if (search) {
      const searchConditions = [
        { filename: { $regex: search, $options: "i" } },
        { "metadata.description": { $regex: search, $options: "i" } },
      ];

      // Add search as an additional AND condition
      query.$and = (query.$and || []).concat([{ $or: searchConditions }]);
    }

    // [REMOVED] // [REMOVED] console.log("[API] MongoDB query:", JSON.stringify(query, null, 2));

    const db = await getDatabase();
    const imagesCollection = db.collection("images");

    // Get total count for pagination
    const total = await imagesCollection.countDocuments(query);

    // Get paginated images
    const images = await imagesCollection
      .find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Process images
    const processedImages = images.map((img) => {
      return {
        ...img,
        _id: img._id.toString(),
        carId: img.carId ? img.carId.toString() : "",
        url: getFormattedImageUrl(img.url),
      };
    });

    const response = {
      images: processedImages,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };

    console.log("[API] Sending response:", {
      totalImages: total,
      currentPage: page,
      imagesInResponse: processedImages.length,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API] Error fetching images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}
