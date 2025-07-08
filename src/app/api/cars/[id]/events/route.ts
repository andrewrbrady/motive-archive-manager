import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId, UpdateFilter } from "mongodb";
import { Event, DbEvent } from "@/types/event";
import { EventModel } from "@/models/Event";
import {
  verifyAuthMiddleware,
  getUserIdFromToken,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";

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
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Fetching events for car ID:", carId); // Debug log

    const eventModel = new EventModel(db);
    const events = await eventModel.findByCarId(carId);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Found events from database:", events); // Debug log

    // Transform the events to match the Event interface
    const transformedEvents = events.map((event) =>
      eventModel.transformToApiEvent(event)
    );

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Transformed events:", transformedEvents); // Debug log
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

export async function POST(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 POST /api/cars/[id]/events: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ POST /api/cars/[id]/events: Authentication failed");
    return authResult;
  }

  try {
    // Get token data and extract user ID
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);

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

    // Convert teamMemberIds to ObjectIds with validation
    const teamMemberIds = Array.isArray(data.teamMemberIds || data.assignees)
      ? (data.teamMemberIds || data.assignees)
          .filter((id: string) => id && ObjectId.isValid(id))
          .map((id: string) => new ObjectId(id))
      : [];

    // Convert location ID to ObjectId if provided with validation
    const locationId =
      data.locationId && ObjectId.isValid(data.locationId)
        ? new ObjectId(data.locationId)
        : undefined;

    // Convert image IDs to ObjectIds if provided with validation
    const primaryImageId =
      data.primaryImageId && ObjectId.isValid(data.primaryImageId)
        ? new ObjectId(data.primaryImageId)
        : undefined;
    const imageIds = (data.imageIds || [])
      .filter((id: string) => id && ObjectId.isValid(id))
      .map((id: string) => new ObjectId(id));

    // Create event object matching DbEvent type
    const eventData: Omit<DbEvent, "_id" | "created_at" | "updated_at"> = {
      car_id: carId.toString(),
      type: data.type,
      title: data.title.trim(),
      description: data.description || "",
      url: data.url || undefined,
      start: new Date(data.start),
      end: data.end ? new Date(data.end) : undefined,
      is_all_day: data.isAllDay || false,
      teamMemberIds,
      location_id: locationId,
      primary_image_id: primaryImageId,
      image_ids: imageIds.length > 0 ? imageIds : undefined,
      created_by: userId, // Track who created the event
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

    // Convert teamMemberIds to ObjectIds with validation
    const teamMemberIds = Array.isArray(data.teamMemberIds || data.assignees)
      ? (data.teamMemberIds || data.assignees)
          .filter((id: string) => id && ObjectId.isValid(id))
          .map((id: string) => new ObjectId(id))
      : [];

    // Convert location ID to ObjectId if provided with validation
    const locationId =
      data.locationId && ObjectId.isValid(data.locationId)
        ? new ObjectId(data.locationId)
        : undefined;

    // Convert image IDs to ObjectIds if provided with validation
    const primaryImageId =
      data.primaryImageId && ObjectId.isValid(data.primaryImageId)
        ? new ObjectId(data.primaryImageId)
        : undefined;
    const imageIds = (data.imageIds || [])
      .filter((id: string) => id && ObjectId.isValid(id))
      .map((id: string) => new ObjectId(id));

    // Map the frontend fields to database fields
    const mappedUpdates: any = {
      updated_at: new Date(),
    };

    if (data.type) mappedUpdates.type = data.type;
    if (data.title !== undefined) mappedUpdates.title = data.title.trim();
    if (data.description !== undefined)
      mappedUpdates.description = data.description;
    if (data.url !== undefined) mappedUpdates.url = data.url;
    if (data.status) mappedUpdates.status = data.status;
    if (data.start) mappedUpdates.start = new Date(data.start);

    // Handle end date - explicitly check if it's in the data object
    if ("end" in data) {
      mappedUpdates.end = data.end ? new Date(data.end) : null;
    }

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

    // First, get the event to find which car it belongs to
    const event = await eventModel.findById(eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Delete the event from the events collection
    const deleteSuccess = await eventModel.delete(eventId);
    if (!deleteSuccess) {
      return NextResponse.json(
        { error: "Failed to delete event" },
        { status: 500 }
      );
    }

    // Remove the eventId from the car's eventIds array to prevent orphaned references
    if (event.car_id) {
      try {
        await db
          .collection<Car>("cars")
          .updateOne(
            { _id: new ObjectId(event.car_id) },
            { $pull: { eventIds: eventId } }
          );
      } catch (error) {
        console.warn("Failed to remove eventId from car:", error);
        // Don't fail the entire operation if this cleanup fails
      }
    }

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
