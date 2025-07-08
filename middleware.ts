import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This is a simplified middleware version to test if it resolves the error
export function middleware(request: NextRequest) {
  const url = request.nextUrl.pathname;

  // EXPLICITLY skip all API routes
  if (url.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip other Next.js internal routes
  if (url.startsWith("/_next/") || url.includes("favicon.ico")) {
    return NextResponse.next();
  }

  // Allow all other requests to proceed normally
  return NextResponse.next();
}

// Export a config object with a matcher
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
