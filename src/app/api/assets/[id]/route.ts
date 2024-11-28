import { MongoClient, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

const uri = "mongodb://localhost:27017";
const dbName = "arb_assets";

// Add allowed methods
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let client;
  try {
    const { id } = await context.params;

    client = await MongoClient.connect(uri);
    const db = client.db(dbName);

    const asset = await db.collection("raw").findOne({ _id: new ObjectId(id) });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch asset",
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let client;
  try {
    const { id } = await context.params;
    const { field, value } = await request.json();

    // Validate the input
    if (!field || value === undefined) {
      return NextResponse.json(
        { error: "Field and value are required" },
        { status: 400 }
      );
    }

    // Validate field is one we allow updating
    const allowedFields = ["name", "description"];
    if (!allowedFields.includes(field)) {
      return NextResponse.json(
        { error: "Invalid field for update" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    client = await MongoClient.connect(uri);
    const db = client.db(dbName);

    // Get the current document
    const currentDoc = await db
      .collection("raw")
      .findOne({ _id: new ObjectId(id) });

    if (!currentDoc) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Update the document
    const result = await db.collection("raw").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          [field]: value,
          // Add any other fields that need to be preserved
          ...Object.fromEntries(
            Object.entries(currentDoc).filter(
              ([key]) => key !== "_id" && key !== field
            )
          ),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Log successful update
    console.log(`Successfully updated ${field} for asset ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update asset",
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let client;
  try {
    const { id } = await context.params;

    client = await MongoClient.connect(uri);
    const db = client.db(dbName);

    const result = await db.collection("raw").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete asset",
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
