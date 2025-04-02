import { NextRequest, NextResponse } from "next/server";
import {
  withFirebaseAuth,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

// Define the response type
interface UserProfileResponse {
  uid: string;
  email: string | undefined;
  emailVerified: boolean;
  displayName: any;
  photoURL: any;
  roles: any;
  creativeRoles: any;
  status: any;
  createdAt: any;
  updatedAt: any;
  lastSignInTime: string | null;
}

/**
 * Get the current user's profile
 * Protected route that requires authentication
 */
async function getUserProfile(
  request: NextRequest
): Promise<NextResponse<UserProfileResponse>> {
  try {
    // Get the token from the authorization header
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      throw new Error("Invalid token");
    }

    let userId: string;

    // Handle different token types
    if (tokenData.tokenType === "api_token") {
      userId = tokenData.userId;
    } else {
      userId = tokenData.uid;
    }

    // Get user data from Firestore
    const userDoc = await adminDb.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    // Get user from Firebase Auth for additional info
    const authUser = await adminAuth.getUser(userId);

    // Combine data from Firestore and Auth
    const userData = userDoc.data() || {};
    const userProfile: UserProfileResponse = {
      uid: userId,
      email: authUser.email,
      emailVerified: authUser.emailVerified,
      displayName: authUser.displayName || userData.name,
      photoURL: authUser.photoURL || userData.photoURL,
      roles: userData.roles || [],
      creativeRoles: userData.creativeRoles || [],
      status: userData.status || "active",
      createdAt: userData.createdAt?.toDate() || null,
      updatedAt: userData.updatedAt?.toDate() || null,
      lastSignInTime: authUser.metadata.lastSignInTime || null,
    };

    return NextResponse.json(userProfile);
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    throw new Error(error.message || "Internal server error");
  }
}

export const GET = withFirebaseAuth(getUserProfile);
