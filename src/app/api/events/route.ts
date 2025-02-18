import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { EventModel } from "@/models/Event";

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
    return NextResponse.json(events);
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
    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming events" },
      { status: 500 }
    );
  }
}
