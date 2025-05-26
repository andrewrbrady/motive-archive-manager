import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { EventModel } from "@/models/Event";
import { Event } from "@/types/event";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const eventModel = new EventModel(db);
    const searchParams = request.nextUrl.searchParams;

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

    const events = await eventModel.findAll(query);
    const transformedEvents: Event[] = events.map((event) =>
      eventModel.transformToApiEvent(event)
    );

    return NextResponse.json(transformedEvents);
  } catch (error) {
    console.error("Error fetching all events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
