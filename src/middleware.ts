import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getPublicRoutes,
  getAdminRoutes,
  getAdminPatterns,
  getEditorPatterns,
  hasRequiredRole,
  isUserSuspended,
} from "@/lib/edge-auth";

// Routes that don't require authentication
const publicRoutes = getPublicRoutes();

// Routes that require admin role
const adminRoutes = getAdminRoutes();

// Path patterns that require admin role
const adminPatterns = getAdminPatterns();

// Path patterns that require editor or admin role
const editorPatterns = getEditorPatterns();

// Helper to check if the path starts with any of the patterns
const pathStartsWith = (path: string, patterns: string[]): boolean => {
  return patterns.some((pattern) => path.startsWith(pattern));
};

// Helper to check if path matches any regex pattern
const pathMatchesPattern = (path: string, patterns: RegExp[]): boolean => {
  return patterns.some((pattern) => pattern.test(path));
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes and static assets
  if (
    pathStartsWith(pathname, publicRoutes) ||
    pathname.includes("_next") ||
    pathname.includes("favicon.ico") ||
    pathname.match(/\.(jpg|jpeg|png|gif|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Get the token from the session
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // If no token and not on a public route, redirect to signin
  if (!token && !pathStartsWith(pathname, publicRoutes)) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check admin routes - verify user has admin role
  if (
    token &&
    (pathStartsWith(pathname, adminRoutes) ||
      pathMatchesPattern(pathname, adminPatterns))
  ) {
    const roles = (token.roles as string[]) || [];
    if (!hasRequiredRole(roles, ["admin"])) {
      // Redirect to unauthorized page
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // Check editor routes - verify user has editor or admin role
  if (token && pathMatchesPattern(pathname, editorPatterns)) {
    const roles = (token.roles as string[]) || [];
    if (!hasRequiredRole(roles, ["admin", "editor"])) {
      // Redirect to unauthorized page
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // Account suspension check
  if (token && isUserSuspended(token.status as string)) {
    // Allow access to signout
    if (pathname === "/auth/signout") {
      return NextResponse.next();
    }
    // Redirect suspended users to the suspension page
    return NextResponse.redirect(new URL("/account-suspended", request.url));
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
