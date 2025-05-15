import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This is a simplified middleware version to test if it resolves the error
export function middleware(request: NextRequest) {
  // Allow all requests to proceed normally
  return NextResponse.next();
}

// Export a config object with a matcher
export const config = {
  matcher: [
    // Exclude certain paths from middleware processing
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
