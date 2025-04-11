import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Container, formatContainer } from "@/models/container";

export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const db = client.db("motive_archive");
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid container ID" },
        { status: 400 }
      );
    }

    const container = await db.collection("containers").findOne({
      _id: new ObjectId(id),
    });

    if (!container) {
      return NextResponse.json(
        { error: "Container not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(formatContainer(container as Container));
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid container ID" },
        { status: 400 }
      );
    }

    const data = await request.json();
    const db = client.db("motive_archive");

    // Prepare update data
    const updateData = {
      name: data.name,
      type: data.type,
      locationId: data.locationId ? new ObjectId(data.locationId) : undefined,
      description: data.description,
      isActive: data.isActive !== undefined ? data.isActive : true,
      updatedAt: new Date(),
    };

    const result = await db
      .collection("containers")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Container not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid container ID" },
        { status: 400 }
      );
    }

    const db = client.db("motive_archive");
    const result = await db.collection("containers").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Container not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
