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
    const limit = parseInt(searchParams.get("limit") || "10");

    const events = await eventModel.getUpcomingEvents(limit);
    const transformedEvents: Event[] = events.map((event) =>
      eventModel.transformToApiEvent(event)
    );

    return NextResponse.json(transformedEvents);
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming events" },
      { status: 500 }
    );
  }
}
