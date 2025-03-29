import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Container, formatContainer } from "@/models/container";

// GET a single container
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }
    const db = client.db("motive_archive");

    const container = await db.collection("containers").findOne({
      _id: new ObjectId(params.id),
    });

    if (!container) {
      return NextResponse.json(
        { error: "Container not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(formatContainer(container as Container));
  } catch (error) {
    console.error("Error fetching container:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// UPDATE a container
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.type) {
      return NextResponse.json(
        { error: "Name and type are required fields" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }
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
      .updateOne({ _id: new ObjectId(params.id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Container not found" },
        { status: 404 }
      );
    }

    // Get the updated container
    const updatedContainer = await db.collection("containers").findOne({
      _id: new ObjectId(params.id),
    });

    return NextResponse.json(formatContainer(updatedContainer as Container));
  } catch (error) {
    console.error("Error updating container:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE a container
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }
    const db = client.db("motive_archive");

    // Check if this container is used by any inventory items
    const usedInInventory = await db.collection("studio_inventory").findOne({
      container_id: params.id,
    });

    if (usedInInventory) {
      return NextResponse.json(
        {
          error:
            "Container cannot be deleted because it is being used by inventory items",
        },
        { status: 400 }
      );
    }

    const result = await db.collection("containers").deleteOne({
      _id: new ObjectId(params.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Container not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ id: params.id });
  } catch (error) {
    console.error("Error deleting container:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
