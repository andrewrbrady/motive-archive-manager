import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Get the hostname of the request
  const hostname = request.headers.get("host") || "";
  const referer = request.headers.get("referer") || "";

  // Check if this is an API request
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Allow requests from Vercel deployment URLs and localhost
    const isVercelDeployment = hostname.endsWith(".vercel.app");
    const isLocalhost = hostname.includes("localhost");
    const isAllowedReferer = referer.includes(hostname) || referer === "";

    // For API routes, we want to allow the request if it's from our deployment or localhost
    if (isVercelDeployment || isLocalhost || isAllowedReferer) {
      const response = NextResponse.next();

      // Add CORS headers
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );

      return response;
    }

    // If not authorized, return 401
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // For non-API routes, continue as normal
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
