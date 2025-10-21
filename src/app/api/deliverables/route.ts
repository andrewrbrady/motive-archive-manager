import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    const searchParams = request.nextUrl.searchParams;

    // Enhanced pagination support following cars API pattern
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(
        searchParams.get("pageSize") || searchParams.get("limit") || "50"
      ),
      1000 // Maximum page size for performance
    );

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const platform = searchParams.get("platform") || "";
    const type = searchParams.get("type") || "";
    const firebaseUid = searchParams.get("firebase_uid") || "";
    const carId = searchParams.get("car_id") || "";
    const creativeRole = searchParams.get("creative_role") || "";

    // Enhanced sort handling following cars API pattern
    const sortField = searchParams.get("sortField") || "edit_deadline";
    const sortDirection = searchParams.get("sortDirection") || "asc";
    const skip = (page - 1) * pageSize;

    const db = await getDatabase();
    if (!db) {
      console.error("Failed to get database instance");
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    // Build optimized search query
    const searchQuery: any = {};

    // Enhanced search implementation following cars API pattern
    if (search && search.trim()) {
      const searchTerms = search.trim().split(/\s+/).filter(Boolean);

      if (searchTerms.length > 0) {
        searchQuery.$or = [];

        // Define search fields with priority
        const primaryFields = ["title", "description"];

        searchTerms.forEach((term) => {
          // Escape special regex characters to prevent errors
          const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const searchRegex = new RegExp(escapedTerm, "i");

          // Apply search to primary fields
          primaryFields.forEach((field) => {
            searchQuery.$or.push({ [field]: searchRegex });
          });
        });

        // For multi-word searches, also try to match the full search term
        if (searchTerms.length > 1) {
          const fullSearchRegex = new RegExp(
            search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i"
          );
          primaryFields.forEach((field) => {
            searchQuery.$or.push({ [field]: fullSearchRegex });
          });
        }
      }
    }

    if (status) {
      searchQuery.status = status;
    }

    if (platform) {
      // Support both legacy platform field and new platforms array
      const platformQuery = {
        $or: [{ platform: platform }, { platforms: { $in: [platform] } }],
      };

      // If there's already an $or for search, combine them with $and
      if (searchQuery.$or) {
        searchQuery.$and = [{ $or: searchQuery.$or }, platformQuery];
        delete searchQuery.$or;
      } else {
        Object.assign(searchQuery, platformQuery);
      }
    }

    if (type) {
      searchQuery.type = type;
    }

    // Handle filtering by Firebase UID
    if (firebaseUid) {
      searchQuery.firebase_uid = firebaseUid;
    }

    if (carId) {
      try {
        searchQuery.car_id = new ObjectId(carId);
      } catch (error) {
        console.error("Invalid car_id:", carId);
        return NextResponse.json(
          { error: "Invalid car_id format" },
          { status: 400 }
        );
      }
    }

    if (creativeRole && creativeRole !== "all") {
      // Get all users with the specified creative role
      const users = await db
        .collection("users")
        .find({ creativeRoles: creativeRole, status: "active" })
        .toArray();

      // Get their Firebase UIDs
      const userIds = users.map((user) => user.firebase_uid).filter(Boolean);

      if (userIds.length > 0) {
        searchQuery.firebase_uid = { $in: userIds };
      } else {
        // If no users found with this role, return no results
        searchQuery.firebase_uid = null;
      }
    }

    try {
      // Get total count with search filter for pagination
      const totalCount = await db
        .collection("deliverables")
        .countDocuments(searchQuery);

      const totalPages = Math.ceil(totalCount / pageSize);

      // Build optimized sort object
      const sortObject: { [key: string]: 1 | -1 } = {
        [sortField]: sortDirection === "desc" ? -1 : 1,
      };

      // Get paginated, filtered, and sorted deliverables with optimized projection
      const deliverables = await db
        .collection("deliverables")
        .find(searchQuery)
        .sort(sortObject)
        .skip(skip)
        .limit(pageSize)
        .toArray();

      // Get car details for each deliverable with optimized query
      const validCarIds = deliverables
        .map((d) => {
          try {
            return typeof d.car_id === "string"
              ? new ObjectId(d.car_id)
              : d.car_id;
          } catch (error) {
            console.error("Invalid car_id in deliverable:", d);
            return null;
          }
        })
        .filter((id): id is ObjectId => id instanceof ObjectId);

      const cars =
        validCarIds.length > 0
          ? await db
              .collection("cars")
              .find({ _id: { $in: validCarIds } })
              .project({
                _id: 1,
                make: 1,
                model: 1,
                year: 1,
                primaryImageId: 1,
              })
              .toArray()
          : [];

      // Convert ObjectId to string for primaryImageId to make comparison easier in frontend
      const carsWithStringIds = cars.map((car) => {
        if (car.primaryImageId && car.primaryImageId instanceof ObjectId) {
          return {
            ...car,
            primaryImageId: car.primaryImageId.toString(),
          };
        }
        return car;
      });

      const carsMap = new Map(
        carsWithStringIds.map((car) => [car._id.toString(), car])
      );

      // Combine deliverables with car details
      const deliverablesWithCars = deliverables.map((deliverable) => ({
        ...deliverable,
        car: deliverable.car_id
          ? carsMap.get(deliverable.car_id.toString())
          : undefined,
      }));

      const response = NextResponse.json({
        deliverables: deliverablesWithCars,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          pageSize,
          // Legacy support
          total: totalCount,
          page,
          limit: pageSize,
        },
      });

      // Add cache headers for better performance following cars API pattern
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );
      response.headers.set(
        "ETag",
        `"deliverables-${totalCount}-${page}-${pageSize}"`
      );

      return response;
    } catch (dbError) {
      console.error("Database operation error:", dbError);
      console.error(
        "Error stack:",
        dbError instanceof Error ? dbError.stack : "No stack trace"
      );
      return NextResponse.json(
        {
          error: "Database operation failed",
          details: dbError instanceof Error ? dbError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching deliverables:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch deliverables", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = await getDatabase();
    const data = await request.json();

    // Remove editor field if present and handle platform migration
    const { editor, ...deliverableData } = data;

    // NEW SINGLE PLATFORM APPROACH
    if (deliverableData.platform_id) {
      // New approach: single platform ID
      // Remove legacy fields if they exist
      delete deliverableData.platform;
      delete deliverableData.platforms;
    } else if (
      deliverableData.platforms &&
      deliverableData.platforms.length > 0
    ) {
      // Legacy support: convert first platform from array to platform_id
      deliverableData.platform_id = deliverableData.platforms[0];
      delete deliverableData.platform;
      delete deliverableData.platforms;
    } else if (deliverableData.platform) {
      // Legacy support: keep platform field for backward compatibility
      delete deliverableData.platforms;
    } else {
      // Require platform specification
      return NextResponse.json(
        {
          error:
            "Platform selection is required (platform_id, platforms array, or platform field)",
        },
        { status: 400 }
      );
    }

    // Coerce ID-like fields to ObjectId where appropriate
    const doc: any = {
      ...deliverableData,
      created_at: new Date(),
      updated_at: new Date(),
    };
    if (doc.car_id && typeof doc.car_id === "string" && ObjectId.isValid(doc.car_id)) {
      doc.car_id = new ObjectId(doc.car_id);
    }
    if (doc.platform_id && typeof doc.platform_id === "string" && ObjectId.isValid(doc.platform_id)) {
      doc.platform_id = new ObjectId(doc.platform_id);
    }
    if (doc.mediaTypeId && typeof doc.mediaTypeId === "string" && ObjectId.isValid(doc.mediaTypeId)) {
      doc.mediaTypeId = new ObjectId(doc.mediaTypeId);
    }

    const result = await db.collection("deliverables").insertOne(doc);
    const saved = await db.collection("deliverables").findOne({ _id: result.insertedId });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error("Error creating deliverable:", error);
    return NextResponse.json(
      { error: "Failed to create deliverable" },
      { status: 500 }
    );
  }
}
