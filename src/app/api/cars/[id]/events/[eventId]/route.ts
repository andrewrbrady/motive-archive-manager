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

    console.log("Updating event with data:", data); // Debug log

    // Ensure assignees is always an array
    const assignees = Array.isArray(data.assignees) ? data.assignees : [];

    // Map the frontend fields to database fields
    const mappedUpdates = {
      ...(data.type && { type: data.type }),
      ...(data.description && { description: data.description }),
      ...(data.status && { status: data.status }),
      ...(data.start && { scheduled_date: data.start }),
      ...(data.end && { end_date: data.end }),
      ...(typeof data.isAllDay === "boolean" && { is_all_day: data.isAllDay }),
      assignees, // Always update assignees array
      updated_at: new Date(), // Ensure proper Date object
    };

    console.log("Mapped updates:", mappedUpdates); // Debug log

    const success = await eventModel.update(eventObjectId, mappedUpdates);

    if (!success) {
      console.log("Event not found or update failed"); // Debug log
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fetch the updated event to verify changes
    const updatedEvent = await eventModel.findById(eventObjectId);
    console.log("Updated event:", updatedEvent); // Debug log

    return NextResponse.json({
      success: true,
      event: updatedEvent,
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
