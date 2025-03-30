import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/auth"];

  // Check if the current path is public
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Always allow API routes
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

  // For all non-public routes, redirect to signin if no auth session
  if (!isPublicRoute) {
    // Use the NextAuth auth function to check for a session
    const session = await auth();

    if (!session) {
      console.log(
        `No auth session found for ${pathname}, redirecting to signin`
      );
      const signInUrl = new URL("/auth/signin", request.url);
      // Add the current URL as a callback URL
      signInUrl.searchParams.set("callbackUrl", request.url);
      return NextResponse.redirect(signInUrl);
    }
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
  matcher: [
    /*
     * Match all request paths except:
     * 1. _next/static (static files)
     * 2. _next/image (image optimization files)
     * 3. favicon.ico (favicon file)
     * 4. public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
