import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";

/**
 * GET user roles
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2];

    // Check authentication and authorization
    const session = await auth();
    if (!session || !session.user || !session.user.roles.includes("admin")) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Get user from Firebase
    const user = await adminAuth.getUser(id);

    // Get user data from Firestore
    const userDoc = await adminDb.collection("users").doc(id).get();
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
export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2];

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
      // [REMOVED] // [REMOVED] console.log("Attempting admin operation - checking authorization");
      const session = await auth();

      // Check if user is authenticated and has admin role
      if (!session || !session.user || !session.user.roles.includes("admin")) {
        // [REMOVED] // [REMOVED] console.log("Unauthorized access attempt:", session?.user?.email);
        return NextResponse.json(
          { error: "Unauthorized access" },
          { status: 403 }
        );
      }
    }

    // Update user custom claims in Firebase Auth
    await adminAuth.setCustomUserClaims(id, {
      roles,
      creativeRoles: creativeRoles || [],
      status: status || "active",
    });

    // Update user data in Firestore
    await adminDb
      .collection("users")
      .doc(id)
      .set(
        {
          roles,
          creativeRoles: creativeRoles || [],
          status: status || "active",
          updatedAt: new Date(),
        },
        { merge: true }
      );

    // Get updated user data
    const user = await adminAuth.getUser(id);
    const userDoc = await adminDb.collection("users").doc(id).get();
    const userData = userDoc.exists ? userDoc.data() : null;

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
    console.error("Error updating user roles:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user roles" },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
