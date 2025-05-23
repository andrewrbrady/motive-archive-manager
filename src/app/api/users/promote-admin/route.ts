import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

/**
 * POST - Promote current user to admin
 * This is a special endpoint for initial setup or emergency access
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    console.log(`🔧 Promoting user ${userId} to admin...`);

    // Update Firebase Auth custom claims
    await adminAuth.setCustomUserClaims(userId, {
      roles: ["admin", "user"],
      creativeRoles: [],
      status: "active",
    });

    // Update Firestore document
    await adminDb
      .collection("users")
      .doc(userId)
      .update({
        roles: ["admin", "user"],
        updatedAt: new Date(),
      });

    console.log(`✅ Successfully promoted user ${userId} to admin`);

    return NextResponse.json({
      success: true,
      message: "User promoted to admin successfully",
      userId: userId,
    });
  } catch (error: any) {
    console.error("Error promoting user to admin:", error);
    return NextResponse.json(
      { error: "Failed to promote user to admin", details: error.message },
      { status: 500 }
    );
  }
}
