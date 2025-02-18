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
    const { _id, car_id, created_at, start, end, ...updateData } = data;

    // Map start/end to scheduled_date/end_date
    const mappedUpdates = {
      ...updateData,
      ...(start && { scheduled_date: start }),
      ...(end && { end_date: end }),
      updated_at: new Date(),
    };

    const success = await eventModel.update(eventId, mappedUpdates);

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
