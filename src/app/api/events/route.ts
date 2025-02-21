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
    if (searchParams.has("assignee")) {
      query.assignees = searchParams.get("assignee");
    }
    if (searchParams.has("from")) {
      query.scheduled_date = {
        ...query.scheduled_date,
        $gte: new Date(searchParams.get("from")!),
      };
    }
    if (searchParams.has("to")) {
      query.scheduled_date = {
        ...query.scheduled_date,
        $lte: new Date(searchParams.get("to")!),
      };
    }

    const events = await eventModel.findAll(query);
    const transformedEvents: Event[] = events.map((event: any) => ({
      id: event._id.toString(),
      car_id: event.car_id,
      description: event.description || "",
      type: event.type,
      status: event.status,
      start: event.scheduled_date,
      end: event.end_date,
      assignees: event.assignees || [],
      isAllDay: event.is_all_day || false,
      createdAt: event.created_at.toISOString(),
      updatedAt: event.updated_at.toISOString(),
    }));
    return NextResponse.json(transformedEvents);
  } catch (error) {
    console.error("Error fetching all events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
