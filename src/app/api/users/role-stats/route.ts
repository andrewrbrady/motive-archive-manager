import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { withFirebaseAuth } from "@/lib/firebase-auth-middleware";

// Keep dynamic for auth requirements but add application-level caching
export const dynamic = "force-dynamic";

// Simple in-memory cache for role stats (resets on server restart)
let cachedRoleStats: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

async function getRoleStats(
  request: NextRequest
): Promise<NextResponse<object>> {
  try {
    // Authentication and authorization is handled by withFirebaseAuth wrapper

    // Check cache first
    const now = Date.now();
    if (cachedRoleStats && now - cacheTimestamp < CACHE_DURATION) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🚀 Role stats: Serving from cache");
      const response = NextResponse.json(cachedRoleStats);
      response.headers.set("X-Cache", "HIT");
      response.headers.set("Cache-Control", "private, max-age=1800"); // 30 minutes
      return response;
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🚀 Role stats: Cache miss, fetching fresh data");

    // Query Firestore to get all users
    const usersSnapshot = await adminDb.collection("users").get();
    const users = usersSnapshot.docs.map((doc) => doc.data());

    // Count users by role type
    const roleCounts = new Map<string, number>();
    const creativeRoleCounts = new Map<string, number>();

    // Process users and count roles
    users.forEach((user) => {
      // Count system roles
      if (user.roles && Array.isArray(user.roles)) {
        user.roles.forEach((role) => {
          const currentCount = roleCounts.get(role) || 0;
          roleCounts.set(role, currentCount + 1);
        });
      }

      // Count creative roles
      if (user.creativeRoles && Array.isArray(user.creativeRoles)) {
        user.creativeRoles.forEach((role) => {
          const currentCount = creativeRoleCounts.get(role) || 0;
          creativeRoleCounts.set(role, currentCount + 1);
        });
      }
    });

    // Format response
    const responseData = {
      roles: Array.from(roleCounts.entries()).map(([role, count]) => ({
        role,
        count,
      })),
      creativeRoles: Array.from(creativeRoleCounts.entries()).map(
        ([role, count]) => ({
          role,
          count,
        })
      ),
      lastUpdated: new Date().toISOString(),
    };

    // Cache the response
    cachedRoleStats = responseData;
    cacheTimestamp = Date.now();

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🚀 Role stats: Fresh data cached");

    const response = NextResponse.json(responseData);
    response.headers.set("X-Cache", "MISS");
    response.headers.set("Cache-Control", "private, max-age=1800"); // 30 minutes
    return response;
  } catch (error: any) {
    console.error("Error fetching role statistics:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch role statistics" },
      { status: 500 }
    );
  }
}

export const GET = withFirebaseAuth(getRoleStats, ["admin"]);
