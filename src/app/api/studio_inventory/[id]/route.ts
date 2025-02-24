import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET a single studio inventory item
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");

    const item = await db.collection("studio_inventory").findOne({
      _id: new ObjectId(params.id),
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error fetching studio inventory item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT/UPDATE a studio inventory item
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const data = await request.json();

    // Convert dates from string to Date objects
    if (data.purchase_date) {
      data.purchase_date = new Date(data.purchase_date);
    }
    if (data.last_maintenance_date) {
      data.last_maintenance_date = new Date(data.last_maintenance_date);
    }

    // Update timestamp
    data.updated_at = new Date();

    // Convert camelCase to snake_case
    const snakeCaseData = {
      name: data.name,
      category: data.category,
      manufacturer: data.manufacturer,
      model: data.model,
      serial_number: data.serialNumber,
      purchase_date: data.purchaseDate,
      last_maintenance_date: data.lastMaintenanceDate,
      condition: data.condition,
      notes: data.notes,
      location: data.location,
      is_available: data.isAvailable,
      current_kit_id: data.currentKitId,
      images: data.images,
      primary_image: data.primaryImage,
      updated_at: data.updated_at,
    };

    const result = await db
      .collection("studio_inventory")
      .updateOne({ _id: new ObjectId(params.id) }, { $set: snakeCaseData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: params.id,
      ...snakeCaseData,
    });
  } catch (error) {
    console.error("Error updating studio inventory item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE a studio inventory item
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");

    const result = await db.collection("studio_inventory").deleteOne({
      _id: new ObjectId(params.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ id: params.id });
  } catch (error) {
    console.error("Error deleting studio inventory item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
