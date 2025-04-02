import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/auth";

export const dynamic = "force-dynamic";

// Add error handling for the providers route
export async function GET(req: NextRequest) {
  try {
    console.log("NextAuth providers handler called:", req.url);

    return await handlers.GET(req);
  } catch (error: any) {
    console.error("Error in NextAuth providers handler:", error);

    // Detailed error response for debugging
    return NextResponse.json(
      {
        error: "Authentication error",
        message: error?.message || "Unknown error",
        code: error?.code,
        name: error?.name,
      },
      {
        status: 500,
      }
    );
  }
}
