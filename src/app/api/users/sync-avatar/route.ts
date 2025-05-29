import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthMiddleware,
  getUserIdFromToken,
  verifyFirebaseToken,
  getUserEmailFromToken,
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
    // Check authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    // Get token data and extract user email
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userEmail = getUserEmailFromToken(tokenData);
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    let isAdmin = false;
    if (tokenData.tokenType === "firebase_auth") {
      // For Firebase tokens, check the roles array
      isAdmin = tokenData.roles?.includes("admin") || false;
    } else if (tokenData.tokenType === "api_token") {
      // For API tokens, fetch user data from Firestore to check roles
      try {
        const userDoc = await adminDb
          .collection("users")
          .doc(tokenData.userId)
          .get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          isAdmin = userData?.roles?.includes("admin") || false;
        }
      } catch (error) {
        logger.error({
          message: "Error fetching user roles",
          requestId,
          userId: tokenData.userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (!isAdmin) {
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
      adminEmail: userEmail,
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
