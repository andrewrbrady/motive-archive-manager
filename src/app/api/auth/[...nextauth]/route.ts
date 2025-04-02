import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    console.log("[bypass] NextAuth catchall GET handler:", req.url);

    // Redirects to appropriate pages based on the route
    const url = new URL(req.url);
    const path = url.pathname;

    if (path.endsWith("/signin")) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    if (path.endsWith("/error")) {
      return NextResponse.redirect(new URL("/auth/error", req.url));
    }

    if (path.endsWith("/signout")) {
      return NextResponse.redirect(new URL("/auth/signout", req.url));
    }

    // For session requests, return an empty session
    if (path.endsWith("/session")) {
      return NextResponse.json({
        user: null,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Handle other endpoints with empty responses
    return NextResponse.json({});
  } catch (error: any) {
    console.error("Error in NextAuth bypass handler:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("[bypass] NextAuth catchall POST handler:", req.url);

    // Parse the request body if possible
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      // Ignore JSON parse errors
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // For signin requests, return success
    if (path.includes("/signin")) {
      const callbackUrl = (body as any).callbackUrl || "/admin";
      return NextResponse.json({
        url: callbackUrl,
        ok: true,
      });
    }

    // For CSRF token requests
    if (path.includes("/csrf")) {
      return NextResponse.json({ csrfToken: "mock_csrf_token" });
    }

    // Default response
    return NextResponse.json({});
  } catch (error: any) {
    console.error("Error in NextAuth bypass POST handler:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
