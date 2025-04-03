// This file contains edge-compatible authentication utilities
// It avoids using firebase-admin which is not compatible with Edge Runtime

/**
 * Edge-compatible function to verify if a user has the required role
 * This is used in the middleware for route protection
 */
export function hasRequiredRole(
  userRoles: string[] | undefined,
  requiredRoles: string[]
): boolean {
  if (!userRoles || userRoles.length === 0) {
    return false;
  }

  return requiredRoles.some((role) => userRoles.includes(role));
}

/**
 * Edge-compatible function to verify if a user is suspended
 */
export function isUserSuspended(userStatus: string | undefined): boolean {
  return userStatus === "suspended";
}

/**
 * Get public routes that don't require authentication
 */
export function getPublicRoutes(): string[] {
  return [
    "/auth/signin",
    "/auth/signup",
    "/auth/error",
    "/auth/signout",
    "/auth/reset-password",
    "/auth/forgot-password",
    "/api/auth",
    "/auth",
    "/",
  ];
}

/**
 * Get admin routes and patterns
 */
export function getAdminRoutes(): string[] {
  return ["/admin", "/api/users"];
}

export function getAdminPatterns(): RegExp[] {
  return [
    /^\/admin\/.+$/, // All routes under /admin/
  ];
}

/**
 * Get editor routes and patterns
 */
export function getEditorPatterns(): RegExp[] {
  return [
    /^\/edit\/.+$/, // All routes under /edit/
    /^\/cars\/\d+\/edit$/, // Car edit pages
  ];
}
