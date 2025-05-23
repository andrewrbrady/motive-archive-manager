import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { userId, makeAdmin } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    console.log(
      `Attempting to ${
        makeAdmin ? "add" : "remove"
      } admin role for user: ${userId}`
    );

    // Get current user data
    const userDoc = await adminDb.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User not found in Firestore" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    // [REMOVED] // [REMOVED] console.log("Current user data:", userData);

    // Get current roles
    const currentRoles = userData?.roles || [];

    // Update roles
    let updatedRoles = [...currentRoles];

    if (makeAdmin && !updatedRoles.includes("admin")) {
      updatedRoles.push("admin");
    } else if (!makeAdmin && updatedRoles.includes("admin")) {
      updatedRoles = updatedRoles.filter((role) => role !== "admin");
    }

    // Don't update if no change
    if (JSON.stringify(currentRoles) === JSON.stringify(updatedRoles)) {
      return NextResponse.json({
        message: "No change needed",
        roles: updatedRoles,
      });
    }

    // [REMOVED] // [REMOVED] console.log("Updating roles from", currentRoles, "to", updatedRoles);

    // Update Firestore
    await adminDb.collection("users").doc(userId).update({
      roles: updatedRoles,
      updatedAt: new Date(),
    });

    // Update Firebase Auth claims
    await adminAuth.setCustomUserClaims(userId, {
      roles: updatedRoles,
      creativeRoles: userData?.creativeRoles || [],
      status: userData?.status || "active",
    });

    // [REMOVED] // [REMOVED] console.log("Successfully updated user roles for", userId);

    return NextResponse.json({
      message: "User roles updated successfully",
      roles: updatedRoles,
    });
  } catch (error: any) {
    console.error("Error updating admin role:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update admin role" },
      { status: 500 }
    );
  }
}
