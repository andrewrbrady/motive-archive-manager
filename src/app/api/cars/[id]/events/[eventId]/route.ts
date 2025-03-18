import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { EventModel } from "@/models/Event";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; eventId: string } }
) {
  try {
    const db = await getDatabase();
    const eventModel = new EventModel(db);
    const eventId = new ObjectId(params.eventId);

    const success = await eventModel.delete(eventId);

    if (!success) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; eventId: string } }
) {
  try {
    const db = await getDatabase();
    const eventModel = new EventModel(db);
    const eventId = new ObjectId(params.eventId);
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

    const success = await eventModel.update(eventId, mappedUpdates);

    if (!success) {
      console.log("Event not found or update failed"); // Debug log
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fetch the updated event to verify changes
    const updatedEvent = await eventModel.findById(eventId);
    console.log("Updated event:", updatedEvent); // Debug log

    return NextResponse.json({
      success: true,
      event: updatedEvent,
    });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}
