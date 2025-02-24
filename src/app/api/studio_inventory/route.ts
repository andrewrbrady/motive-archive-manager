import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET all studio inventory items
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const items = await db.collection("studio_inventory").find({}).toArray();

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching studio inventory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST a new studio inventory item
export async function POST(request: Request) {
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

    // Add timestamps
    data.created_at = new Date();
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
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    const result = await db
      .collection("studio_inventory")
      .insertOne(snakeCaseData);

    return NextResponse.json({
      id: result.insertedId,
      ...snakeCaseData,
    });
  } catch (error) {
    console.error("Error creating studio inventory item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
