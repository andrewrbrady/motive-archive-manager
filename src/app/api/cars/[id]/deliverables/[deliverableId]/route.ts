import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId, UpdateFilter } from "mongodb";

interface Car {
  _id: ObjectId;
  deliverableIds: ObjectId[];
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; deliverableId: string } }
) {
  try {
    const db = await getDatabase();
    const deliverableId = params.deliverableId;

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
      { error: "Failed to update deliverable" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; deliverableId: string } }
) {
  try {
    const db = await getDatabase();
    const carId = new ObjectId(params.id);
    const deliverableId = params.deliverableId;
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
      { error: "Failed to delete deliverable" },
      { status: 500 }
    );
  }
}
