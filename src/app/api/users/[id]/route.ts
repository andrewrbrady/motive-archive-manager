import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { User } from "@/models/User";
import { auth } from "@/auth";
import {
  getUserWithAuth,
  updateUserProfile,
  updateUserRoles,
} from "@/lib/firestore/users";
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
async function getUser(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Check admin access
    const session = await auth();
    console.log("Session for getUser:", session?.user);

    if (!session?.user?.roles?.includes("admin")) {
      console.log("Unauthorized access attempt:", session?.user);
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    const userId = context.params.id;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await getUserWithAuth(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch user" },
      { status: 500 }
    );
  }
}

/**
 * UPDATE user by ID
 * Requires admin role
 */
async function updateUser(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Check admin access
    const session = await auth();
    console.log("Session for updateUser:", session?.user);

    if (!session?.user?.roles?.includes("admin")) {
      console.log("Unauthorized access attempt:", session?.user);
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    const userId = context.params.id;
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

      // Update user roles and permissions
      const updatedUser = await updateUserRoles(
        userId,
        roles,
        creativeRoles || [],
        status || "active"
      );

      if (!updatedUser) {
        return NextResponse.json(
          { error: "Failed to update user roles" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "User roles updated successfully",
        user: updatedUser,
      });
    } else {
      // Handle profile update
      const {
        name,
        email,
        roles,
        creativeRoles,
        status,
        accountType,
        photoURL,
        bio,
      } = data;

      // Basic validation
      if (!name && !email && !roles && !status) {
        return NextResponse.json(
          { error: "No valid fields provided for update" },
          { status: 400 }
        );
      }

      // Create update object with only the fields that are provided
      const updateData: Record<string, any> = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (roles) updateData.roles = roles;
      if (creativeRoles) updateData.creativeRoles = creativeRoles;
      if (status) updateData.status = status;
      if (accountType) updateData.accountType = accountType;
      if (photoURL !== undefined) updateData.photoURL = photoURL;
      if (bio !== undefined) updateData.bio = bio;
      updateData.updatedAt = new Date();

      try {
        // Update in Firestore
        await adminDb.collection("users").doc(userId).update(updateData);

        // Update Firebase Auth claims if roles or status changed
        if (roles || creativeRoles || status) {
          try {
            const userDoc = await adminDb.collection("users").doc(userId).get();
            const userData = userDoc.data() || {};

            await adminAuth.setCustomUserClaims(userId, {
              roles: roles || userData.roles || ["user"],
              creativeRoles: creativeRoles || userData.creativeRoles || [],
              status: status || userData.status || "active",
            });
            console.log("Updated Firebase Auth claims for user:", userId);
          } catch (claimsError) {
            console.error("Error updating Firebase Auth claims:", claimsError);
          }
        }

        // Get the updated user
        const updatedUser = await getUserWithAuth(userId);

        return NextResponse.json({
          message: "User updated successfully",
          user: updatedUser,
        });
      } catch (error) {
        console.error("Error updating user in Firestore:", error);
        return NextResponse.json(
          { error: "Failed to update user" },
          { status: 500 }
        );
      }
    }
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

/**
 * DELETE user by ID
 * Requires admin role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin access
    const session = await auth();
    console.log("Session for deleteUser:", session?.user);

    if (!session?.user?.roles?.includes("admin")) {
      console.log("Unauthorized access attempt:", session?.user);
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    const userId = params.id;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // First check if user exists in Firestore
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete from Firestore
    await adminDb.collection("users").doc(userId).delete();
    console.log("Deleted user from Firestore:", userId);

    // Try to delete from Firebase Auth (might fail if it's an OAuth user)
    try {
      await adminAuth.deleteUser(userId);
      console.log("Deleted user from Firebase Auth:", userId);
    } catch (authError) {
      console.error("Error deleting from Firebase Auth:", authError);
      // Continue with the process even if Firebase Auth deletion fails
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}

// Export the handler functions directly
export { getUser as GET, updateUser as PUT };
