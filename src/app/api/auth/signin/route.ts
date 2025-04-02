import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    console.log("Custom signin handler called:", req.url);

    // Redirect to the signin page
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  } catch (error) {
    console.error("Error in custom signin handler:", error);
    return NextResponse.redirect(new URL("/auth/error", req.url));
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("Custom signin POST handler called");

    // Parse the request body
    const body = await req.json();
    console.log("Signin request body:", JSON.stringify(body, null, 2));

    // Return a mock success response
    return NextResponse.json({
      url: "/admin",
      ok: true,
    });
  } catch (error) {
    console.error("Error in custom signin POST handler:", error);

    // Return an error response
    return NextResponse.json(
      {
        error: "Authentication failed",
        ok: false,
      },
      { status: 401 }
    );
  }
}
