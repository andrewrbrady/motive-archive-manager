import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";

/**
 * GET user roles
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔒 GET /api/users/[id]/roles: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    console.log("❌ GET /api/users/[id]/roles: Authentication failed");
    return authResult;
  }

  try {
    const { id } = await params;

    // Get user from Firebase
    const user = await adminAuth.getUser(id);

    // Get user data from Firestore
    const userDoc = await adminDb.collection("users").doc(id).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    // Combine custom claims with user data
    const result = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      disabled: user.disabled,
      roles: user.customClaims?.roles || userData?.roles || ["user"],
      creativeRoles:
        user.customClaims?.creativeRoles || userData?.creativeRoles || [],
      status: user.customClaims?.status || userData?.status || "active",
    };

    console.log(
      "✅ GET /api/users/[id]/roles: Successfully fetched user roles"
    );
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(
      "💥 GET /api/users/[id]/roles: Error fetching user roles:",
      error
    );
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
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔒 PUT /api/users/[id]/roles: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    console.log("❌ PUT /api/users/[id]/roles: Authentication failed");
    return authResult;
  }

  try {
    const { id } = await params;
    const { roles, creativeRoles, status } = await request.json();

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

    console.log("🔒 PUT /api/users/[id]/roles: Updating user roles", {
      id,
      roles,
    });

    // Update Firebase Auth custom claims
    await adminAuth.setCustomUserClaims(id, {
      roles,
      creativeRoles: creativeRoles || [],
      status: status || "active",
    });

    // Update user data in Firestore
    await adminDb
      .collection("users")
      .doc(id)
      .update({
        roles,
        creativeRoles: creativeRoles || [],
        status: status || "active",
        updatedAt: new Date(),
      });

    console.log(
      "✅ PUT /api/users/[id]/roles: Successfully updated user roles"
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "💥 PUT /api/users/[id]/roles: Error updating user roles:",
      error
    );
    return NextResponse.json(
      { error: "Failed to update user roles" },
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
