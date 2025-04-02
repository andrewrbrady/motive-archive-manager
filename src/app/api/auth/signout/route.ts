import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    console.log("Custom sign-out handler called:", req.url);

    // Parse callbackUrl from the request or use default
    const url = new URL(req.url);
    const callbackUrl = url.searchParams.get("callbackUrl") || "/";

    // Set cookie expiry to past date to clear it
    const response = NextResponse.redirect(new URL(callbackUrl, req.url));

    // Clear any auth cookies
    response.cookies.set("next-auth.session-token", "", {
      expires: new Date(0),
      path: "/",
    });

    response.cookies.set("__Secure-next-auth.session-token", "", {
      expires: new Date(0),
      path: "/",
      secure: true,
    });

    // Also clear the callback cookie
    response.cookies.set("next-auth.callback-url", "", {
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error in sign-out handler:", error);
    return NextResponse.redirect(new URL("/", req.url));
  }
}
