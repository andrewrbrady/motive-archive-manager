import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/auth";

export const dynamic = "force-dynamic";

// Add more comprehensive error handling for the session route
export async function GET(req: NextRequest) {
  try {
    // [REMOVED] // [REMOVED] console.log("NextAuth session handler called:", req.url);

    // Log out key environment variables (excluding sensitive data)
    console.log("Auth environment check:", {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "Not set",
      NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
    });

    return await handlers.GET(req);
  } catch (error: any) {
    console.error("Error in NextAuth session handler:", error);

    // Detailed error response for debugging
    return NextResponse.json(
      {
        error: "Authentication error",
        message: error?.message || "Unknown error",
        stack:
          process.env.NODE_ENV === "development" ? error?.stack : undefined,
        code: error?.code,
        name: error?.name,
      },
      {
        status: 500,
      }
    );
  }
}

// Add POST method with similar error handling
export async function POST(req: NextRequest) {
  try {
    // [REMOVED] // [REMOVED] console.log("NextAuth session POST handler called:", req.url);
    return await handlers.POST(req);
  } catch (error: any) {
    console.error("Error in NextAuth session POST handler:", error);
    return NextResponse.json(
      {
        error: "Authentication error",
        message: error?.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}
