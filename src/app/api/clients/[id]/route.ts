import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface Client {
  _id: ObjectId;
  name: string;
  website?: string;
  primaryContactId?: ObjectId;
  cars?: any[];
  documents?: any[];
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const db = await getDatabase();

    // Check if there are any associated cars
    const carCount = await db.collection("cars").countDocuments({
      clientId: new ObjectId(id),
    });

    if (carCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete client with associated cars" },
        { status: 400 }
      );
    }

    // Delete client
    const result = await db.collection("clients").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
