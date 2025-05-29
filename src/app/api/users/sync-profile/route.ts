import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import { logger } from "@/lib/logging";

/**
 * POST /api/users/sync-profile
 *
 * Synchronizes a user's profile data between Firebase Auth and Firestore
 * - Updates avatar/photoURL from Google account
 * - Removes legacy MongoDB IDs
 * - Ensures consistency between Auth and Firestore
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Get current session
    const session = await verifyAuthMiddleware();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from Firebase Auth
    const authUser = await adminAuth.getUserByEmail(session.user.email);
    if (!authUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    logger.info({
      message: "Syncing user profile",
      requestId,
      userId: authUser.uid,
      email: authUser.email,
    });

    // Get Firestore document
    const userDoc = await adminDb.collection("users").doc(authUser.uid).get();
    const userData = userDoc.data();

    // Prepare update data
    const updateData = {
      email: authUser.email,
      name: authUser.displayName || authUser.email?.split("@")[0] || "User",
      photoURL: authUser.photoURL || null,
      image: authUser.photoURL || null, // Sync both photoURL and image fields
      updatedAt: new Date(),
    };

    // Remove any MongoDB related fields if they exist
    if (userData) {
      const cleanedData = { ...userData };
      delete cleanedData._id;
      delete cleanedData.mongoId;
      delete cleanedData.mongo_id;

      // Merge cleaned data with update
      Object.assign(updateData, cleanedData);
    }

    // Update or create Firestore document
    await adminDb
      .collection("users")
      .doc(authUser.uid)
      .set(updateData, { merge: true });

    logger.info({
      message: "Successfully synced user profile",
      requestId,
      userId: authUser.uid,
    });

    return NextResponse.json({
      success: true,
      user: {
        uid: authUser.uid,
        email: authUser.email,
        name: updateData.name,
        photoURL: updateData.photoURL,
        image: updateData.image,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error({
      message: "Error syncing user profile",
      requestId,
      error: errorMessage,
    });

    return NextResponse.json(
      { error: "Failed to sync user profile" },
      { status: 500 }
    );
  }
}
