import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { adminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await auth();

    // If there's no session or user, return early
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "No active session found",
        },
        { status: 401 }
      );
    }

    // User is authenticated
    const userId = session.user.id;
    console.log(`Attempting to sync session for user: ${userId}`);

    try {
      // Get Firebase Auth user data
      const firebaseUser = await adminAuth.getUser(userId);

      // Get custom claims
      const claims = firebaseUser.customClaims || {};
      console.log("Firebase Auth custom claims:", claims);

      // Return the updated claims
      return NextResponse.json({
        authenticated: true,
        userId,
        email: session.user.email,
        roles: claims.roles || [],
        creativeRoles: claims.creativeRoles || [],
        status: claims.status || "active",
        message: "Session synced successfully with Firebase Auth claims",
      });
    } catch (error) {
      console.error("Error fetching Firebase Auth user:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch user data from Firebase Auth",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error syncing session:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to sync session",
      },
      { status: 500 }
    );
  }
}
