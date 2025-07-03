import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

// GET - Fetch active brand tones
export async function GET(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📂 GET /api/brand-tones/active: Starting request");

  try {
    const { db } = await connectToDatabase();
    const activeBrandTones = await db
      .collection("brand_tones")
      .find({ is_active: true })
      .sort({ name: 1 })
      .toArray();

    console.log(
      "✅ GET /api/brand-tones/active: Successfully fetched active brand tones",
      {
        count: activeBrandTones.length,
      }
    );

    return NextResponse.json(activeBrandTones);
  } catch (error) {
    console.error(
      "💥 GET /api/brand-tones/active: Error fetching active brand tones:",
      error
    );
    return NextResponse.json(
      { error: "Failed to fetch active brand tones" },
      { status: 500 }
    );
  }
}
