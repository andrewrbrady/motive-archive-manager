import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/auth";

export const dynamic = "force-dynamic";

// Wrap handlers in try-catch blocks for better error handling
export async function GET(req: NextRequest) {
  try {
    console.log("NextAuth GET handler called:", req.url);
    return await handlers.GET(req);
  } catch (error) {
    console.error("Error in NextAuth GET handler:", error);
    return NextResponse.json(
      { error: "Authentication error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("NextAuth POST handler called:", req.url);
    return await handlers.POST(req);
  } catch (error) {
    console.error("Error in NextAuth POST handler:", error);
    return NextResponse.json(
      { error: "Authentication error" },
      { status: 500 }
    );
  }
}
