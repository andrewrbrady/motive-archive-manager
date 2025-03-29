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
    const data = await request.json();

    // Validate required fields
    if (!data.userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

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

    // Check if kit is already checked out
    if (kit.status === "checked-out") {
      return NextResponse.json(
        { error: "Kit is already checked out" },
        { status: 400 }
      );
    }

    // Check if all items in the kit are available
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
        const unavailableItems = await db
          .collection("studio_inventory")
          .find({
            _id: { $in: itemObjectIds },
            $or: [
              { is_available: false },
              { current_kit_id: { $exists: true, $ne: params.id } },
            ],
          })
          .toArray();

        if (unavailableItems.length > 0) {
          return NextResponse.json(
            {
              error: "Some items in the kit are not available",
              unavailableItems: unavailableItems.map((item) => ({
                id: item._id.toString(),
                name: item.name,
              })),
            },
            { status: 400 }
          );
        }
      }
    }

    // Get user details
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(data.userId) });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create checkout record
    const checkoutRecord = {
      checkedOutBy: user.name || data.userId,
      checkedOutTo: data.checkedOutTo || user.name || data.userId,
      checkedOutDate: new Date(),
      expectedReturnDate: data.expectedReturnDate
        ? new Date(data.expectedReturnDate)
        : null,
    };

    // Update kit status
    const updateResult = await db.collection("kits").updateOne(
      { _id: kitId },
      {
        $set: {
          status: "checked-out",
          checkedOutTo: checkoutRecord.checkedOutTo,
          checkoutDate: checkoutRecord.checkedOutDate,
          expectedReturnDate: checkoutRecord.expectedReturnDate,
          updatedAt: new Date(),
        },
        $push: { checkoutHistory: checkoutRecord as any },
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    // Update all items in the kit to be unavailable
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
              is_available: false,
              checked_out_to: checkoutRecord.checkedOutTo,
              checkout_date: checkoutRecord.checkedOutDate,
              expected_return_date: checkoutRecord.expectedReturnDate,
              kit_status: "checked-out",
            },
          }
        );
      }
    }

    // Get the updated kit
    const updatedKit = await db.collection("kits").findOne({ _id: kitId });

    return NextResponse.json({
      ...updatedKit,
      id: updatedKit?._id.toString(),
      _id: undefined,
    });
  } catch (error) {
    console.error("Error checking out kit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
