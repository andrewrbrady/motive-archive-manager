import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { EventModel } from "@/models/Event";
import { Event } from "@/types/event";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication following cars/deliverables pattern
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    const db = await getDatabase();
    if (!db) {
      console.error("Failed to get database instance");
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const eventModel = new EventModel(db);
    const searchParams = request.nextUrl.searchParams;

    // Enhanced pagination support following cars/deliverables pattern
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(
        searchParams.get("pageSize") || searchParams.get("limit") || "20"
      ),
      100 // Maximum page size for performance
    );

    // Parse query parameters
    const query: any = {};
    if (searchParams.has("status")) {
      query.status = searchParams.get("status");
    }
    if (searchParams.has("type")) {
      query.type = searchParams.get("type");
    }
    if (searchParams.has("teamMember") || searchParams.has("assignee")) {
      // Support both new and legacy parameter names
      query.teamMemberIds =
        searchParams.get("teamMember") || searchParams.get("assignee");
    }
    if (searchParams.has("car_id")) {
      query.car_id = searchParams.get("car_id");
    }
    if (searchParams.has("project_id")) {
      query.project_id = searchParams.get("project_id");
    }
    if (searchParams.has("from")) {
      query.start = {
        ...query.start,
        $gte: new Date(searchParams.get("from")!),
      };
    }
    if (searchParams.has("to")) {
      query.start = {
        ...query.start,
        $lte: new Date(searchParams.get("to")!),
      };
    }

    // Enhanced search implementation following cars/deliverables pattern
    const search = searchParams.get("search");
    if (search && search.trim()) {
      const searchTerms = search.trim().split(/\s+/).filter(Boolean);

      if (searchTerms.length > 0) {
        query.$or = [];

        // Define search fields with priority
        const primaryFields = ["title", "description", "location"];

        searchTerms.forEach((term) => {
          // Escape special regex characters to prevent errors
          const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const searchRegex = new RegExp(escapedTerm, "i");

          // Apply search to primary fields
          primaryFields.forEach((field) => {
            query.$or.push({ [field]: searchRegex });
          });
        });

        // For multi-word searches, also try to match the full search term
        if (searchTerms.length > 1) {
          const fullSearchRegex = new RegExp(
            search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i"
          );
          primaryFields.forEach((field) => {
            query.$or.push({ [field]: fullSearchRegex });
          });
        }
      }
    }

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    try {
      // Get events with pagination and total count
      const [events, totalResult] = await Promise.all([
        db
          .collection("events")
          .find(query)
          .sort({ start: 1 })
          .skip(skip)
          .limit(pageSize)
          .toArray(),
        db.collection("events").countDocuments(query),
      ]);

      const transformedEvents: Event[] = events.map((event: any) =>
        eventModel.transformToApiEvent(event)
      );

      const totalPages = Math.ceil(totalResult / pageSize);

      // Return enhanced paginated response following cars/deliverables pattern
      const response = NextResponse.json({
        events: transformedEvents,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: totalResult,
          pageSize,
          // Legacy support
          total: totalResult,
          page,
          limit: pageSize,
        },
      });

      // Add cache headers for better performance following cars/deliverables pattern
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );
      response.headers.set(
        "ETag",
        `"events-${totalResult}-${page}-${pageSize}"`
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
    console.error("Error fetching all events:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch events", details: errorMessage },
      { status: 500 }
    );
  }
}
