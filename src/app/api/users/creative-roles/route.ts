import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/auth";

// Endpoint to add a new creative role
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await auth();
    if (!session?.user || !session.user.roles.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get and validate request data
    const data = await request.json();
    if (!data.role || typeof data.role !== "string") {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }

    // Clean and format the role name (ensure snake_case)
    const roleName = data.role
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    if (!roleName) {
      return NextResponse.json({ error: "Invalid role name" }, { status: 400 });
    }

    // Save the role to the creative roles collection
    await adminDb
      .collection("config")
      .doc("creativeRoles")
      .set(
        {
          roles: FieldValue.arrayUnion(roleName),
          updatedAt: new Date(),
          updatedBy: session.user.id,
        },
        { merge: true }
      );

    return NextResponse.json({
      success: true,
      role: roleName,
      message: "Creative role added successfully",
    });
  } catch (error: any) {
    console.error("Error adding creative role:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add creative role" },
      { status: 500 }
    );
  }
}

// Endpoint to get all creative roles
export async function GET(request: NextRequest) {
  try {
    // Get creative roles from config collection
    const rolesDoc = await adminDb
      .collection("config")
      .doc("creativeRoles")
      .get();

    if (!rolesDoc.exists) {
      return NextResponse.json({ roles: [] });
    }

    const data = rolesDoc.data();
    return NextResponse.json({ roles: data?.roles || [] });
  } catch (error: any) {
    console.error("Error getting creative roles:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get creative roles" },
      { status: 500 }
    );
  }
}
