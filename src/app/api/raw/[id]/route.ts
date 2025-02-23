import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { RawAsset } from "@/types/inventory";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const rawCollection = db.collection("raw");

    const asset = await rawCollection.findOne({
      _id: new ObjectId(params.id),
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...asset,
      _id: asset._id.toString(),
    });
  } catch (error) {
    console.error("Error fetching raw asset:", error);
    return NextResponse.json(
      { error: "Failed to fetch raw asset" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const rawCollection = db.collection("raw");

    const data = await request.json();
    const updateData = {
      ...data,
      updatedAt: new Date(),
      carIds: data.carIds?.map((id: string) => new ObjectId(id)),
    };
    delete updateData._id;

    const result = await rawCollection.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating raw asset:", error);
    return NextResponse.json(
      { error: "Failed to update raw asset" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const rawCollection = db.collection("raw");

    const result = await rawCollection.deleteOne({
      _id: new ObjectId(params.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting raw asset:", error);
    return NextResponse.json(
      { error: "Failed to delete raw asset" },
      { status: 500 }
    );
  }
}
