import { NextRequest, NextResponse } from "next/server";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import { getUsers } from "@/lib/users/cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/editors
 *
 * Fetches active users for deliverable assignment
 * Accessible to all authenticated users (not just admins)
 */
export async function GET(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 GET /api/users/editors: Starting request");

  // Check authentication (any authenticated user can access this)
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ GET /api/users/editors: Authentication failed");
    return authResult;
  }

  try {
    console.log(
      "🔒 GET /api/users/editors: Authentication successful, fetching users"
    );

    // Use cached users function
    const allUsers = await getUsers();

    // Filter to only active users (anyone can be assigned to deliverables)
    const editors = allUsers.filter((user) => user.status === "active");

    // Transform to match the expected interface
    const transformedUsers = editors.map((user) => ({
      uid: user.uid,
      name: user.name,
      email: user.email,
      creativeRoles: user.creativeRoles || [],
      status: user.status,
      photoURL: user.photoURL,
    }));

    console.log("✅ GET /api/users/editors: Successfully fetched editors", {
      count: transformedUsers.length,
    });

    return NextResponse.json(transformedUsers);
  } catch (error: any) {
    console.error("💥 GET /api/users/editors: Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
