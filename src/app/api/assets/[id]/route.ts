// app/api/assets/[id]/route.ts
import { MongoClient, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "motive_archive";

if (!uri) {
  throw new Error("Please add your Mongo URI to .env.local");
}

async function getClient() {
  const client = await MongoClient.connect(uri as string, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  return client;
}

type RouteContext = {
  params: {
    id: string;
  };
};

// GET single asset
export async function GET(_request: NextRequest, { params }: RouteContext) {
  let client;
  try {
    const id = params.id;
    console.log(`Fetching asset with ID: ${id}`);

    client = await getClient();
    const db = client.db(dbName);

    const asset = await db.collection("raw").findOne({
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
  } finally {
    if (client) {
      console.log(`Closing MongoDB connection for asset ${params.id}`);
      await client.close();
    }
  }
}

// PATCH single asset
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  let client;
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

    client = await getClient();
    const db = client.db(dbName);

    const updateResult = await db.collection("raw").updateOne(
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
  } finally {
    if (client) await client.close();
  }
}

// DELETE single asset
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  let client;
  try {
    const id = params.id;
    client = await getClient();
    const db = client.db(dbName);

    const deleteResult = await db.collection("raw").deleteOne({
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
  } finally {
    if (client) await client.close();
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
