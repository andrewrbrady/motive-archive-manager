import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { EventType } from "@/types/event";

const DEFAULT_TEMPLATES = {
  "Standard Process": {
    name: "Standard Process",
    events: [
      {
        type: EventType.INSPECTION,
        description: "Initial inspection and documentation",
        daysFromStart: 0,
        hasEndDate: true,
        daysUntilEnd: 1,
      },
      {
        type: EventType.DETAIL,
        description: "Full detail and preparation",
        daysFromStart: 1,
        hasEndDate: true,
        daysUntilEnd: 2,
      },
      {
        type: EventType.CATALOG,
        description: "Photo/video shoot for listing",
        daysFromStart: 3,
        hasEndDate: true,
        daysUntilEnd: 1,
      },
      {
        type: EventType.AUCTION_SUBMISSION,
        description: "Submit car to auction platform",
        daysFromStart: 4,
        isAllDay: true,
      },
      {
        type: EventType.AUCTION_LISTING,
        description: "Auction listing goes live",
        daysFromStart: 7,
        isAllDay: true,
      },
      {
        type: EventType.AUCTION_END,
        description: "Auction ends",
        daysFromStart: 14,
        isAllDay: true,
      },
    ],
  },
};

export async function POST() {
  try {
    const db = await getDatabase();
    const collection = db.collection("event_templates");

    // Insert or update each template
    await Promise.all(
      Object.values(DEFAULT_TEMPLATES).map((template) =>
        collection.updateOne(
          { name: template.name },
          { $set: template },
          { upsert: true }
        )
      )
    );

    return NextResponse.json({
      success: true,
      message: "Default templates seeded successfully",
    });
  } catch (error) {
    console.error("Error seeding templates:", error);
    return NextResponse.json(
      { error: "Failed to seed templates" },
      { status: 500 }
    );
  }
}
