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
  if (!userRoles || !Array.isArray(userRoles)) return false;
  return requiredRoles.some((role) => userRoles.includes(role));
}

/**
 * Edge-compatible function to verify if a user is suspended
 */
export function isUserSuspended(status?: string): boolean {
  return status === "suspended";
}

/**
 * Get public routes that don't require authentication
 */
export function getPublicRoutes(): string[] {
  return [
    "/",
    "/auth/signin",
    "/auth/error",
    "/auth/signout",
    "/api/auth/callback",
    "/api/auth/session",
    "/api/auth/csrf",
    "/api/auth/providers",
    "/api/auth/signin",
    "/api/auth/signout",
    "/unauthorized",
    "/404",
    "/500",
  ];
}

/**
 * Get admin routes and patterns
 */
export function getAdminRoutes(): string[] {
  return [
    "/admin",
    "/api/users",
    "/api/users/list",
    "/api/users/index",
    "/api/system",
  ];
}

export function getAdminPatterns(): RegExp[] {
  return [
    /^\/admin\/.+$/, // All routes under /admin/
    /^\/api\/users\/[^/]+$/, // Individual user routes
    /^\/api\/users\/[^/]+\/.*$/, // Nested user routes
    /^\/api\/system\/.+$/, // All system routes
  ];
}

/**
 * Get editor routes and patterns
 */
export function getEditorPatterns(): RegExp[] {
  return [
    /^\/editor\/.+$/, // All routes under /editor/
    /^\/api\/editor\/.+$/, // All editor API routes
  ];
}
