import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/auth";

export const dynamic = "force-dynamic";

// Log OAuth configuration without exposing secrets
function logOAuthConfig() {
  console.log("OAuth Configuration Check:", {
    GOOGLE_CLIENT_ID_SET: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_ID_LENGTH: process.env.GOOGLE_CLIENT_ID?.length,
    GOOGLE_CLIENT_SECRET_SET: !!process.env.GOOGLE_CLIENT_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
    baseUrl: process.env.NEXTAUTH_URL,
  });
}

// Wrap handlers in try-catch blocks for better error handling
export async function GET(req: NextRequest) {
  try {
    console.log("NextAuth GET handler called:", req.url);
    logOAuthConfig();

    // Validate required environment variables
    if (!process.env.NEXTAUTH_URL) {
      throw new Error("NEXTAUTH_URL is not set");
    }
    if (!process.env.NEXTAUTH_SECRET) {
      throw new Error("NEXTAUTH_SECRET is not set");
    }

    const response = await handlers.GET(req);
    console.log("NextAuth GET handler response:", {
      status: response.status,
      ok: response.ok,
    });
    return response;
  } catch (error: any) {
    console.error("Error in NextAuth GET handler:", {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
    });
    return NextResponse.json(
      { error: "Authentication error", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("NextAuth POST handler called:", req.url);
    logOAuthConfig();

    // Validate required environment variables
    if (!process.env.NEXTAUTH_URL) {
      throw new Error("NEXTAUTH_URL is not set");
    }
    if (!process.env.NEXTAUTH_SECRET) {
      throw new Error("NEXTAUTH_SECRET is not set");
    }

    const response = await handlers.POST(req);
    console.log("NextAuth POST handler response:", {
      status: response.status,
      ok: response.ok,
    });
    return response;
  } catch (error: any) {
    console.error("Error in NextAuth POST handler:", {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
    });
    return NextResponse.json(
      { error: "Authentication error", details: error?.message },
      { status: 500 }
    );
  }
}
