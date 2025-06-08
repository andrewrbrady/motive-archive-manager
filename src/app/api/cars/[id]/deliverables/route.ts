import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId, UpdateFilter } from "mongodb";
import { Deliverable } from "@/types/deliverable";
import { Car } from "@/types/car";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    // [REMOVED] // [REMOVED] console.log("Car-specific API - Querying for car ID:", resolvedParams.id);

    const db = await getDatabase();
    // [REMOVED] // [REMOVED] console.log("Car-specific API - Database name:", db.databaseName);
    // [REMOVED] // [REMOVED] console.log("Car-specific API - Querying collection: deliverables");

    // Validate that the id is a proper MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(resolvedParams.id)) {
      console.error("Invalid car ID format:", resolvedParams.id);
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    const deliverables = await db
      .collection("deliverables")
      .find({ car_id: new ObjectId(resolvedParams.id) })
      .sort({ edit_deadline: 1 })
      .toArray();

    // [REMOVED] // [REMOVED] console.log("Car-specific API - Found deliverables:", deliverables.length);
    console.log(
      "Car-specific API - Deliverable IDs:",
      deliverables.map((d) => d._id)
    );
    // [REMOVED] // [REMOVED] console.log("Car-specific API - Sample deliverable:", deliverables[0]);

    return NextResponse.json(deliverables);
  } catch (error) {
    console.error("Error fetching deliverables for car:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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

    // Update the car's deliverable references with proper typing - convert ObjectId to string
    const updateFilter = {
      $push: { deliverableIds: result.insertedId.toString() },
    };

    await db.collection("cars").updateOne({ _id: carId }, updateFilter as any);

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

    // Remove the reference from the car with proper typing - convert ObjectId to string
    const updateFilter = {
      $pull: { deliverableIds: deliverableObjectId.toString() },
    };

    await db.collection("cars").updateOne({ _id: carId }, updateFilter as any);

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
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
