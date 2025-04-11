import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3];
    const shotId = segments[segments.length - 1];

    const { db } = await connectToDatabase();
    const data = await request.json();

    const result = await db.collection("shots").findOneAndUpdate(
      { _id: new ObjectId(shotId), carId: id },
      {
        $set: {
          title: data.title,
          description: data.description,
          angle: data.angle,
          lighting: data.lighting,
          notes: data.notes,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...result,
      id: result._id.toString(),
    });
  } catch (error) {
    console.error("Error updating shot:", error);
    return NextResponse.json(
      { error: "Failed to update shot" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3];
    const shotId = segments[segments.length - 1];

    const { db } = await connectToDatabase();
    const data = await request.json();

    const result = await db.collection("shots").findOneAndUpdate(
      { _id: new ObjectId(shotId), carId: id },
      {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...result,
      id: result._id.toString(),
    });
  } catch (error) {
    console.error("Error updating shot:", error);
    return NextResponse.json(
      { error: "Failed to update shot" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3];
    const shotId = segments[segments.length - 1];

    const { db } = await connectToDatabase();

    const result = await db.collection("shots").deleteOne({
      _id: new ObjectId(shotId),
      carId: id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shot:", error);
    return NextResponse.json(
      { error: "Failed to delete shot" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
