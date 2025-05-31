import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { defaultEventTypeSettings, EventTypeSetting } from "@/types/eventType";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";

export async function GET(request: NextRequest) {
  console.log("🔒 GET /api/event-type-settings: Starting request");

  // Check authentication (allow all authenticated users, not just admins)
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    console.log("❌ GET /api/event-type-settings: Authentication failed");
    return authResult;
  }

  try {
    console.log(
      "🔒 GET /api/event-type-settings: Authentication successful, fetching settings"
    );
    const db = await getDatabase();
    const collection = db.collection("eventTypeSettings");

    // Try to get settings from database
    const settings = await collection.findOne({
      _id: "eventTypeSettings",
    } as any);

    if (!settings || !settings.settings) {
      // Return default settings if none exist
      console.log(
        "✅ GET /api/event-type-settings: Returning default settings"
      );
      return NextResponse.json(defaultEventTypeSettings);
    }

    console.log(
      "✅ GET /api/event-type-settings: Successfully fetched settings",
      {
        count: settings.settings.length,
      }
    );
    return NextResponse.json(settings.settings);
  } catch (error) {
    console.error(
      "💥 GET /api/event-type-settings: Error fetching event type settings:",
      error
    );
    return NextResponse.json(
      { error: "Failed to fetch event type settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log("🔒 POST /api/event-type-settings: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    console.log("❌ POST /api/event-type-settings: Authentication failed");
    return authResult;
  }

  try {
    const settings: EventTypeSetting[] = await request.json();

    // Validate settings
    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { error: "Settings must be an array" },
        { status: 400 }
      );
    }

    // Validate each setting
    for (const setting of settings) {
      if (
        !setting.key ||
        !setting.name ||
        !setting.description ||
        !setting.icon ||
        !setting.color ||
        !setting.category
      ) {
        return NextResponse.json(
          {
            error:
              "Each setting must have key, name, description, icon, color, and category",
          },
          { status: 400 }
        );
      }
    }

    const db = await getDatabase();
    const collection = db.collection("eventTypeSettings");

    // Upsert the settings
    await collection.replaceOne(
      { _id: "eventTypeSettings" } as any,
      {
        _id: "eventTypeSettings",
        settings,
        updatedAt: new Date(),
      },
      { upsert: true }
    );

    console.log(
      "✅ POST /api/event-type-settings: Successfully saved settings"
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "💥 POST /api/event-type-settings: Error saving event type settings:",
      error
    );
    return NextResponse.json(
      { error: "Failed to save event type settings" },
      { status: 500 }
    );
  }
}
