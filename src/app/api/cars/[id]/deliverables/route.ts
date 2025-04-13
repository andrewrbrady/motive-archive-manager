import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId, UpdateFilter } from "mongodb";
import { Deliverable } from "@/types/deliverable";

interface Car {
  _id: ObjectId;
  deliverableIds: ObjectId[];
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // -2 because URL is /cars/[id]/deliverables

    const db = await getDatabase();
    const carId = new ObjectId(id);

    // Get the car's deliverable references
    const car = await db.collection<Car>("cars").findOne({ _id: carId });
    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Get all deliverables for this car
    const deliverables = await db
      .collection("deliverables")
      .find({ car_id: carId })
      .sort({ created_at: -1 })
      .toArray();

    return NextResponse.json(deliverables);
  } catch (error) {
    console.error("Error fetching deliverables:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch deliverables",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // -2 because URL is /cars/[id]/deliverables

    const db = await getDatabase();
    const carId = new ObjectId(id);
    const data = await request.json();

    const deliverable: Partial<Deliverable> = {
      ...data,
      car_id: carId,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Insert the deliverable
    const result = await db.collection("deliverables").insertOne(deliverable);

    // Update the car's deliverable references with proper typing
    const updateFilter: UpdateFilter<Car> = {
      $push: { deliverableIds: result.insertedId },
    };

    await db.collection<Car>("cars").updateOne({ _id: carId }, updateFilter);

    return NextResponse.json({
      _id: result.insertedId,
      ...deliverable,
    });
  } catch (error) {
    console.error("Error creating deliverable:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create deliverable",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const deliverableId = pathParts[pathParts.length - 1];

    if (!deliverableId) {
      return NextResponse.json(
        { error: "Deliverable ID is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const data = await request.json();
    const { _id, car_id, ...updateData } = data;

    const updateFields = {
      ...updateData,
      updated_at: new Date(),
    };

    const result = await db
      .collection("deliverables")
      .updateOne({ _id: new ObjectId(deliverableId) }, { $set: updateFields });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating deliverable:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update deliverable",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // -2 because URL is /cars/[id]/deliverables
    const pathParts = url.pathname.split("/");
    const deliverableId = pathParts[pathParts.length - 1];

    const db = await getDatabase();
    const carId = new ObjectId(id);

    if (!deliverableId) {
      return NextResponse.json(
        { error: "Deliverable ID is required" },
        { status: 400 }
      );
    }

    const deliverableObjectId = new ObjectId(deliverableId);

    // Remove the deliverable
    const result = await db
      .collection("deliverables")
      .deleteOne({ _id: deliverableObjectId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    // Remove the reference from the car with proper typing
    const updateFilter: UpdateFilter<Car> = {
      $pull: { deliverableIds: deliverableObjectId },
    };

    await db.collection<Car>("cars").updateOne({ _id: carId }, updateFilter);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting deliverable:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete deliverable",
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
