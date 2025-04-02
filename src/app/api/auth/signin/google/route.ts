import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    console.log("Custom Google signin handler called:", req.url);

    // Parse callbackUrl from the request
    const url = new URL(req.url);
    const callbackUrl = url.searchParams.get("callbackUrl") || "/admin";

    console.log("Google signin callbackUrl:", callbackUrl);

    // Redirect directly to the callback URL
    // This is a temporary solution until the Next Auth integration is fixed
    return NextResponse.redirect(new URL(callbackUrl, req.url));
  } catch (error) {
    console.error("Error in Google signin handler:", error);
    return NextResponse.redirect(
      new URL("/auth/error?error=GoogleSignin", req.url)
    );
  }
}
