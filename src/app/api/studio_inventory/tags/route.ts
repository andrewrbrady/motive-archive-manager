import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const { db } = await connectToDatabase();

    // Get all items with tags
    const items = await db
      .collection("studio_inventory")
      .find({ tags: { $exists: true, $ne: [] } })
      .project({ tags: 1 })
      .toArray();

    // Extract and flatten all tags
    const allTags = items.reduce((acc: string[], item) => {
      if (item.tags && Array.isArray(item.tags)) {
        return [...acc, ...item.tags];
      }
      return acc;
    }, []);

    // Remove duplicates
    const uniqueTags = [...new Set(allTags)];

    return NextResponse.json(uniqueTags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
