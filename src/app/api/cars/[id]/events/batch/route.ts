import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { EventType } from "@/types/event";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: carId } = await params;

    if (!ObjectId.isValid(carId)) {
      return NextResponse.json({ error: "Invalid car ID" }, { status: 400 });
    }

    const { events } = await request.json();

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "Events must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate each event
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (!event.type || !event.title || !event.start) {
        return NextResponse.json(
          {
            error: `Event at index ${i} missing required fields: type, title, start`,
          },
          { status: 400 }
        );
      }

      // Validate event type
      if (!Object.values(EventType).includes(event.type)) {
        return NextResponse.json(
          {
            error: `Event at index ${i} has invalid type: ${event.type}`,
          },
          { status: 400 }
        );
      }

      // Validate date format
      try {
        new Date(event.start);
        if (event.end) {
          new Date(event.end);
        }
      } catch (error) {
        return NextResponse.json(
          {
            error: `Event at index ${i} has invalid date format`,
          },
          { status: 400 }
        );
      }
    }

    const db = await getDatabase();

    // Check if car exists
    const car = await db
      .collection("cars")
      .findOne({ _id: new ObjectId(carId) });

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Create all events with car_id
    const eventsToCreate = events.map((event) => ({
      id: new ObjectId().toString(),
      car_id: carId,
      type: event.type,
      title: event.title,
      description: event.description || "",
      url: event.url || "",
      start: event.start,
      end: event.end || null,
      isAllDay: event.isAllDay || false,
      teamMemberIds: event.teamMemberIds || [],
      locationId: event.locationId || null,
      primaryImageId: event.primaryImageId || null,
      imageIds: event.imageIds || [],
      createdBy: event.createdBy || "system",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    // Insert all events
    const result = await db.collection("events").insertMany(eventsToCreate);

    const createdEvents = await db
      .collection("events")
      .find({
        _id: { $in: Object.values(result.insertedIds) },
      })
      .toArray();

    return NextResponse.json({
      message: `Successfully created ${createdEvents.length} events`,
      events: createdEvents,
      count: createdEvents.length,
    });
  } catch (error) {
    console.error("Error creating batch events:", error);
    return NextResponse.json(
      { error: "Failed to create events" },
      { status: 500 }
    );
  }
}
