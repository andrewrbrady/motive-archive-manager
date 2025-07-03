import { NextRequest, NextResponse } from "next/server";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Endpoint to add a new creative role
export async function POST(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 POST /api/users/creative-roles: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ POST /api/users/creative-roles: Authentication failed");
    return authResult;
  }

  try {
    const { role } = await request.json();

    if (!role || typeof role !== "string") {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }

    // Add the role to the config collection
    await adminDb
      .collection("config")
      .doc("creativeRoles")
      .update({
        roles: FieldValue.arrayUnion(role),
      });

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ POST /api/users/creative-roles: Successfully added role");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(
      "💥 POST /api/users/creative-roles: Error adding creative role:",
      error
    );
    return NextResponse.json(
      { error: error.message || "Failed to add creative role" },
      { status: 500 }
    );
  }
}

// Endpoint to remove a creative role
export async function DELETE(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 DELETE /api/users/creative-roles: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ DELETE /api/users/creative-roles: Authentication failed");
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    if (!role) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }

    // Remove the role from the config collection
    await adminDb
      .collection("config")
      .doc("creativeRoles")
      .update({
        roles: FieldValue.arrayRemove(role),
      });

    console.log(
      "✅ DELETE /api/users/creative-roles: Successfully removed role"
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(
      "💥 DELETE /api/users/creative-roles: Error removing creative role:",
      error
    );
    return NextResponse.json(
      { error: error.message || "Failed to remove creative role" },
      { status: 500 }
    );
  }
}

// GET - Fetch all creative roles
export async function GET(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 GET /api/users/creative-roles: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ GET /api/users/creative-roles: Authentication failed");
    return authResult;
  }

  try {
    console.log(
      "🔒 GET /api/users/creative-roles: Authentication successful, fetching roles"
    );

    // Get all unique creative roles from users
    const usersSnapshot = await adminDb.collection("users").get();
    const allCreativeRoles = new Set<string>();

    usersSnapshot.docs.forEach((doc) => {
      const userData = doc.data();
      if (userData.creativeRoles && Array.isArray(userData.creativeRoles)) {
        userData.creativeRoles.forEach((role: string) =>
          allCreativeRoles.add(role)
        );
      }
    });

    const creativeRoles = Array.from(allCreativeRoles).sort();

    console.log(
      "✅ GET /api/users/creative-roles: Successfully fetched roles",
      {
        count: creativeRoles.length,
      }
    );
    return NextResponse.json({ creativeRoles });
  } catch (error) {
    console.error(
      "💥 GET /api/users/creative-roles: Error fetching creative roles:",
      error
    );
    return NextResponse.json(
      { error: "Failed to fetch creative roles" },
      { status: 500 }
    );
  }
}
