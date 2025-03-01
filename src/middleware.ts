import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Just make sure we don't interfere with API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Handle direct access to old routes that now redirect to admin tabs
  if (pathname === "/users") {
    return NextResponse.redirect(new URL("/admin?tab=users", request.url));
  }

  if (pathname === "/clients") {
    return NextResponse.redirect(new URL("/admin?tab=clients", request.url));
  }

  if (pathname === "/locations") {
    return NextResponse.redirect(new URL("/admin?tab=locations", request.url));
  }

  // Get the origin from the request headers
  const origin = request.headers.get("origin") || "*";

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET,OPTIONS,POST,PUT,DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Get response from the endpoint
  const response = NextResponse.next();

  // Add CORS headers to the response
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,POST,PUT,DELETE"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  return response;
}

export const config = {
  matcher: ["/api/:path*", "/users", "/clients", "/locations", "/admin"],
};
