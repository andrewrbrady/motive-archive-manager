import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // /containers/[id]/items

    const db = await getDatabase();

    // Validate container ID format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid container ID format" },
        { status: 400 }
      );
    }

    // Check if container exists
    const containerExists = await db.collection("containers").findOne({
      _id: new ObjectId(id),
    });

    if (!containerExists) {
      return NextResponse.json(
        { error: "Container not found" },
        { status: 404 }
      );
    }

    // Get items in this container
    const items = await db
      .collection("containerItems")
      .find({ containerId: new ObjectId(id) })
      .toArray();

    // Return items with string IDs
    return NextResponse.json(
      items.map((item) => ({
        ...item,
        id: item._id.toString(),
        containerId: item.containerId.toString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching items in container:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
