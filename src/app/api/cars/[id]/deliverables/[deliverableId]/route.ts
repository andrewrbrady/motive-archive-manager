import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId, UpdateFilter } from "mongodb";

interface Car {
  _id: ObjectId;
  deliverableIds: ObjectId[];
}

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3]; // -3 for cars/[id]/deliverables/[deliverableId]
    const deliverableId = segments[segments.length - 1]; // -1 for the deliverableId

    const db = await getDatabase();

    const data = await request.json();
    const { _id, ...updateData } = data;

    // Handle car association updates (carId field from frontend)
    if ("carId" in data) {
      console.log(`🚗 Car association update: carId=${data.carId}`);
      if (data.carId === undefined || data.carId === null) {
        updateData.car_id = null; // Explicitly remove car association
        console.log(`🚗 Removing car association: setting car_id to null`);
      } else {
        updateData.car_id = data.carId; // Set car association
        console.log(`🚗 Setting car association: car_id=${data.carId}`);
      }
    }

    const updateFields = {
      ...updateData,
      updated_at: new Date(),
    };

    console.log(
      `📝 Final updateFields for deliverable ${deliverableId}:`,
      updateFields
    );

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
    const id = segments[segments.length - 3]; // -3 for cars/[id]/deliverables/[deliverableId]
    const deliverableId = segments[segments.length - 1]; // -1 for the deliverableId

    const db = await getDatabase();
    const carId = new ObjectId(id);
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
      "Access-Control-Allow-Methods": "PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
