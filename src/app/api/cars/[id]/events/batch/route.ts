import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { DbEvent, EventType } from "@/types/event";
import { EventModel } from "@/models/Event";

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
      // Only title is required
      if (!event.title) {
        return NextResponse.json(
          {
            error: `Event at index ${i} missing required field: title`,
          },
          { status: 400 }
        );
      }

      // Validate event type only if provided
      if (event.type && !Object.values(EventType).includes(event.type)) {
        return NextResponse.json(
          {
            error: `Event at index ${i} has invalid type: ${event.type}`,
          },
          { status: 400 }
        );
      }

      // Validate date format only if provided
      try {
        if (event.start) {
          new Date(event.start);
        }
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

    const eventModel = new EventModel(db);

    const createdEventIds = [] as ObjectId[];

    const toObjectId = (value: string | ObjectId | null | undefined) =>
      value && ObjectId.isValid(value) ? new ObjectId(value) : undefined;

    for (const event of events) {
      const now = new Date();
      const projectId = event.project_id || event.projectId;
      const document = {
        carId: carId,
        projectId: projectId || undefined,
        type: event.type || EventType.OTHER,
        title: event.title.trim(),
        description: event.description || "",
        url: event.url || undefined,
        start: event.start ? new Date(event.start) : now,
        end: event.end ? new Date(event.end) : undefined,
        isAllDay: Boolean(event.isAllDay),
        teamMemberIds: Array.isArray(event.teamMemberIds)
          ? event.teamMemberIds.map((id: string | ObjectId) =>
              id instanceof ObjectId ? id.toString() : String(id)
            )
          : [],
        locationId: toObjectId(event.location_id || event.locationId),
        primaryImageId: toObjectId(
          event.primary_image_id || event.primaryImageId
        ),
        imageIds: Array.isArray(event.image_ids || event.imageIds)
          ? (event.image_ids || event.imageIds)
              .map((id: string | ObjectId) => toObjectId(id))
              .filter((id: ObjectId | undefined): id is ObjectId => Boolean(id))
          : undefined,
        createdBy: event.createdBy || "system",
      } as Omit<DbEvent, "_id" | "createdAt" | "updatedAt">;

      const insertedId = await eventModel.create(document);
      createdEventIds.push(insertedId);
    }

    const createdEvents = await db
      .collection("events")
      .find({ _id: { $in: createdEventIds } })
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
