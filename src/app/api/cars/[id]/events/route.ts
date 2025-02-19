import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId, UpdateFilter } from "mongodb";
import { Event, EventStatus } from "@/types/event";
import { EventModel } from "@/models/Event";

interface Car {
  _id: ObjectId;
  eventIds: ObjectId[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const carId = params.id;
    console.log("Fetching events for car ID:", carId); // Debug log

    const eventModel = new EventModel(db);
    const events = await eventModel.findByCarId(carId);
    console.log("Found events from database:", events); // Debug log

    // Transform the events to match the Event interface
    const transformedEvents = events.map((event) => ({
      id: event._id.toString(),
      car_id: carId, // Ensure car_id is set correctly
      description: event.description || "",
      type: event.type,
      status: event.status || EventStatus.NOT_STARTED,
      start: event.scheduled_date,
      end: event.end_date,
      assignee: event.assignee || "",
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const carId = new ObjectId(params.id);
    const data = await request.json();
    const eventModel = new EventModel(db);

    console.log("Creating event with data:", data); // Debug log

    // Create event object matching DbEvent type
    const event = {
      car_id: carId.toString(),
      type: data.type,
      description: data.description || "",
      status: data.status || EventStatus.NOT_STARTED,
      start: data.start, // Required by DbEvent
      scheduled_date: data.start, // Used in database
      end_date: data.end, // Used in database
      is_all_day: data.isAllDay || false,
      assignee: data.assignee || "",
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
      start: event.start,
      end: event.end_date,
      isAllDay: event.is_all_day,
      assignee: event.assignee,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const eventModel = new EventModel(db);
    const pathParts = request.url.split("/");
    const eventId = pathParts[pathParts.length - 1];

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const data = await request.json();
    const { _id, car_id, created_at, ...updateData } = data;

    const success = await eventModel.update(new ObjectId(eventId), {
      ...updateData,
      updated_at: new Date(),
    });

    if (!success) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const eventModel = new EventModel(db);
    const carId = new ObjectId(params.id);
    const pathParts = request.url.split("/");
    const eventId = pathParts[pathParts.length - 1];

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const eventObjectId = new ObjectId(eventId);

    // Remove the event
    const success = await eventModel.delete(eventObjectId);

    if (!success) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Remove the event ID from the car's eventIds array
    const updateFilter: UpdateFilter<Car> = {
      $pull: { eventIds: eventObjectId },
    };

    await db.collection<Car>("cars").updateOne({ _id: carId }, updateFilter);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
