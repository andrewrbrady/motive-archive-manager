import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";

interface PlatformSetting {
  key: string;
  name: string;
  description: string;
  instructions: string;
  icon?: string;
}

// GET - Fetch platform settings for admin management
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin (you may need to adjust this based on your admin check logic)
    // For now, assuming any authenticated user can access admin settings
    // You might want to add a proper admin role check here

    const { db } = await connectToDatabase();
    const settings = await db
      .collection("platformSettings")
      .find({})
      .sort({ key: 1 })
      .toArray();

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching platform settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch platform settings" },
      { status: 500 }
    );
  }
}

// POST - Save platform settings
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin (you may need to adjust this based on your admin check logic)
    // For now, assuming any authenticated user can manage admin settings
    // You might want to add a proper admin role check here

    const settings: PlatformSetting[] = await request.json();

    // Validate the settings
    for (const setting of settings) {
      if (
        !setting.key ||
        !setting.name ||
        !setting.description ||
        !setting.instructions
      ) {
        return NextResponse.json(
          { error: "All fields are required for each platform setting" },
          { status: 400 }
        );
      }

      // Validate key format (alphanumeric and underscores only)
      if (!/^[a-zA-Z0-9_]+$/.test(setting.key)) {
        return NextResponse.json(
          {
            error:
              "Platform key can only contain letters, numbers, and underscores",
          },
          { status: 400 }
        );
      }
    }

    // Check for duplicate keys
    const keys = settings.map((s) => s.key);
    const uniqueKeys = new Set(keys);
    if (keys.length !== uniqueKeys.size) {
      return NextResponse.json(
        { error: "Duplicate platform keys are not allowed" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Clear existing settings and insert new ones
    await db.collection("platformSettings").deleteMany({});

    if (settings.length > 0) {
      await db.collection("platformSettings").insertMany(settings);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving platform settings:", error);
    return NextResponse.json(
      { error: "Failed to save platform settings" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific platform setting
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Platform key is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const result = await db.collection("platformSettings").deleteOne({ key });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Platform setting not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting platform setting:", error);
    return NextResponse.json(
      { error: "Failed to delete platform setting" },
      { status: 500 }
    );
  }
}
