import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");

    console.log("Fetching makes from MongoDB...");
    const makes = await db
      .collection("makes")
      .find({ active: true })
      .sort({ name: 1 })
      .toArray();

    console.log(`Successfully fetched ${makes.length} makes`);

    const formattedMakes = makes.map((make) => ({
      _id: make._id.toString(),
      name: make.name,
      country_of_origin: make.country_of_origin,
      founded: make.founded,
      type: make.type,
      parent_company: make.parent_company,
      created_at: make.created_at,
      updated_at: make.updated_at,
      active: make.active,
    }));

    return NextResponse.json(formattedMakes);
  } catch (error) {
    console.error("Error fetching makes:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch makes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.country_of_origin) {
      return NextResponse.json(
        { error: "Name and country of origin are required" },
        { status: 400 }
      );
    }

    const newMake = {
      ...body,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("makes").insertOne(newMake);

    return NextResponse.json({
      _id: result.insertedId.toString(),
      ...newMake,
    });
  } catch (error) {
    console.error("Error creating make:", error);
    return NextResponse.json(
      { error: "Failed to create make" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const body = await request.json();

    if (!body._id) {
      return NextResponse.json(
        { error: "Make ID is required" },
        { status: 400 }
      );
    }

    const { _id, ...updateData } = body;
    updateData.updated_at = new Date();

    const result = await db
      .collection("makes")
      .updateOne({ _id: new ObjectId(_id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Make not found" }, { status: 404 });
    }

    return NextResponse.json({ _id, ...updateData });
  } catch (error) {
    console.error("Error updating make:", error);
    return NextResponse.json(
      { error: "Failed to update make" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Make ID is required" },
        { status: 400 }
      );
    }

    // Soft delete by setting active to false
    const result = await db.collection("makes").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          active: false,
          updated_at: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Make not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting make:", error);
    return NextResponse.json(
      { error: "Failed to delete make" },
      { status: 500 }
    );
  }
}
