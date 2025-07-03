import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Clear YouTube authentication cookies
    cookieStore.delete("youtube_access_token");
    cookieStore.delete("youtube_refresh_token");

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("YouTube authentication cookies cleared");

    return NextResponse.json({
      success: true,
      message: "YouTube authentication cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing YouTube authentication:", error);
    return NextResponse.json(
      {
        error: "Failed to clear YouTube authentication",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
