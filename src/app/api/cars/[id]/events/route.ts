import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Event, EventStatus } from "@/types/event";
import { EventModel } from "@/models/Event";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const carId = new ObjectId(params.id);
    const eventModel = new EventModel(db);

    const events = await eventModel.findByCarId(carId);
    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
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

    const event: Omit<Event, "_id"> = {
      ...data,
      car_id: carId,
      created_at: new Date(),
      updated_at: new Date(),
      status: data.status || EventStatus.SCHEDULED,
    };

    const newEvent = await eventModel.create(event);
    return NextResponse.json(newEvent);
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
    const pathParts = request.url.split("/");
    const eventId = pathParts[pathParts.length - 1];

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const success = await eventModel.delete(new ObjectId(eventId));

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
