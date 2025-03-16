import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Define types for our formatted kit response
interface FormattedKitItem {
  id: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  isAvailable: boolean;
  kitStatus: string | null;
  primaryImage?: string;
}

interface FormattedKit {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  items?: string[];
  itemDetails?: FormattedKitItem[];
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  checkedOutTo?: string;
  checkoutDate?: Date;
  expectedReturnDate?: Date;
  checkoutHistory?: any[];
  [key: string]: any;
}

// GET a specific kit
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
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

    // Find the kit
    const kit = await db.collection("kits").findOne({ _id: kitId });

    if (!kit) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    // Format the response
    const formattedKit: FormattedKit = {
      ...kit,
      id: kit._id.toString(),
      _id: undefined,
    };

    // Get the items in this kit
    if (kit.items && Array.isArray(kit.items)) {
      // Filter out invalid ObjectIds
      const itemIds: ObjectId[] = kit.items
        .map((id: string) => {
          try {
            return new ObjectId(id);
          } catch (error) {
            return null;
          }
        })
        .filter((id): id is ObjectId => id !== null);

      if (itemIds.length > 0) {
        const kitItems = await db
          .collection("studio_inventory")
          .find({ _id: { $in: itemIds } })
          .toArray();

        // Format the items
        const formattedItems = kitItems.map((item) => ({
          id: item._id.toString(),
          name: item.name,
          category: item.category,
          manufacturer: item.manufacturer,
          model: item.model,
          isAvailable: item.is_available,
          kitStatus: item.kit_status,
          primaryImage: item.primary_image,
        }));

        formattedKit.itemDetails = formattedItems;
      }
    }

    return NextResponse.json(formattedKit);
  } catch (error) {
    console.error("Error fetching kit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// UPDATE a kit
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const data = await request.json();

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

    // Get the current kit to compare items
    const currentKit = await db.collection("kits").findOne({ _id: kitId });

    if (!currentKit) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    // Process dates
    if (data.createdAt) {
      data.createdAt = new Date(data.createdAt);
    }

    if (data.updatedAt) {
      data.updatedAt = new Date();
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

    // Find items to add and remove from the kit
    const currentItems = currentKit.items || [];
    const newItems = data.items || [];

    const itemsToAdd = newItems.filter(
      (id: string) => !currentItems.includes(id)
    );
    const itemsToRemove = currentItems.filter(
      (id: string) => !newItems.includes(id)
    );

    // Update the kit
    const updateResult = await db
      .collection("kits")
      .updateOne({ _id: kitId }, { $set: data });

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    // Update items being added to the kit
    if (itemsToAdd.length > 0) {
      const addPromises = itemsToAdd.map((itemId: string) =>
        db.collection("studio_inventory").updateOne(
          { _id: new ObjectId(itemId) },
          {
            $set: {
              current_kit_id: params.id,
              is_available: true,
              kit_status: "in-kit",
            },
          }
        )
      );

      await Promise.all(addPromises);
    }

    // Update items being removed from the kit
    if (itemsToRemove.length > 0) {
      const removePromises = itemsToRemove.map((itemId: string) =>
        db.collection("studio_inventory").updateOne(
          { _id: new ObjectId(itemId), current_kit_id: params.id },
          {
            $set: {
              is_available: true,
              kit_status: null,
            },
            $unset: { current_kit_id: "" },
          }
        )
      );

      await Promise.all(removePromises);
    }

    return NextResponse.json({
      id: params.id,
      ...data,
    });
  } catch (error) {
    console.error("Error updating kit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE a kit
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
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

    // Get the kit to find its items
    const kit = await db.collection("kits").findOne({ _id: kitId });

    if (!kit) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    // Delete the kit
    const deleteResult = await db.collection("kits").deleteOne({ _id: kitId });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    // Update all items that were part of this kit
    if (kit.items && Array.isArray(kit.items)) {
      const updatePromises = kit.items.map((itemId: string) =>
        db.collection("studio_inventory").updateOne(
          { _id: new ObjectId(itemId), current_kit_id: params.id },
          {
            $set: {
              is_available: true,
              kit_status: null,
            },
            $unset: { current_kit_id: "" },
          }
        )
      );

      await Promise.all(updatePromises);
    }

    return NextResponse.json({ id: params.id, deleted: true });
  } catch (error) {
    console.error("Error deleting kit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
