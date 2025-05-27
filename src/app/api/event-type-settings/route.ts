import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { defaultEventTypeSettings, EventTypeSetting } from "@/types/eventType";

export async function GET() {
  try {
    const db = await getDatabase();
    const collection = db.collection("eventTypeSettings");

    // Try to get settings from database
    const settings = await collection.findOne({
      _id: "eventTypeSettings",
    } as any);

    if (!settings || !settings.settings) {
      // Return default settings if none exist
      return NextResponse.json(defaultEventTypeSettings);
    }

    return NextResponse.json(settings.settings);
  } catch (error) {
    console.error("Error fetching event type settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch event type settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving event type settings:", error);
    return NextResponse.json(
      { error: "Failed to save event type settings" },
      { status: 500 }
    );
  }
}
