import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";

/**
 * GET user roles
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and authorization
    const session = await auth();
    if (!session || !session.user || !session.user.roles.includes("admin")) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Get user from Firebase
    const user = await adminAuth.getUser(params.id);

    // Get user data from Firestore
    const userDoc = await adminDb.collection("users").doc(params.id).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    // Combine custom claims with user data
    return NextResponse.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      disabled: user.disabled,
      roles: user.customClaims?.roles || userData?.roles || ["user"],
      creativeRoles:
        user.customClaims?.creativeRoles || userData?.creativeRoles || [],
      status: user.customClaims?.status || userData?.status || "active",
    });
  } catch (error: any) {
    console.error("Error fetching user roles:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch user roles" },
      { status: 500 }
    );
  }
}

/**
 * UPDATE user roles
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get request data
    const data = await request.json();
    const { roles, creativeRoles, status } = data;

    // Validate request data
    if (!roles || !Array.isArray(roles)) {
      return NextResponse.json(
        { error: "Roles must be provided as an array" },
        { status: 400 }
      );
    }

    // Valid role options
    const validRoles = ["user", "admin", "editor"];
    if (!roles.every((role) => validRoles.includes(role))) {
      return NextResponse.json(
        { error: `Roles must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Valid status options
    const validStatus = ["active", "inactive", "suspended"];
    if (status && !validStatus.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatus.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if this is a new user registration (only "user" role, no admin)
    const isNewUserRegistration =
      roles.length === 1 && roles[0] === "user" && !roles.includes("admin");

    // For admin operations, verify admin authentication
    if (!isNewUserRegistration) {
      // Check authentication and authorization
      console.log("Attempting admin operation - checking authorization");
      const session = await auth();

      // Check if user is authenticated and has admin role
      if (!session || !session.user || !session.user.roles.includes("admin")) {
        console.log("Unauthorized access attempt:", session?.user?.email);
        return NextResponse.json(
          { error: "Unauthorized access" },
          { status: 403 }
        );
      }

      // Prevent users from modifying their own roles
      if (session.user.id === params.id) {
        console.log(
          "User attempting to modify their own roles:",
          session.user.id
        );
        return NextResponse.json(
          {
            error:
              "For security reasons, you cannot modify your own roles. Please ask another administrator to make any necessary changes.",
          },
          { status: 403 }
        );
      }
    } else {
      console.log("Processing new user registration for user ID:", params.id);
    }

    // Set custom claims (Firebase Auth)
    console.log("Setting custom claims for user:", params.id, roles);
    await adminAuth.setCustomUserClaims(params.id, {
      roles,
      creativeRoles: creativeRoles || [],
      status: status || "active",
    });
    console.log("Custom claims set successfully for user:", params.id);

    // Update user data in Firestore
    console.log("Updating Firestore document for user:", params.id);
    await adminDb
      .collection("users")
      .doc(params.id)
      .set(
        {
          roles,
          creativeRoles: creativeRoles || [],
          status: status || "active",
          updatedAt: new Date(),
        },
        { merge: true }
      );
    console.log("Firestore document updated successfully for user:", params.id);

    // Get updated user data
    const user = await adminAuth.getUser(params.id);
    console.log("Retrieved updated user data:", user.uid, user.customClaims);

    return NextResponse.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      roles: user.customClaims?.roles || roles,
      creativeRoles: user.customClaims?.creativeRoles || creativeRoles || [],
      status: user.customClaims?.status || status || "active",
      message: "User roles updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating user roles:", error.message, error.stack);
    return NextResponse.json(
      { error: error.message || "Failed to update user roles" },
      { status: 500 }
    );
  }
}
