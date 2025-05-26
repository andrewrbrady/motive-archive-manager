import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { EventModel } from "@/models/Event";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3]; // -3 because URL is /cars/[id]/events/[eventId]
    const eventId = segments[segments.length - 1]; // -1 for the eventId

    const db = await getDatabase();
    const eventModel = new EventModel(db);
    const eventObjectId = new ObjectId(eventId);

    const success = await eventModel.delete(eventObjectId);

    if (!success) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
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

    // Ensure teamMemberIds is always an array and convert to ObjectIds
    const teamMemberIds = Array.isArray(data.teamMemberIds || data.assignees)
      ? (data.teamMemberIds || data.assignees).map(
          (id: string) => new ObjectId(id)
        )
      : [];

    // Map the frontend fields to database fields
    const mappedUpdates: any = {
      updated_at: new Date(),
    };

    if (data.type) mappedUpdates.type = data.type;
    if (data.description !== undefined)
      mappedUpdates.description = data.description;
    if (data.status) mappedUpdates.status = data.status;
    if (data.start) mappedUpdates.start = new Date(data.start);
    if (data.end) mappedUpdates.end = new Date(data.end);
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
