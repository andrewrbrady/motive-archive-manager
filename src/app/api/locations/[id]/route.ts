import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Location, formatLocation } from "@/models/location";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET a specific location by ID
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const db = client.db("motive_archive");

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid location ID" },
        { status: 400 }
      );
    }

    const location = await db
      .collection("locations")
      .findOne({ _id: new ObjectId(id) });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(formatLocation(location as unknown as Location));
  } catch (error) {
    console.error("Error fetching location:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT (update) a specific location by ID
export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const db = client.db("motive_archive");
    const data = await request.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid location ID" },
        { status: 400 }
      );
    }

    const location = await db
      .collection("locations")
      .findOne({ _id: new ObjectId(id) });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await db
      .collection("locations")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error updating location:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE a specific location by ID
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const db = client.db("motive_archive");

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid location ID" },
        { status: 400 }
      );
    }

    const location = await db
      .collection("locations")
      .findOne({ _id: new ObjectId(id) });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const result = await db
      .collection("locations")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting location:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
