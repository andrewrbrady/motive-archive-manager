// app/api/assets/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

// GET single asset
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    console.log(`Fetching asset with ID: ${id}`);

    const db = await getDatabase();
    const asset = await db.collection("raw_assets").findOne({
      _id: new ObjectId(id),
    });

    if (!asset) {
      console.log(`Asset not found with ID: ${id}`);
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
  }
}

// PATCH single asset
export async function PATCH(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const data = await request.json();

    const db = await getDatabase();
    const result = await db
      .collection("raw_assets")
      .updateOne({ _id: new ObjectId(id) }, { $set: data });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update asset",
      },
      { status: 500 }
    );
  }
}

// DELETE single asset
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const db = await getDatabase();
    const result = await db.collection("raw_assets").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete asset",
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
