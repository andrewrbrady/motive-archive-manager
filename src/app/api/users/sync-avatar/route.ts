import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthMiddleware,
  getUserIdFromToken,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logging";

/**
 * POST /api/users/sync-avatar
 *
 * Synchronizes a specific user's avatar from Firebase Auth to Firestore
 * Admin only endpoint to update user profile photos from Google OAuth
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Get current session and check admin permissions
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    if (!session.user.roles?.includes("admin")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    logger.info({
      message: "Syncing user avatar",
      requestId,
      userId,
      adminEmail: session.user.email,
    });

    // Get user from Firebase Auth
    const authUser = await adminAuth.getUser(userId);
    if (!authUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get current Firestore document
    const userDoc = await adminDb.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User document not found in Firestore" },
        { status: 404 }
      );
    }

    const currentData = userDoc.data()!;

    // Update avatar fields with latest from Firebase Auth
    const updateData = {
      ...currentData,
      photoURL: authUser.photoURL || null,
      image: authUser.photoURL || null, // Sync both fields for compatibility
      updatedAt: new Date(),
    };

    // Update Firestore document
    await adminDb
      .collection("users")
      .doc(userId)
      .set(updateData, { merge: true });

    logger.info({
      message: "Successfully synced user avatar",
      requestId,
      userId,
      photoURL: authUser.photoURL,
    });

    return NextResponse.json({
      success: true,
      userId,
      photoURL: authUser.photoURL,
      name: authUser.displayName || currentData.name,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error({
      message: "Error syncing user avatar",
      requestId,
      error: errorMessage,
    });

    return NextResponse.json(
      { error: "Failed to sync user avatar" },
      { status: 500 }
    );
  }
}
