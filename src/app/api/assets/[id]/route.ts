// app/api/assets/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    id: string;
  };
};

// GET single asset
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const id = params.id;
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
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const id = params.id;
    const data = await request.json();
    const { field, value } = data;

    if (!field || value === undefined) {
      return NextResponse.json(
        { error: "Field and value are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const updateResult = await db.collection("raw_assets").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          [field]: value,
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
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
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const id = params.id;
    const db = await getDatabase();

    const deleteResult = await db.collection("raw_assets").deleteOne({
      _id: new ObjectId(id),
    });

    if (deleteResult.deletedCount === 0) {
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
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
