import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { withFirebaseAuth } from "@/lib/firebase-auth-middleware";

// Make this route dynamic since it uses auth() which requires headers
export const dynamic = "force-dynamic";

async function getRoleStats(
  request: NextRequest
): Promise<NextResponse<object>> {
  try {
    // Authentication and authorization is handled by withFirebaseAuth wrapper

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
    const response = {
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
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error fetching role statistics:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch role statistics" },
      { status: 500 }
    );
  }
}

export const GET = withFirebaseAuth(getRoleStats, ["admin"]);
