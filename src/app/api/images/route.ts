import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getFormattedImageUrl } from "@/lib/cloudflare";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

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

    // Add metadata filters
    if (angle) query["metadata.angle"] = angle;
    if (movement) query["metadata.movement"] = movement;
    if (tod) query["metadata.tod"] = tod;
    if (view) query["metadata.view"] = view;
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

    // Add search filter
    if (search) {
      query.$or = [
        { filename: { $regex: search, $options: "i" } },
        { "metadata.description": { $regex: search, $options: "i" } },
      ];
    }

    console.log("[API] MongoDB query:", JSON.stringify(query, null, 2));

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
    const processedImages = images.map((img) => ({
      ...img,
      _id: img._id.toString(),
      carId: img.carId.toString(),
      url: getFormattedImageUrl(img.url),
    }));

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
