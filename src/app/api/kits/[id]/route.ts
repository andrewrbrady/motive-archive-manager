import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

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
  checkoutHistory?: Array<{
    checkedOutDate?: Date;
    expectedReturnDate?: Date;
    actualReturnDate?: Date;
    checkedOutBy?: string;
    checkedOutTo?: string;
  }>;
  [key: string]: any;
}

// GET a specific kit
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

    // Validate ObjectId
    let kitId;
    try {
      kitId = new ObjectId(id);
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
    };
    delete formattedKit._id;

    // Get the items in this kit
    if (kit.items && Array.isArray(kit.items)) {
      const itemIds = kit.items
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

        formattedKit.itemDetails = kitItems.map((item) => ({
          id: item._id.toString(),
          name: item.name,
          category: item.category,
          manufacturer: item.manufacturer,
          model: item.model,
          isAvailable: item.is_available,
          kitStatus: item.kit_status,
          primaryImage: item.primary_image,
        }));
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
    let kitId;
    try {
      kitId = new ObjectId(id);
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
    const updateData = {
      ...data,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      updatedAt: new Date(),
      checkoutDate: data.checkoutDate ? new Date(data.checkoutDate) : undefined,
      expectedReturnDate: data.expectedReturnDate
        ? new Date(data.expectedReturnDate)
        : undefined,
    };

    // Process checkout history if it exists
    if (data.checkoutHistory && Array.isArray(data.checkoutHistory)) {
      updateData.checkoutHistory = data.checkoutHistory.map((record: any) => ({
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

    // Update items' kit_status
    if (itemsToAdd.length > 0 || itemsToRemove.length > 0) {
      const addPromise = itemsToAdd.length
        ? db
            .collection("studio_inventory")
            .updateMany(
              {
                _id: { $in: itemsToAdd.map((id: string) => new ObjectId(id)) },
              },
              { $set: { kit_status: kitId.toString() } }
            )
        : Promise.resolve();

      const removePromise = itemsToRemove.length
        ? db.collection("studio_inventory").updateMany(
            {
              _id: {
                $in: itemsToRemove.map((id: string) => new ObjectId(id)),
              },
            },
            { $set: { kit_status: null } }
          )
        : Promise.resolve();

      await Promise.all([addPromise, removePromise]);
    }

    // Update the kit
    const result = await db
      .collection("kits")
      .updateOne({ _id: kitId }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: kitId.toString() });
  } catch (error) {
    console.error("Error updating kit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE a kit
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
    let kitId;
    try {
      kitId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid kit ID format" },
        { status: 400 }
      );
    }

    // Get the kit to be deleted
    const kit = await db.collection("kits").findOne({ _id: kitId });

    if (!kit) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    // Remove kit_status from all items in the kit
    if (kit.items && Array.isArray(kit.items)) {
      await db.collection("studio_inventory").updateMany(
        {
          _id: {
            $in: kit.items.map((id: string) => new ObjectId(id)),
          },
        },
        { $set: { kit_status: null } }
      );
    }

    // Delete the kit
    const result = await db.collection("kits").deleteOne({ _id: kitId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting kit:", error);
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
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
