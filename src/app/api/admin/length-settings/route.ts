import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";

interface LengthSetting {
  key: string;
  name: string;
  description: string;
  instructions: string;
}

// GET - Fetch length settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const settings = await db
      .collection("lengthSettings")
      .find({})
      .sort({ key: 1 })
      .toArray();

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching length settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch length settings" },
      { status: 500 }
    );
  }
}

// POST - Save/update length settings
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lengthSettings: LengthSetting[] = await request.json();

    if (!Array.isArray(lengthSettings)) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      );
    }

    // Validate each setting
    for (const setting of lengthSettings) {
      if (
        !setting.key ||
        !setting.name ||
        !setting.description ||
        !setting.instructions
      ) {
        return NextResponse.json(
          { error: "Missing required fields in length setting" },
          { status: 400 }
        );
      }

      // Validate key format (alphanumeric and underscores only)
      if (!/^[a-zA-Z0-9_]+$/.test(setting.key)) {
        return NextResponse.json(
          {
            error:
              "Invalid length setting key format. Use only letters, numbers, and underscores.",
          },
          { status: 400 }
        );
      }
    }

    const { db } = await connectToDatabase();

    // Process each setting individually to avoid bulk write conflicts
    for (const setting of lengthSettings) {
      const existingDoc = await db
        .collection("lengthSettings")
        .findOne({ key: setting.key });

      if (existingDoc) {
        // Update existing document
        await db.collection("lengthSettings").updateOne(
          { key: setting.key },
          {
            $set: {
              name: setting.name,
              description: setting.description,
              instructions: setting.instructions,
              updatedAt: new Date(),
            },
          }
        );
      } else {
        // Insert new document
        await db.collection("lengthSettings").insertOne({
          key: setting.key,
          name: setting.name,
          description: setting.description,
          instructions: setting.instructions,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving length settings:", error);
    return NextResponse.json(
      { error: "Failed to save length settings" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific length setting
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Length setting key is required" },
        { status: 400 }
      );
    }

    // Prevent deleting default settings
    const defaultKeys = ["concise", "standard", "detailed", "comprehensive"];
    if (defaultKeys.includes(key)) {
      return NextResponse.json(
        { error: "Cannot delete default length settings" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const result = await db.collection("lengthSettings").deleteOne({ key });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Length setting not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting length setting:", error);
    return NextResponse.json(
      { error: "Failed to delete length setting" },
      { status: 500 }
    );
  }
}
