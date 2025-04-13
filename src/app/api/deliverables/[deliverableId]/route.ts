import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const deliverableId = segments[segments.length - 1]; // /deliverables/[deliverableId]

    // Validate ID format
    if (!ObjectId.isValid(deliverableId)) {
      return NextResponse.json(
        { error: "Invalid deliverable ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Find deliverable by ID
    const deliverable = await db.collection("deliverables").findOne({
      _id: new ObjectId(deliverableId),
    });

    if (!deliverable) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    // Return deliverable with string IDs
    return NextResponse.json({
      ...deliverable,
      id: deliverable._id.toString(),
      carId: deliverable.carId ? deliverable.carId.toString() : null,
      assignedTo: deliverable.assignedTo
        ? deliverable.assignedTo.toString()
        : null,
    });
  } catch (error) {
    console.error("Error fetching deliverable:", error);
    return NextResponse.json(
      { error: "Failed to fetch deliverable" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const deliverableId = segments[segments.length - 1];

    // Validate ID format
    if (!ObjectId.isValid(deliverableId)) {
      return NextResponse.json(
        { error: "Invalid deliverable ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const data = await request.json();

    // Find and update deliverable
    const result = await db.collection("deliverables").findOneAndUpdate(
      { _id: new ObjectId(deliverableId) },
      {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    // Return updated deliverable with string IDs
    return NextResponse.json({
      ...result,
      id: result._id.toString(),
      carId: result.carId ? result.carId.toString() : null,
      assignedTo: result.assignedTo ? result.assignedTo.toString() : null,
    });
  } catch (error) {
    console.error("Error updating deliverable:", error);
    return NextResponse.json(
      { error: "Failed to update deliverable" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
