import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET a single studio inventory item
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

    // Handle special cases
    if (id === "categories") {
      // Use aggregation pipeline instead of distinct (API Version 1 compatible)
      const pipeline = [
        {
          $match: {
            category: {
              $exists: true,
              $ne: null,
              $not: { $eq: "" },
            },
          },
        },
        {
          $group: {
            _id: "$category",
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ];

      const result = await db
        .collection("studio_inventory")
        .aggregate(pipeline)
        .toArray();
      const categories = result.map((doc) => doc._id).filter(Boolean);

      return NextResponse.json(categories);
    }

    // Continue with normal ID-based lookup for regular item requests
    try {
      const item = await db.collection("studio_inventory").findOne({
        _id: new ObjectId(id),
      });

      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      // Ensure is_available is correctly set based on checked_out_to
      if (item.checked_out_to) {
        item.is_available = false;
      }

      // Ensure checkout_date and expected_return_date are properly formatted
      if (item.checkout_date) {
        item.checkout_date = new Date(item.checkout_date);
      }

      if (item.expected_return_date) {
        item.expected_return_date = new Date(item.expected_return_date);
      }

      return NextResponse.json(item);
    } catch (error) {
      if (error instanceof Error && error.message.includes("ObjectId")) {
        return NextResponse.json(
          { error: "Invalid ID format" },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error fetching studio inventory item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT/UPDATE a studio inventory item
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

    // Validate ObjectId
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // Check if item exists
    const existingItem = await db.collection("studio_inventory").findOne({
      _id: objectId,
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Process dates
    const updateData = {
      ...data,
      updatedAt: new Date(),
      checkout_date: data.checkout_date
        ? new Date(data.checkout_date)
        : undefined,
      expected_return_date: data.expected_return_date
        ? new Date(data.expected_return_date)
        : undefined,
    };

    // Update the item
    const result = await db
      .collection("studio_inventory")
      .updateOne({ _id: objectId }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Get the updated item
    const updatedItem = await db.collection("studio_inventory").findOne({
      _id: objectId,
    });

    if (!updatedItem) {
      return NextResponse.json(
        { error: "Failed to fetch updated item" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error updating studio inventory item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE a studio inventory item
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

    // Validate ObjectId
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // Check if item exists
    const existingItem = await db.collection("studio_inventory").findOne({
      _id: objectId,
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Delete the item
    const result = await db.collection("studio_inventory").deleteOne({
      _id: objectId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete item" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting studio inventory item:", error);
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
