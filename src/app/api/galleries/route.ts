import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getFormattedImageUrl } from "@/lib/cloudflare";

// Types
interface OrderedImage {
  id: ObjectId;
  order: number;
}

interface Gallery {
  _id?: ObjectId;
  name: string;
  description?: string;
  imageIds: ObjectId[];
  orderedImages?: OrderedImage[];
  createdAt: string;
  updatedAt: string;
}

// GET galleries with pagination
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const db = await getDatabase();
    const galleriesCollection = db.collection("galleries");

    // Get total count for pagination
    const total = await galleriesCollection.countDocuments(query);

    // Get paginated galleries
    const galleries = await galleriesCollection
      .find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get first image for each gallery (using orderedImages if available)
    const allImageIds = galleries.flatMap((gallery) => {
      if (gallery.orderedImages?.length) {
        // Convert string ID to ObjectId if needed
        const firstOrderedId = gallery.orderedImages[0].id;
        return [
          typeof firstOrderedId === "string"
            ? new ObjectId(firstOrderedId)
            : firstOrderedId,
        ];
      }
      // Fallback to first image from imageIds
      return gallery.imageIds.length > 0 ? [gallery.imageIds[0]] : [];
    });

    const images =
      allImageIds.length > 0
        ? await db
            .collection("images")
            .find({ _id: { $in: allImageIds } })
            .toArray()
        : [];

    const imageMap = new Map(images.map((img) => [img._id.toString(), img]));

    // Process galleries
    const processedGalleries = galleries.map((gallery) => {
      // Get the first image ID, handling both string and ObjectId cases
      const firstImageId = gallery.orderedImages?.length
        ? typeof gallery.orderedImages[0].id === "string"
          ? gallery.orderedImages[0].id
          : gallery.orderedImages[0].id.toString()
        : gallery.imageIds[0]?.toString();

      return {
        ...gallery,
        _id: gallery._id.toString(),
        imageIds: gallery.imageIds.map((id: ObjectId) => id.toString()),
        orderedImages: gallery.orderedImages?.map((item: OrderedImage) => ({
          id: typeof item.id === "string" ? item.id : item.id.toString(),
          order: item.order,
        })),
        thumbnailImage: firstImageId
          ? (() => {
              const imageData = imageMap.get(firstImageId);
              const formattedUrl = getFormattedImageUrl(imageData?.url);
              return formattedUrl
                ? {
                    ...imageData,
                    _id: firstImageId,
                    url: formattedUrl,
                  }
                : null;
            })()
          : null,
      };
    });

    const response = {
      galleries: processedGalleries,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API] Error fetching galleries:", error);
    return NextResponse.json(
      { error: "Failed to fetch galleries" },
      { status: 500 }
    );
  }
}

// POST new gallery
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, imageIds } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Gallery name is required" },
        { status: 400 }
      );
    }

    // Convert string IDs to ObjectIds and create ordered images array
    const processedImageIds = (imageIds || []).map((id: string) => {
      if (!ObjectId.isValid(id)) {
        throw new Error(`Invalid image ID format: ${id}`);
      }
      return new ObjectId(id);
    });

    const orderedImages = processedImageIds.map(
      (id: ObjectId, index: number) => ({
        id,
        order: index,
      })
    );

    const db = await getDatabase();
    const galleriesCollection = db.collection("galleries");

    const gallery: Gallery = {
      name,
      description,
      imageIds: processedImageIds,
      orderedImages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await galleriesCollection.insertOne(gallery);

    // Convert ObjectIds back to strings for the response
    return NextResponse.json({
      _id: result.insertedId.toString(),
      ...gallery,
      imageIds: gallery.imageIds.map((id) => id.toString()),
      orderedImages: gallery.orderedImages?.map((item) => ({
        id: item.id.toString(),
        order: item.order,
      })),
    });
  } catch (error) {
    console.error("[API] Error creating gallery:", error);
    return NextResponse.json(
      { error: "Failed to create gallery" },
      { status: 500 }
    );
  }
}
