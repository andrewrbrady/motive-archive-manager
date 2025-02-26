import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Location, formatLocation } from "@/models/location";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET a specific location by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const { id } = params;

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
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const { id } = params;
    const data = await request.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid location ID" },
        { status: 400 }
      );
    }

    // Add updated timestamp
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    // Remove id from update data if present
    if (updateData.id) delete updateData.id;
    if (updateData._id) delete updateData._id;

    const result = await db
      .collection("locations")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Get the updated document
    const updatedLocation = await db
      .collection("locations")
      .findOne({ _id: new ObjectId(id) });

    return NextResponse.json(
      formatLocation(updatedLocation as unknown as Location)
    );
  } catch (error) {
    console.error("Error updating location:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE a specific location by ID
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid location ID" },
        { status: 400 }
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
