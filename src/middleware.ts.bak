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

  // Skip middleware for static assets and API auth routes
  if (
    pathname.includes("_next") ||
    pathname.includes("favicon.ico") ||
    pathname.match(/\.(jpg|jpeg|png|gif|svg|css|js)$/) ||
    pathname.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  try {
    // Get the token from the session
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Check if the current path is a public route
    const isPublicRoute = pathStartsWith(pathname, publicRoutes);

    // If not a public route and no token, redirect to signin
    if (!isPublicRoute && !token) {
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", encodeURIComponent(pathname));
      signInUrl.searchParams.set("error", "SessionRequired");
      return NextResponse.redirect(signInUrl);
    }

    // If public route, allow access
    if (isPublicRoute) {
      return NextResponse.next();
    }

    // At this point, we know it's not a public route and we have a token
    // Ensure the token has been properly initialized with roles
    if (!token || !token.roles || !Array.isArray(token.roles)) {
      console.error("Token missing or invalid roles:", token);
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", encodeURIComponent(pathname));
      signInUrl.searchParams.set("error", "InvalidToken");
      return NextResponse.redirect(signInUrl);
    }

    // Check if user account is active
    if (token.status !== "active") {
      return NextResponse.redirect(
        new URL("/unauthorized?reason=inactive", request.url)
      );
    }

    // Check admin routes - verify user has admin role
    if (
      pathStartsWith(pathname, adminRoutes) ||
      pathMatchesPattern(pathname, adminPatterns)
    ) {
      if (!hasRequiredRole(token.roles as string[], ["admin"])) {
        return NextResponse.redirect(
          new URL("/unauthorized?reason=adminRequired", request.url)
        );
      }
    }

    // Check editor routes - verify user has editor or admin role
    if (pathMatchesPattern(pathname, editorPatterns)) {
      if (!hasRequiredRole(token.roles as string[], ["admin", "editor"])) {
        return NextResponse.redirect(
          new URL("/unauthorized?reason=editorRequired", request.url)
        );
      }
    }

    // All checks passed, proceed with the request
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    // On error, redirect to error page with details
    const errorUrl = new URL("/auth/error", request.url);
    errorUrl.searchParams.set("error", "ServerError");
    return NextResponse.redirect(errorUrl);
  }
}

export const config = {
  matcher: [
    // Match all paths except static files and API auth routes
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
