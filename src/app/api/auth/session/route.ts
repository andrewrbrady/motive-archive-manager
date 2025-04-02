import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    console.log("Custom NextAuth session handler called:", req.url);

    // Return an empty session response
    // This allows the client to initialize properly while we debug
    return NextResponse.json({
      user: null,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error: any) {
    console.error("Error in custom session handler:", error);

    // Return a simple error response
    return NextResponse.json({
      user: null,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
}

// Add POST method with similar error handling
export async function POST(req: NextRequest) {
  try {
    console.log("NextAuth session POST handler called:", req.url);

    // Return a simple session response for the POST method too
    return NextResponse.json({
      user: null,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
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
