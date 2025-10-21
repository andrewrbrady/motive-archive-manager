import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const db = await getDatabase();
    const rawCollection = db.collection("raw_assets");

    const rawAsset = await rawCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!rawAsset) {
      return NextResponse.json(
        { error: "Raw asset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(rawAsset);
  } catch (error) {
    console.error("Error fetching raw asset:", error);
    return NextResponse.json(
      { error: "Failed to fetch raw asset" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const updates = await request.json();
    const db = await getDatabase();
    const rawCollection = db.collection("raw_assets");

    // Validate ID format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid asset ID format" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!updates.date || !updates.description) {
      return NextResponse.json(
        { error: "Missing required fields: date and description are required" },
        { status: 400 }
      );
    }

    // Validate date format (YYMMDD)
    if (!/^\d{6}$/.test(updates.date)) {
      return NextResponse.json(
        { error: "Date must be in YYMMDD format" },
        { status: 400 }
      );
    }

    // Prepare the update object - remove _id if present to prevent immutable field error
    const { _id, ...updateFields } = updates;
    const updateData = {
      ...updateFields,
      updatedAt: new Date(),
    };

    // Check if the asset exists
    const existingAsset = await rawCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!existingAsset) {
      return NextResponse.json(
        { error: "Raw asset not found" },
        { status: 404 }
      );
    }

    // Perform the update
    const result = await rawCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Raw asset not found" },
        { status: 404 }
      );
    }

    // Get the updated document
    const updatedAsset = await rawCollection.findOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json(updatedAsset);
  } catch (error) {
    console.error("Error updating raw asset:", error);
    return NextResponse.json(
      { error: "Failed to update raw asset" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const db = await getDatabase();
    const rawCollection = db.collection("raw_assets");

    // Validate ID format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid asset ID format" },
        { status: 400 }
      );
    }

    // Check if the asset exists
    const existingAsset = await rawCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!existingAsset) {
      return NextResponse.json(
        { error: "Raw asset not found" },
        { status: 404 }
      );
    }

    // Delete the asset
    const result = await rawCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete raw asset" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting raw asset:", error);
    return NextResponse.json(
      { error: "Failed to delete raw asset" },
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
