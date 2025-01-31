// app/api/assets/[id]/route.ts
import { Collection, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

interface Asset {
  _id: ObjectId;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

type RouteContext = {
  params: {
    id: string;
  };
};

// GET single asset
export async function GET(_request: NextRequest, { params }: RouteContext) {
  let dbConnection;
  try {
    const id = params.id;
    console.log(`Fetching asset with ID: ${id}`);

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collection
    const assetsCollection: Collection<Asset> = db.collection("raw");

    const asset = await assetsCollection.findOne({
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

// PUT single asset
export async function PUT(request: NextRequest, { params }: RouteContext) {
  let dbConnection;
  try {
    const id = params.id;
    const body = await request.json();

    if (!body.name || !body.description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collection
    const assetsCollection: Collection<Asset> = db.collection("raw");

    const updateResult = await assetsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...body,
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Asset updated successfully" });
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
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  let dbConnection;
  try {
    const id = params.id;

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collection
    const assetsCollection: Collection<Asset> = db.collection("raw");

    const deleteResult = await assetsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Asset deleted successfully" });
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
