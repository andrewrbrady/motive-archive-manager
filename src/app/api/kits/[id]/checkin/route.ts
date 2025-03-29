import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(
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

    // Validate ObjectId
    let kitId;
    try {
      kitId = new ObjectId(params.id);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid kit ID format" },
        { status: 400 }
      );
    }

    // Get the kit
    const kit = await db.collection("kits").findOne({ _id: kitId });

    if (!kit) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    // Check if kit is checked out
    if (kit.status !== "checked-out") {
      return NextResponse.json(
        { error: "Kit is not checked out" },
        { status: 400 }
      );
    }

    // Update the most recent checkout record with the actual return date
    let updatedKit;
    if (
      kit.checkoutHistory &&
      Array.isArray(kit.checkoutHistory) &&
      kit.checkoutHistory.length > 0
    ) {
      const lastCheckoutIndex = kit.checkoutHistory.length - 1;

      // Create a field path for the specific array element
      const checkoutHistoryPath = `checkoutHistory.${lastCheckoutIndex}.actualReturnDate`;

      // Update the kit with the actual return date
      await db.collection("kits").updateOne(
        { _id: kitId },
        {
          $set: {
            [checkoutHistoryPath]: new Date(),
            status: "available",
            updatedAt: new Date(),
          },
          $unset: {
            checkedOutTo: "",
            checkoutDate: "",
            expectedReturnDate: "",
          },
        }
      );

      updatedKit = await db.collection("kits").findOne({ _id: kitId });
    } else {
      // If no checkout history, just update the status
      await db.collection("kits").updateOne(
        { _id: kitId },
        {
          $set: {
            status: "available",
            updatedAt: new Date(),
          },
          $unset: {
            checkedOutTo: "",
            checkoutDate: "",
            expectedReturnDate: "",
          },
        }
      );

      updatedKit = await db.collection("kits").findOne({ _id: kitId });
    }

    // Update all items in the kit to be available
    if (kit.items && Array.isArray(kit.items)) {
      // Convert string IDs to ObjectIds, filtering out any invalid IDs
      const itemObjectIds: ObjectId[] = [];

      for (const id of kit.items) {
        try {
          itemObjectIds.push(new ObjectId(id));
        } catch (error) {
          console.warn(`Invalid ObjectId: ${id}`);
        }
      }

      if (itemObjectIds.length > 0) {
        await db.collection("studio_inventory").updateMany(
          { _id: { $in: itemObjectIds } },
          {
            $set: {
              is_available: true,
              kit_status: "in-kit",
            },
            $unset: {
              checked_out_to: "",
              checkout_date: "",
              expected_return_date: "",
            },
          }
        );
      }
    }

    return NextResponse.json({
      ...updatedKit,
      id: updatedKit?._id.toString(),
      _id: undefined,
    });
  } catch (error) {
    console.error("Error checking in kit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
