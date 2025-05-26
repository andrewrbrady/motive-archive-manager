import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId, UpdateFilter } from "mongodb";
import { Event, EventStatus, DbEvent } from "@/types/event";
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
    // [REMOVED] // [REMOVED] console.log("Fetching events for car ID:", carId); // Debug log

    const eventModel = new EventModel(db);
    const events = await eventModel.findByCarId(carId);
    // [REMOVED] // [REMOVED] console.log("Found events from database:", events); // Debug log

    // Transform the events to match the Event interface
    const transformedEvents = events.map((event) =>
      eventModel.transformToApiEvent(event)
    );

    // [REMOVED] // [REMOVED] console.log("Transformed events:", transformedEvents); // Debug log
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

    // Validate required fields
    if (!data.type || !data.start || !data.title) {
      return NextResponse.json(
        { error: "Type, title, and start date are required" },
        { status: 400 }
      );
    }

    // Convert teamMemberIds to ObjectIds
    const teamMemberIds = (data.teamMemberIds || data.assignees || []).map(
      (id: string) => new ObjectId(id)
    );

    // Convert location ID to ObjectId if provided
    const locationId = data.locationId
      ? new ObjectId(data.locationId)
      : undefined;

    // Convert image IDs to ObjectIds if provided
    const primaryImageId = data.primaryImageId
      ? new ObjectId(data.primaryImageId)
      : undefined;
    const imageIds = (data.imageIds || []).map(
      (id: string) => new ObjectId(id)
    );

    // Create event object matching DbEvent type
    const eventData: Omit<DbEvent, "_id" | "created_at" | "updated_at"> = {
      car_id: carId.toString(),
      type: data.type,
      title: data.title.trim(),
      description: data.description || "",
      status: data.status || EventStatus.NOT_STARTED,
      start: new Date(data.start),
      end: data.end ? new Date(data.end) : undefined,
      is_all_day: data.isAllDay || false,
      teamMemberIds,
      location_id: locationId,
      primary_image_id: primaryImageId,
      image_ids: imageIds.length > 0 ? imageIds : undefined,
    };

    const newEventId = await eventModel.create(eventData);

    // Update the car's eventIds array
    const updateFilter: UpdateFilter<Car> = {
      $push: { eventIds: newEventId },
    };

    await db.collection<Car>("cars").updateOne({ _id: carId }, updateFilter);

    // Fetch the created event and return it
    const createdEvent = await eventModel.findById(newEventId);
    if (!createdEvent) {
      throw new Error("Failed to retrieve created event");
    }

    return NextResponse.json(eventModel.transformToApiEvent(createdEvent));
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

    // Convert teamMemberIds to ObjectIds
    const teamMemberIds = Array.isArray(data.teamMemberIds || data.assignees)
      ? (data.teamMemberIds || data.assignees).map(
          (id: string) => new ObjectId(id)
        )
      : [];

    // Convert location ID to ObjectId if provided
    const locationId = data.locationId
      ? new ObjectId(data.locationId)
      : undefined;

    // Convert image IDs to ObjectIds if provided
    const primaryImageId = data.primaryImageId
      ? new ObjectId(data.primaryImageId)
      : undefined;
    const imageIds = Array.isArray(data.imageIds)
      ? data.imageIds.map((id: string) => new ObjectId(id))
      : [];

    // Map the frontend fields to database fields
    const mappedUpdates: any = {
      updated_at: new Date(),
    };

    if (data.type) mappedUpdates.type = data.type;
    if (data.title !== undefined) mappedUpdates.title = data.title.trim();
    if (data.description !== undefined)
      mappedUpdates.description = data.description;
    if (data.status) mappedUpdates.status = data.status;
    if (data.start) mappedUpdates.start = new Date(data.start);
    if (data.end) mappedUpdates.end = new Date(data.end);
    if (typeof data.isAllDay === "boolean")
      mappedUpdates.is_all_day = data.isAllDay;

    // Handle location field
    if (data.locationId !== undefined) {
      mappedUpdates.location_id = locationId;
    }

    // Handle image fields
    if (data.primaryImageId !== undefined) {
      mappedUpdates.primary_image_id = primaryImageId;
    }
    if (data.imageIds !== undefined) {
      mappedUpdates.image_ids = imageIds.length > 0 ? imageIds : [];
    }

    // Always update teamMemberIds array
    mappedUpdates.teamMemberIds = teamMemberIds;

    const success = await eventModel.update(eventId, mappedUpdates);

    if (!success) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fetch the updated event to return
    const updatedEvent = await eventModel.findById(eventId);
    if (!updatedEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      event: eventModel.transformToApiEvent(updatedEvent),
    });
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
