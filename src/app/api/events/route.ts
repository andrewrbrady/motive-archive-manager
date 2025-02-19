import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { EventModel } from "@/models/Event";
import { Event } from "@/types/event";

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const eventModel = new EventModel(db);
    const searchParams = new URL(request.url).searchParams;

    // Parse query parameters
    const query: any = {};
    if (searchParams.has("status")) {
      query.status = searchParams.get("status");
    }
    if (searchParams.has("type")) {
      query.type = searchParams.get("type");
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
      assignee: event.assignee || "",
      isAllDay: event.is_all_day || false,
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

export async function GET_upcoming(request: NextRequest) {
  try {
    const db = await getDatabase();
    const eventModel = new EventModel(db);
    const searchParams = new URL(request.url).searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");

    const events = await eventModel.getUpcomingEvents(limit);
    const transformedEvents: Event[] = events.map((event: any) => ({
      id: event._id.toString(),
      car_id: event.car_id,
      description: event.description || "",
      type: event.type,
      status: event.status,
      start: event.scheduled_date,
      end: event.end_date,
      assignee: event.assignee || "",
      isAllDay: event.is_all_day || false,
    }));
    return NextResponse.json(transformedEvents);
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming events" },
      { status: 500 }
    );
  }
}
