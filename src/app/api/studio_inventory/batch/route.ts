import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { StudioInventoryItem } from "@/types/inventory";
import { ObjectId } from "mongodb";

export async function PUT(request: NextRequest) {
  try {
    const { updates, itemIds } = await request.json();

    if (
      !updates ||
      !itemIds ||
      !Array.isArray(itemIds) ||
      itemIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid request. Missing updates or itemIds." },
        { status: 400 }
      );
    }

    // Handle special case for tags
    const { tagsToAdd, tagsToRemove, ...standardUpdates } = updates;

    // First, update standard fields
    if (Object.keys(standardUpdates).length > 0) {
      const client = await clientPromise;
      if (!client) {
        return NextResponse.json(
          { error: "Failed to connect to database" },
          { status: 500 }
        );
      }
      const db = client.db("motive_archive");

      for (const id of itemIds) {
        await db
          .collection("studio_inventory")
          .updateOne(
            { _id: new ObjectId(id) },
            { $set: convertToDatabaseFormat(standardUpdates) }
          );
      }
    }

    // Then handle tags if needed
    if (
      (tagsToAdd && tagsToAdd.length > 0) ||
      (tagsToRemove && tagsToRemove.length > 0)
    ) {
      const client = await clientPromise;
      if (!client) {
        return NextResponse.json(
          { error: "Failed to connect to database" },
          { status: 500 }
        );
      }
      const db = client.db("motive_archive");

      // Process each item individually for tag updates
      for (const id of itemIds) {
        // Get current item to access its tags
        const item = await db
          .collection("studio_inventory")
          .findOne({ _id: new ObjectId(id) }, { projection: { tags: 1 } });

        if (item) {
          let currentTags = item.tags ? JSON.parse(item.tags as string) : [];

          // Add new tags
          if (tagsToAdd && tagsToAdd.length > 0) {
            for (const tag of tagsToAdd) {
              if (!currentTags.includes(tag)) {
                currentTags.push(tag);
              }
            }
          }

          // Remove tags
          if (tagsToRemove && tagsToRemove.length > 0) {
            currentTags = currentTags.filter(
              (tag: string) => !tagsToRemove.includes(tag)
            );
          }

          // Update the item with new tags
          await db
            .collection("studio_inventory")
            .updateOne(
              { _id: new ObjectId(id) },
              { $set: { tags: JSON.stringify(currentTags) } }
            );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${itemIds.length} items successfully`,
    });
  } catch (error) {
    console.error("Error in batch update:", error);
    return NextResponse.json(
      { error: "Failed to update items" },
      { status: 500 }
    );
  }
}

// Helper function to convert camelCase to snake_case for database
function convertToDatabaseFormat(updates: Partial<StudioInventoryItem>) {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(updates)) {
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();

    // Handle special cases
    if (
      key === "purchaseDate" ||
      key === "lastServiceDate" ||
      key === "nextServiceDate"
    ) {
      result[snakeKey] = value
        ? new Date(value as string | number | Date)
        : null;
    } else if (
      typeof value === "object" &&
      value !== null &&
      !(value instanceof Date)
    ) {
      result[snakeKey] = JSON.stringify(value);
    } else {
      result[snakeKey] = value;
    }
  }

  return result;
}

// Batch check-in/check-out endpoint
export async function POST(request: NextRequest) {
  try {
    const { action, itemIds, checkoutInfo } = await request.json();

    if (
      !action ||
      !itemIds ||
      !Array.isArray(itemIds) ||
      itemIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid request. Missing action or itemIds." },
        { status: 400 }
      );
    }

    if (action === "checkout" && !checkoutInfo) {
      return NextResponse.json(
        { error: "Checkout information is required for checkout action." },
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

    switch (action) {
      case "checkin":
        for (const id of itemIds) {
          await db.collection("studio_inventory").updateOne(
            { _id: new ObjectId(id) },
            {
              $set: {
                is_available: true,
                checked_out_to: null,
                checkout_date: null,
                expected_return_date: null,
              },
            }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Checked in ${itemIds.length} items successfully`,
        });

      case "checkout":
        const { checkedOutTo, expectedReturnDate } = checkoutInfo;

        for (const id of itemIds) {
          await db.collection("studio_inventory").updateOne(
            { _id: new ObjectId(id) },
            {
              $set: {
                is_available: false,
                checked_out_to: checkedOutTo,
                checkout_date: new Date(),
                expected_return_date: expectedReturnDate
                  ? new Date(expectedReturnDate)
                  : null,
              },
            }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Checked out ${itemIds.length} items successfully`,
        });

      default:
        return NextResponse.json(
          { error: "Invalid action. Supported actions: checkin, checkout" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in batch check-in/check-out:", error);
    return NextResponse.json(
      { error: "Failed to process check-in/check-out" },
      { status: 500 }
    );
  }
}
