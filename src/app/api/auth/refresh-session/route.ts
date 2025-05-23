export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await auth();

    // If there's no session or user, return early
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "No active session found",
        },
        { status: 401 }
      );
    }

    // User is authenticated
    const userId = session.user.id;
    // [REMOVED] // [REMOVED] console.log(`Refreshing session for user: ${userId}`);

    try {
      // First try to find the user in Firestore
      const firestoreDoc = await adminDb.collection("users").doc(userId).get();

      if (firestoreDoc.exists) {
        const userData = firestoreDoc.data() || {};
        // [REMOVED] // [REMOVED] console.log("Found Firestore user data:", userData);

        // Create refreshed session with Firestore data
        const refreshedSession = {
          ...session,
          user: {
            ...session.user,
            roles: userData.roles || ["user"],
            creativeRoles: userData.creativeRoles || [],
            status: userData.status || "active",
          },
        };

        return NextResponse.json({
          success: true,
          user: refreshedSession.user,
          source: "firestore",
          message: "Session refreshed from Firestore data",
        });
      }

      // If not found in Firestore, try Firebase Auth as fallback
      // [REMOVED] // [REMOVED] console.log("User not found in Firestore, trying Firebase Auth");

      try {
        const firebaseUser = await adminAuth.getUser(userId);
        const claims = firebaseUser.customClaims || {};

        // [REMOVED] // [REMOVED] console.log("Firebase Auth custom claims:", claims);

        // Create refreshed session with Firebase Auth claims
        const refreshedSession = {
          ...session,
          user: {
            ...session.user,
            roles: claims.roles || ["user"],
            creativeRoles: claims.creativeRoles || [],
            status: claims.status || "active",
          },
        };

        return NextResponse.json({
          success: true,
          user: refreshedSession.user,
          source: "firebase_auth",
          message: "Session refreshed from Firebase Auth claims",
        });
      } catch (firebaseError) {
        console.error("User not found in Firebase Auth:", firebaseError);

        // Return the current session data since we can't refresh it
        return NextResponse.json({
          success: true,
          user: session.user,
          source: "session_only",
          message:
            "User not found in Firebase systems, using current session data",
        });
      }
    } catch (error) {
      console.error("Error refreshing session data:", error);

      // Return the current session as fallback
      return NextResponse.json({
        success: true,
        user: session.user,
        source: "session_fallback",
        message: "Error fetching user data, using current session data",
      });
    }
  } catch (error: any) {
    console.error("Error refreshing session:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to refresh session",
      },
      { status: 500 }
    );
  }
}
