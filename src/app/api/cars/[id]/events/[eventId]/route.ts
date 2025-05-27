import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { EventModel } from "@/models/Event";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const carId = segments[segments.length - 3]; // -3 because URL is /cars/[id]/events/[eventId]
    const eventId = segments[segments.length - 1]; // -1 for the eventId

    const db = await getDatabase();
    const eventModel = new EventModel(db);
    const eventObjectId = new ObjectId(eventId);

    // First, get the event to verify it exists and belongs to this car
    const event = await eventModel.findById(eventObjectId);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Verify the event belongs to the specified car
    if (event.car_id !== carId) {
      return NextResponse.json(
        { error: "Event does not belong to this car" },
        { status: 400 }
      );
    }

    // Delete the event from the events collection
    const success = await eventModel.delete(eventObjectId);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete event" },
        { status: 500 }
      );
    }

    // Remove the eventId from the car's eventIds array to prevent orphaned references
    try {
      await db
        .collection("cars")
        .updateOne(
          { _id: new ObjectId(carId) },
          { $pull: { eventIds: eventObjectId } as any }
        );
    } catch (error) {
      console.warn("Failed to remove eventId from car:", error);
      // Don't fail the entire operation if this cleanup fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete event",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3]; // -3 because URL is /cars/[id]/events/[eventId]
    const eventId = segments[segments.length - 1]; // -1 for the eventId

    const db = await getDatabase();
    const eventModel = new EventModel(db);
    const eventObjectId = new ObjectId(eventId);
    const data = await request.json();

    // Ensure teamMemberIds is always an array - keep as strings since they are Firebase UIDs
    const teamMemberIds = Array.isArray(data.teamMemberIds || data.assignees)
      ? data.teamMemberIds || data.assignees
      : [];

    // Map the frontend fields to database fields
    const mappedUpdates: any = {
      updated_at: new Date(),
    };

    if (data.type) mappedUpdates.type = data.type;
    if (data.title !== undefined) mappedUpdates.title = data.title.trim();
    if (data.description !== undefined)
      mappedUpdates.description = data.description;
    if (data.url !== undefined) mappedUpdates.url = data.url;
    if (data.start) mappedUpdates.start = new Date(data.start);

    // Handle end date - explicitly check if it's in the data object
    if ("end" in data) {
      mappedUpdates.end = data.end ? new Date(data.end) : null;
    }

    if (typeof data.isAllDay === "boolean")
      mappedUpdates.is_all_day = data.isAllDay;

    // Always update teamMemberIds array
    mappedUpdates.teamMemberIds = teamMemberIds;

    const success = await eventModel.update(eventObjectId, mappedUpdates);

    if (!success) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fetch the updated event to verify changes
    const updatedEvent = await eventModel.findById(eventObjectId);
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
        error:
          error instanceof Error ? error.message : "Failed to update event",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
