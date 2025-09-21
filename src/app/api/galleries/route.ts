import { NextResponse, NextRequest } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { fixCloudflareImageUrl } from "@/lib/image-utils";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";

const NUMERIC_DATE_TYPES = ["int", "long", "double", "decimal"] as const;
const FALLBACK_DATE = new Date(0);

function normalizeDateExpression(fieldPath: string) {
  return {
    $let: {
      vars: { valueType: { $type: fieldPath } },
      in: {
        $switch: {
          branches: [
            {
              case: { $eq: ["$$valueType", "date"] },
              then: fieldPath,
            },
            {
              case: { $eq: ["$$valueType", "string"] },
              then: {
                $dateFromString: {
                  dateString: fieldPath,
                  onError: FALLBACK_DATE,
                  onNull: FALLBACK_DATE,
                },
              },
            },
            {
              case: { $in: ["$$valueType", NUMERIC_DATE_TYPES] },
              then: { $toDate: fieldPath },
            },
            {
              case: { $eq: ["$$valueType", "timestamp"] },
              then: { $toDate: fieldPath },
            },
          ],
          default: FALLBACK_DATE,
        },
      },
    },
  };
}

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
  primaryImageId?: ObjectId;
  orderedImages?: OrderedImage[];
  createdAt: Date;
  updatedAt: Date;
}

// GET galleries with pagination
export async function GET(request: NextRequest) {
  try {
    // Verify authentication following cars/deliverables pattern
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    // Enhanced pagination support with pageSize parameter (max 50 for galleries)
    const pageSize = Math.min(
      parseInt(
        searchParams.get("pageSize") || searchParams.get("limit") || "20"
      ),
      50 // Maximum page size for performance
    );
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "updatedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * pageSize;

    // Build query
    const query: any = {};

    // Enhanced search implementation following cars/deliverables pattern
    if (search && search.trim()) {
      const searchTerms = search.trim().split(/\s+/).filter(Boolean);

      if (searchTerms.length > 0) {
        query.$or = [];

        searchTerms.forEach((term) => {
          // Escape special regex characters to prevent errors
          const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const searchRegex = new RegExp(escapedTerm, "i");

          // Apply search to primary fields
          query.$or.push({ name: searchRegex }, { description: searchRegex });
        });

        // For multi-word searches, also try to match the full search term
        if (searchTerms.length > 1) {
          const fullSearchRegex = new RegExp(
            search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i"
          );
          query.$or.push(
            { name: fullSearchRegex },
            { description: fullSearchRegex }
          );
        }
      }
    }

    const db = await getDatabase();
    if (!db) {
      console.error("Failed to get database instance");
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    try {
      // Get total count for pagination
      const total = await db.collection("galleries").countDocuments(query);

      // Build sort object based on parameters
      const sortObject: any = {};

      // Validate sortBy field
      const allowedSortFields = [
        "name",
        "createdAt",
        "updatedAt",
        "imageCount",
      ];
      const validSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "updatedAt";
      const validSortOrder = sortOrder === "asc" ? 1 : -1;

      const sortFieldMap: Record<string, string> = {
        name: "name",
        imageCount: "imageCount",
        createdAt: "normalizedCreatedAt",
        updatedAt: "normalizedUpdatedAt",
      };

      const primarySortField = sortFieldMap[validSortBy] || "normalizedUpdatedAt";

      if (validSortBy === "imageCount") {
        // For imageCount, we'll add it in the aggregation pipeline
        sortObject[primarySortField] = validSortOrder;
        sortObject["normalizedUpdatedAt"] = -1; // Secondary sort for recency
      } else {
        sortObject[primarySortField] = validSortOrder;
        // Add secondary sort for consistency when not already sorting by updatedAt
        if (primarySortField !== "normalizedUpdatedAt") {
          sortObject["normalizedUpdatedAt"] = -1;
        }
      }

      // Use aggregation pipeline to populate thumbnailImage from primaryImageId
      // Following the same pattern as cars API
      const galleries = await db
        .collection("galleries")
        .aggregate([
          { $match: query },
          // Normalize date fields and add imageCount for consistent sorting
          {
            $addFields: {
              normalizedUpdatedAt: normalizeDateExpression("$updatedAt"),
              normalizedCreatedAt: normalizeDateExpression("$createdAt"),
              imageCount: { $size: { $ifNull: ["$imageIds", []] } },
            },
          },
          { $sort: sortObject },
          { $skip: skip },
          { $limit: pageSize },

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

          // Combine results into thumbnailImage
          {
            $addFields: {
              thumbnailImage: {
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

          // Format the response
          {
            $project: {
              _id: 1,
              name: 1,
              description: 1,
              imageIds: 1,
              imageCount: 1,
              primaryImageId: 1,
              orderedImages: 1,
              createdAt: {
                $dateToString: {
                  date: "$normalizedCreatedAt",
                  format: "%Y-%m-%dT%H:%M:%S.%LZ",
                  timezone: "UTC",
                },
              },
              updatedAt: {
                $dateToString: {
                  date: "$normalizedUpdatedAt",
                  format: "%Y-%m-%dT%H:%M:%S.%LZ",
                  timezone: "UTC",
                },
              },
              thumbnailImage: {
                $cond: {
                  if: "$thumbnailImage",
                  then: {
                    _id: { $toString: "$thumbnailImage._id" },
                    url: "$thumbnailImage.url",
                    filename: "$thumbnailImage.filename",
                  },
                  else: null,
                },
              },
            },
          },
        ])
        .toArray();

      // Process galleries to format URLs and convert ObjectIds to strings
      const processedGalleries = galleries.map((gallery) => ({
        ...gallery,
        createdAt:
          gallery.createdAt instanceof Date
            ? gallery.createdAt.toISOString()
            : gallery.createdAt,
        updatedAt:
          gallery.updatedAt instanceof Date
            ? gallery.updatedAt.toISOString()
            : gallery.updatedAt,
        _id: gallery._id.toString(),
        imageIds: gallery.imageIds.map((id: ObjectId) => id.toString()),
        primaryImageId: gallery.primaryImageId?.toString(),
        orderedImages: gallery.orderedImages?.map((item: OrderedImage) => ({
          id: typeof item.id === "string" ? item.id : item.id.toString(),
          order: item.order,
        })),
        thumbnailImage: gallery.thumbnailImage
          ? {
              ...gallery.thumbnailImage,
              url: fixCloudflareImageUrl(gallery.thumbnailImage.url),
            }
          : null,
      }));

      const response = NextResponse.json({
        galleries: processedGalleries,
        pagination: {
          total,
          page,
          limit: pageSize, // Maintain backward compatibility with 'limit' field
          pageSize,
          pages: Math.ceil(total / pageSize),
        },
      });

      // Add cache headers for better performance following cars/deliverables pattern
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );
      response.headers.set("ETag", `"galleries-${total}-${page}-${pageSize}"`);

      return response;
    } catch (dbError) {
      console.error("Database operation error:", dbError);
      return NextResponse.json(
        {
          error: "Database operation failed",
          details: dbError instanceof Error ? dbError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
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

    const now = new Date();

    const gallery: Gallery = {
      name,
      description,
      imageIds: processedImageIds,
      // Set primaryImageId to first image if available
      primaryImageId:
        processedImageIds.length > 0 ? processedImageIds[0] : undefined,
      orderedImages,
      createdAt: now,
      updatedAt: now,
    };

    const result = await galleriesCollection.insertOne(gallery);

    // Convert ObjectIds back to strings for the response
    return NextResponse.json({
      _id: result.insertedId.toString(),
      name: gallery.name,
      description: gallery.description,
      imageIds: gallery.imageIds.map((id) => id.toString()),
      primaryImageId: gallery.primaryImageId?.toString(),
      orderedImages: gallery.orderedImages?.map((item) => ({
        id: item.id.toString(),
        order: item.order,
      })),
      createdAt: gallery.createdAt.toISOString(),
      updatedAt: gallery.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[API] Error creating gallery:", error);
    return NextResponse.json(
      { error: "Failed to create gallery" },
      { status: 500 }
    );
  }
}
