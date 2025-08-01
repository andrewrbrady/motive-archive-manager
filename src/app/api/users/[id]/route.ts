import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import { getUserWithAuth, updateUserRoles } from "@/lib/firestore/users";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

interface IUser {
  name: string;
  email: string;
  roles: string[];
  status: string;
  creativeRoles: string[];
  created_at: Date;
  updated_at: Date;
  active: boolean;
  permissions: string[];
  last_login?: Date;
  profile?: {
    avatar_url?: string;
    title?: string;
    bio?: string;
    specialties?: string[];
    portfolio_url?: string;
  };
}

/**
 * GET user by ID
 * Requires admin role
 */
export async function GET(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 GET /api/users/[id]: Starting request");

  try {
    // Check authentication and admin role
    const authResult = await verifyAuthMiddleware(request, ["admin"]);
    if (authResult) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ GET /api/users/[id]: Authentication failed");
      return authResult;
    }

    // Extract user ID from URL
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const userId = segments[segments.length - 1];

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 GET /api/users/[id]: Fetching user data", { userId });
    const user = await getUserWithAuth(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ GET /api/users/[id]: Successfully fetched user");
    return NextResponse.json(user);
  } catch (error) {
    console.error("💥 GET /api/users/[id]: Error fetching user:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch user",
      },
      { status: 500 }
    );
  }
}

/**
 * UPDATE user by ID
 * Requires admin role
 */
export async function PUT(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 PUT /api/users/[id]: Starting request");

  try {
    // Check authentication and admin role
    const authResult = await verifyAuthMiddleware(request, ["admin"]);
    if (authResult) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ PUT /api/users/[id]: Authentication failed");
      return authResult;
    }

    // Extract user ID from URL
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const userId = segments[segments.length - 1];

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const data = await request.json();

    // Check what kind of update we're performing
    if (data.updateType === "roles") {
      // Handle role update
      const { roles, creativeRoles, status } = data;

      if (!roles || !Array.isArray(roles)) {
        return NextResponse.json(
          { error: "Roles must be provided as an array" },
          { status: 400 }
        );
      }

      // Validate roles
      const validRoles = ["user", "admin", "editor", "viewer"];
      if (!roles.every((role) => validRoles.includes(role))) {
        return NextResponse.json(
          { error: `Roles must be one of: ${validRoles.join(", ")}` },
          { status: 400 }
        );
      }

      // Validate status if provided
      if (status) {
        const validStatuses = ["active", "inactive", "suspended"];
        if (!validStatuses.includes(status)) {
          return NextResponse.json(
            { error: `Status must be one of: ${validStatuses.join(", ")}` },
            { status: 400 }
          );
        }
      }

      console.log("🔒 PUT /api/users/[id]: Updating user roles", {
        userId,
        roles,
      });

      // Update Firebase Auth custom claims
      await adminAuth.setCustomUserClaims(userId, {
        roles,
        creativeRoles: creativeRoles || [],
        status: status || "active",
      });

      // Update user data in Firestore
      await adminDb
        .collection("users")
        .doc(userId)
        .update({
          roles,
          creativeRoles: creativeRoles || [],
          status: status || "active",
          updatedAt: new Date(),
        });

      // Get the updated user data
      const updatedUser = await getUserWithAuth(userId);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ PUT /api/users/[id]: Successfully updated user roles");
      return NextResponse.json({ user: updatedUser });
    } else if (data.updateType === "profile") {
      // Handle profile update
      const { profile } = data;
      if (!profile) {
        return NextResponse.json(
          { error: "Profile data is required" },
          { status: 400 }
        );
      }

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 PUT /api/users/[id]: Updating user profile", { userId });

      // Update user profile in Firestore
      await adminDb.collection("users").doc(userId).update({
        profile,
        updatedAt: new Date(),
      });

      // Get the updated user
      const updatedUser = await getUserWithAuth(userId);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ PUT /api/users/[id]: Successfully updated user profile");
      return NextResponse.json(updatedUser);
    }

    return NextResponse.json({ error: "Invalid update type" }, { status: 400 });
  } catch (error) {
    console.error("💥 PUT /api/users/[id]: Error updating user:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update user",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE user by ID
 * Requires admin role
 */
export async function DELETE(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 DELETE /api/users/[id]: Starting request");

  try {
    // Check authentication and admin role
    const authResult = await verifyAuthMiddleware(request, ["admin"]);
    if (authResult) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ DELETE /api/users/[id]: Authentication failed");
      return authResult;
    }

    // Extract user ID from URL
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const userId = segments[segments.length - 1];

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 DELETE /api/users/[id]: Deleting user", { userId });

    // Delete user from Firebase Auth
    await adminAuth.deleteUser(userId);

    // Delete user document from Firestore
    await adminDb.collection("users").doc(userId).delete();

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ DELETE /api/users/[id]: Successfully deleted user");
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("💥 DELETE /api/users/[id]: Error deleting user:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete user",
      },
      { status: 500 }
    );
  }
}

/**
 * Handle OPTIONS requests
 */
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
