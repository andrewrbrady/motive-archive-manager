import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";
import { logger } from "@/lib/logging";

/**
 * POST /api/users/sync-all-avatars
 *
 * Synchronizes all users' avatars from Firebase Auth to Firestore
 * Admin only endpoint to bulk update profile photos from Google OAuth
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

    logger.info({
      message: "Starting bulk avatar sync",
      requestId,
      adminEmail: session.user.email,
    });

    // Get all users from Firestore
    const usersSnapshot = await adminDb.collection("users").get();
    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    let updated = 0;
    let errors = 0;
    const updatePromises = [];

    // Process each user
    for (const user of users) {
      const updatePromise = (async () => {
        try {
          // Get user from Firebase Auth to get latest photoURL
          const authUser = await adminAuth.getUser(user.id);

          // Only update if the Firebase Auth user has a photoURL
          if (authUser.photoURL) {
            const updateData = {
              photoURL: authUser.photoURL,
              image: authUser.photoURL, // Sync both fields for compatibility
              updatedAt: new Date(),
            };

            await adminDb.collection("users").doc(user.id).update(updateData);

            updated++;

            logger.info({
              message: "Updated user avatar",
              requestId,
              userId: user.id,
              photoURL: authUser.photoURL,
            });
          }
        } catch (error) {
          errors++;
          logger.error({
            message: "Error updating user avatar",
            requestId,
            userId: user.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })();

      updatePromises.push(updatePromise);
    }

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    logger.info({
      message: "Completed bulk avatar sync",
      requestId,
      totalUsers: users.length,
      updated,
      errors,
    });

    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      updated,
      errors,
      message: `Successfully synced ${updated} user avatars${errors > 0 ? ` (${errors} errors)` : ""}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error({
      message: "Error in bulk avatar sync",
      requestId,
      error: errorMessage,
    });

    return NextResponse.json(
      { error: "Failed to sync avatars" },
      { status: 500 }
    );
  }
}
