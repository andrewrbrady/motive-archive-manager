import { NextRequest, NextResponse } from "next/server";
import {
  closeConnection,
  connectToDatabase,
  getConnectionStats,
} from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === "reset") {
      // Close all existing connections
      await closeConnection();

      // Create a fresh connection
      const { db } = await connectToDatabase();

      // Get new connection stats
      const stats = await getConnectionStats();

      return NextResponse.json({
        message: "Successfully reset MongoDB connections",
        stats,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error managing MongoDB connections:", error);
    return NextResponse.json(
      { error: "Failed to manage MongoDB connections" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = await getConnectionStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching MongoDB stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch MongoDB stats" },
      { status: 500 }
    );
  }
}
