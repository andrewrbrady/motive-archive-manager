import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { RawAsset } from "@/types/inventory";

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const rawCollection = db.collection("raw");

    const data = await request.json();
    const assets: Partial<RawAsset>[] = data.map((row: any) => {
      // Filter out empty locations
      const locations = [
        row["location 1"],
        row["location 2"],
        row["location 3"],
        row["location 4"],
      ].filter(Boolean);

      return {
        date: row.date,
        client: row.client || undefined,
        description: row.description,
        locations,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    // Insert the processed data
    const result = await rawCollection.insertMany(assets as any[]);

    return NextResponse.json({
      success: true,
      insertedCount: result.insertedCount,
    });
  } catch (error) {
    console.error("Error importing raw assets:", error);
    return NextResponse.json(
      { success: false, error: "Failed to import raw assets" },
      { status: 500 }
    );
  }
}
