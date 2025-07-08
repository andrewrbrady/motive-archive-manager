import { NextRequest, NextResponse } from "next/server";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import { connectToDatabase } from "@/lib/mongodb";

interface LengthSetting {
  key: string;
  name: string;
  description: string;
  instructions: string;
}

// GET - Fetch length settings for admin management
export async function GET(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 GET /api/admin/length-settings: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ GET /api/admin/length-settings: Authentication failed");
    return authResult;
  }

  try {
    console.log(
      "🔒 GET /api/admin/length-settings: Authentication successful, fetching settings"
    );
    const { db } = await connectToDatabase();
    const settings = await db
      .collection("lengthSettings")
      .find({})
      .sort({ key: 1 })
      .toArray();

    console.log(
      "✅ GET /api/admin/length-settings: Successfully fetched settings",
      {
        count: settings.length,
      }
    );
    return NextResponse.json(settings);
  } catch (error) {
    console.error(
      "💥 GET /api/admin/length-settings: Error fetching length settings:",
      error
    );
    return NextResponse.json(
      { error: "Failed to fetch length settings" },
      { status: 500 }
    );
  }
}

// POST - Save length settings
export async function POST(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 POST /api/admin/length-settings: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ POST /api/admin/length-settings: Authentication failed");
    return authResult;
  }

  try {
    const settings: LengthSetting[] = await request.json();

    // Validate the settings
    for (const setting of settings) {
      if (
        !setting.key ||
        !setting.name ||
        !setting.description ||
        !setting.instructions
      ) {
        return NextResponse.json(
          {
            error:
              "All fields (key, name, description, instructions) are required for each length setting",
          },
          { status: 400 }
        );
      }

      // Validate key format (alphanumeric and underscores only)
      if (!/^[a-zA-Z0-9_]+$/.test(setting.key)) {
        return NextResponse.json(
          {
            error:
              "Length setting key can only contain letters, numbers, and underscores",
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
        { error: "Duplicate length setting keys are not allowed" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Clear existing settings and insert new ones
    await db.collection("lengthSettings").deleteMany({});

    if (settings.length > 0) {
      await db.collection("lengthSettings").insertMany(settings);
    }

    console.log(
      "✅ POST /api/admin/length-settings: Successfully saved settings"
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "💥 POST /api/admin/length-settings: Error saving length settings:",
      error
    );
    return NextResponse.json(
      { error: "Failed to save length settings" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific length setting
export async function DELETE(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 DELETE /api/admin/length-settings: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ DELETE /api/admin/length-settings: Authentication failed");
    return authResult;
  }

  try {
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

    console.log(
      "✅ DELETE /api/admin/length-settings: Successfully deleted setting"
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "💥 DELETE /api/admin/length-settings: Error deleting length setting:",
      error
    );
    return NextResponse.json(
      { error: "Failed to delete length setting" },
      { status: 500 }
    );
  }
}
