import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: { deliverableId: string } }
) {
  try {
    const db = await getDatabase();
    const deliverableId = params.deliverableId;

    if (!ObjectId.isValid(deliverableId)) {
      return NextResponse.json(
        { error: "Invalid deliverable ID" },
        { status: 400 }
      );
    }

    const deliverable = await db
      .collection("deliverables")
      .findOne({ _id: new ObjectId(deliverableId) });

    if (!deliverable) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(deliverable);
  } catch (error) {
    console.error("Error fetching deliverable:", error);
    return NextResponse.json(
      { error: "Failed to fetch deliverable" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { deliverableId: string } }
) {
  try {
    const db = await getDatabase();
    const deliverableId = params.deliverableId;

    if (!ObjectId.isValid(deliverableId)) {
      return NextResponse.json(
        { error: "Invalid deliverable ID" },
        { status: 400 }
      );
    }

    const data = await request.json();

    // Only allow updating specific fields through this endpoint
    // Primarily focused on status updates for dashboard view
    const allowedFields = ["status"];

    const updateFields: Record<string, any> = {
      updated_at: new Date(),
    };

    // Only include allowed fields that are present in the request
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateFields[field] = data[field];
      }
    }

    // Validate status if it's being updated
    if (
      updateFields.status !== undefined &&
      !["not_started", "in_progress", "done"].includes(updateFields.status)
    ) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    const result = await db
      .collection("deliverables")
      .updateOne({ _id: new ObjectId(deliverableId) }, { $set: updateFields });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Deliverable updated successfully",
      updatedFields: updateFields,
    });
  } catch (error) {
    console.error("Error updating deliverable:", error);
    return NextResponse.json(
      { error: "Failed to update deliverable" },
      { status: 500 }
    );
  }
}
