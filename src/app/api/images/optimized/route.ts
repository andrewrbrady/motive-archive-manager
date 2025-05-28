import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getFormattedImageUrl } from "@/lib/cloudflare";
import { ObjectId } from "mongodb";
import { caches, cacheKeys, cacheUtils } from "@/lib/database/cache";
import { validateQueryPerformance } from "@/lib/database/indexes";

export const dynamic = "force-dynamic";

/**
 * Optimized Images API Route - Phase 3 Performance Optimization
 *
 * Key optimizations:
 * 1. ✅ Query result caching with intelligent cache keys
 * 2. ✅ Optimized MongoDB aggregation pipeline
 * 3. ✅ Database indexes for fast queries
 * 4. ✅ Query performance monitoring
 * 5. ✅ Proper pagination with efficient skip/limit
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100); // Cap at 100
    const search = searchParams.get("search");
    const angle = searchParams.get("angle");
    const movement = searchParams.get("movement");
    const tod = searchParams.get("tod");
    const view = searchParams.get("view");
    const carId = searchParams.get("carId");

    // Build filters object for cache key
    const filters = { angle, movement, tod, view, search };

    // Generate cache key
    const cacheKey =
      carId && carId !== "all"
        ? cacheKeys.imagesByCarId(carId, page, limit, filters)
        : cacheKeys.imagesSearch(search || "", filters);

    // Try cache first
    const cached = caches.images.get(cacheKey);
    if (cached) {
      console.log(
        `🎯 Cache hit for images: ${cacheKey} (${Date.now() - startTime}ms)`
      );
      return NextResponse.json(cached);
    }

    console.log(`🔍 Cache miss for images: ${cacheKey}`);

    // Build optimized aggregation pipeline
    const pipeline: any[] = [];

    // Match stage - use indexes
    const matchStage: any = {};

    if (carId && carId !== "all") {
      try {
        matchStage.carId = new ObjectId(carId);
      } catch (err) {
        return NextResponse.json(
          { error: "Invalid carId format" },
          { status: 400 }
        );
      }
    }

    // Add metadata filters (uses metadata_filters_idx)
    if (angle) matchStage["metadata.angle"] = angle;
    if (movement) matchStage["metadata.movement"] = movement;
    if (tod) matchStage["metadata.tod"] = tod;
    if (view) matchStage["metadata.view"] = view;

    // Add search filter (uses search_text_idx)
    if (search) {
      matchStage.$text = { $search: search };
    }

    pipeline.push({ $match: matchStage });

    // Add sort stage (uses createdAt_desc_idx or updatedAt_desc_idx)
    if (search) {
      // Sort by text score when searching
      pipeline.push({
        $sort: {
          score: { $meta: "textScore" },
          updatedAt: -1,
        },
      });
    } else {
      pipeline.push({ $sort: { updatedAt: -1, createdAt: -1 } });
    }

    // Add facet stage for count and data in single query
    pipeline.push({
      $facet: {
        data: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              carId: 1,
              url: 1,
              filename: 1,
              "metadata.category": 1,
              "metadata.angle": 1,
              "metadata.movement": 1,
              "metadata.tod": 1,
              "metadata.view": 1,
              "metadata.description": 1,
              createdAt: 1,
              updatedAt: 1,
              ...(search && { score: { $meta: "textScore" } }),
            },
          },
        ],
        count: [{ $count: "total" }],
      },
    });

    const db = await getDatabase();
    const imagesCollection = db.collection("images");

    // Execute optimized aggregation
    const [result] = await imagesCollection.aggregate(pipeline).toArray();

    const images = result.data || [];
    const total = result.count[0]?.total || 0;

    // Process images
    const processedImages = images.map((img: any) => ({
      ...img,
      _id: img._id.toString(),
      carId: img.carId ? img.carId.toString() : "",
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
      performance: {
        queryTime: Date.now() - startTime,
        cached: false,
        cacheKey,
      },
    };

    // Cache the result (5 minutes for images)
    caches.images.set(cacheKey, response, 5 * 60 * 1000);

    // Log performance in development
    if (process.env.NODE_ENV === "development") {
      console.log(`📊 Images query performance:`, {
        queryTime: Date.now() - startTime,
        totalImages: total,
        page,
        filters,
        cacheKey,
      });

      // Validate query performance against indexes
      validateQueryPerformance("images", matchStage).then((stats) => {
        if (stats && !stats.indexHit) {
          console.warn("⚠️  Query not using optimal index:", stats);
        }
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API] Error fetching optimized images:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch images",
        performance: {
          queryTime: Date.now() - startTime,
          cached: false,
        },
      },
      { status: 500 }
    );
  }
}
