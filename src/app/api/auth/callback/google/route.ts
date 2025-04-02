import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    console.log("Custom Google callback handler called:", req.url);

    // Parse callbackUrl from the request
    const url = new URL(req.url);
    const callbackUrl = url.searchParams.get("callbackUrl") || "/admin";

    console.log("Google callback redirecting to:", callbackUrl);

    // Redirect to the callback URL
    return NextResponse.redirect(new URL(callbackUrl, req.url));
  } catch (error) {
    console.error("Error in Google callback handler:", error);
    return NextResponse.redirect(
      new URL("/auth/error?error=GoogleCallback", req.url)
    );
  }
}
