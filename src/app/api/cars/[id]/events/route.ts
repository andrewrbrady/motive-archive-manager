import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId, UpdateFilter } from "mongodb";
import { Event, EventStatus } from "@/types/event";
import { EventModel } from "@/models/Event";

interface Car {
  _id: ObjectId;
  eventIds: ObjectId[];
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // -2 because URL is /cars/[id]/events

    const db = await getDatabase();
    const carId = id;
    console.log("Fetching events for car ID:", carId); // Debug log

    const eventModel = new EventModel(db);
    const events = await eventModel.findByCarId(carId);
    console.log("Found events from database:", events); // Debug log

    // Transform the events to match the Event interface
    const transformedEvents = events.map((event) => ({
      id: event._id.toString(),
      car_id: carId,
      description: event.description || "",
      type: event.type,
      status: event.status || EventStatus.NOT_STARTED,
      start: event.scheduled_date,
      end: event.end_date,
      assignees: event.assignees || [],
      isAllDay: event.is_all_day || false,
    }));

    console.log("Transformed events:", transformedEvents); // Debug log
    return NextResponse.json(transformedEvents);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch events",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // -2 because URL is /cars/[id]/events

    const db = await getDatabase();
    const carId = new ObjectId(id);
    const data = await request.json();
    const eventModel = new EventModel(db);

    console.log("Creating event with data:", data); // Debug log

    // Create event object matching DbEvent type
    const event = {
      car_id: carId.toString(),
      type: data.type,
      description: data.description || "",
      status: data.status || EventStatus.NOT_STARTED,
      start: data.start,
      scheduled_date: data.start,
      end_date: data.end,
      is_all_day: data.isAllDay || false,
      assignees: data.assignees || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log("Transformed event data:", event); // Debug log

    const newEventId = await eventModel.create(event);
    console.log("Created event with ID:", newEventId); // Debug log

    // Update the car's eventIds array
    const updateFilter: UpdateFilter<Car> = {
      $push: { eventIds: newEventId },
    };

    await db.collection<Car>("cars").updateOne({ _id: carId }, updateFilter);

    // Return the created event with frontend-expected field names
    return NextResponse.json({
      id: newEventId.toString(),
      car_id: event.car_id,
      type: event.type,
      description: event.description,
      status: event.status,
      start: event.scheduled_date,
      end: event.end_date,
      isAllDay: event.is_all_day,
      assignees: event.assignees,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      {
        error: "Failed to create event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const path = url.pathname;
    const eventIdStr = path.split("/").pop();

    if (!eventIdStr) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const eventId = new ObjectId(eventIdStr);
    const data = await request.json();
    const eventModel = new EventModel(db);

    // Update event with new data
    const updates = {
      type: data.type,
      description: data.description,
      status: data.status,
      scheduled_date: data.start,
      end_date: data.end,
      is_all_day: data.isAllDay,
      assignees: data.assignees,
    };

    await eventModel.update(eventId, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      {
        error: "Failed to update event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    const eventIdStr = path.split("/").pop();

    if (!eventIdStr) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const eventId = new ObjectId(eventIdStr);
    const eventModel = new EventModel(db);

    await eventModel.delete(eventId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      {
        error: "Failed to delete event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
