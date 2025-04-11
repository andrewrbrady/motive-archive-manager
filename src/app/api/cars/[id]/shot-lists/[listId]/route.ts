import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3];
    const listId = segments[segments.length - 1];

    const { db } = await connectToDatabase();
    const data = await request.json();

    const result = await db.collection("shotLists").findOneAndUpdate(
      { _id: new ObjectId(listId), carId: id },
      {
        $set: {
          name: data.name,
          description: data.description,
          shots: data.shots,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Shot list not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...result,
      id: result._id.toString(),
    });
  } catch (error) {
    console.error("Error updating shot list:", error);
    return NextResponse.json(
      { error: "Failed to update shot list" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3];
    const listId = segments[segments.length - 1];

    const { db } = await connectToDatabase();

    const result = await db.collection("shotLists").deleteOne({
      _id: new ObjectId(listId),
      carId: id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Shot list not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shot list:", error);
    return NextResponse.json(
      { error: "Failed to delete shot list" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3];
    const listId = segments[segments.length - 1];

    const { db } = await connectToDatabase();
    const data = await request.json();

    const result = await db.collection("shotLists").findOneAndUpdate(
      { _id: new ObjectId(listId), carId: id },
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
        { error: "Shot list not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...result,
      id: result._id.toString(),
    });
  } catch (error) {
    console.error("Error updating shot list:", error);
    return NextResponse.json(
      { error: "Failed to update shot list" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
