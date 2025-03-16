import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET all kits
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");

    // Fetch all kits from the database
    const kits = await db.collection("kits").find({}).toArray();

    // Map ObjectId to string for frontend consumption
    const formattedKits = kits.map((kit) => ({
      ...kit,
      id: kit._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json(formattedKits);
  } catch (error) {
    console.error("Error fetching kits:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST a new kit
export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const data = await request.json();

    // Convert dates from string to Date objects
    if (data.createdAt) {
      data.createdAt = new Date(data.createdAt);
    } else {
      data.createdAt = new Date();
    }

    if (data.updatedAt) {
      data.updatedAt = new Date(data.updatedAt);
    } else {
      data.updatedAt = new Date();
    }

    if (data.checkoutDate) {
      data.checkoutDate = new Date(data.checkoutDate);
    }

    if (data.expectedReturnDate) {
      data.expectedReturnDate = new Date(data.expectedReturnDate);
    }

    // Process checkout history if it exists
    if (data.checkoutHistory && Array.isArray(data.checkoutHistory)) {
      data.checkoutHistory = data.checkoutHistory.map((record: any) => ({
        ...record,
        checkedOutDate: record.checkedOutDate
          ? new Date(record.checkedOutDate)
          : undefined,
        expectedReturnDate: record.expectedReturnDate
          ? new Date(record.expectedReturnDate)
          : undefined,
        actualReturnDate: record.actualReturnDate
          ? new Date(record.actualReturnDate)
          : undefined,
      }));
    }

    // Set default status if not provided
    if (!data.status) {
      data.status = "available";
    }

    // Insert the kit into the database
    const result = await db.collection("kits").insertOne(data);

    // Update all items that are part of this kit
    if (data.items && Array.isArray(data.items)) {
      const updatePromises = data.items.map((itemId: string) =>
        db.collection("studio_inventory").updateOne(
          { _id: new ObjectId(itemId) },
          {
            $set: {
              current_kit_id: result.insertedId.toString(),
              is_available: true,
              kit_status: "in-kit",
            },
          }
        )
      );

      await Promise.all(updatePromises);
    }

    return NextResponse.json({
      id: result.insertedId.toString(),
      ...data,
    });
  } catch (error) {
    console.error("Error creating kit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
