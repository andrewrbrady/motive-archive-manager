import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { adminAuth } from "@/lib/firebase-admin";

/**
 * API route to get the authenticated user's Firebase ID token
 * This token can be used to authenticate API requests to Firebase-protected endpoints
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user from NextAuth session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // For security, verify this user exists in Firebase Auth
    try {
      const firebaseUser = await adminAuth.getUser(session.user.id);

      // Create a custom token for this user
      const customToken = await adminAuth.createCustomToken(firebaseUser.uid, {
        roles: session.user.roles || [],
      });

      return NextResponse.json({
        token: customToken,
        expiresIn: 3600, // Expires in 1 hour
      });
    } catch (error) {
      console.error("Error getting Firebase user:", error);
      return NextResponse.json(
        { error: "User not found in Firebase" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error generating token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
