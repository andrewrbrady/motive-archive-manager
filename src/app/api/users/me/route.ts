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
): Promise<NextResponse<UserProfileResponse | { error: string }>> {
  try {
    // Get the token from the authorization header
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];

    console.log("getUserProfile: Starting token verification");
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      console.error("getUserProfile: Token verification failed");
      throw new Error("Invalid token");
    }

    console.log(
      "getUserProfile: Token verified successfully, type:",
      tokenData.tokenType
    );

    let firebaseAuthUid: string;

    // Handle different token types
    if (tokenData.tokenType === "api_token") {
      firebaseAuthUid = tokenData.userId;
    } else {
      firebaseAuthUid = tokenData.uid;
    }

    console.log(
      "getUserProfile: Getting Firebase Auth user for UID:",
      firebaseAuthUid.substring(0, 8) + "***"
    );

    // Get user from Firebase Auth for additional info
    const authUser = await adminAuth.getUser(firebaseAuthUid);
    console.log("getUserProfile: Firebase Auth user found");

    // First try to get user data from Firestore by Firebase Auth UID
    let userDoc = await adminDb.collection("users").doc(firebaseAuthUid).get();
    let userData = userDoc.exists ? userDoc.data() : null;
    let canonicalUserId = firebaseAuthUid;

    console.log("getUserProfile: Firestore document exists:", userDoc.exists);

    // If not found by Firebase Auth UID, search by email to find existing document
    if (!userData && authUser.email) {
      console.log(
        `getUserProfile: User not found by Firebase Auth UID ${firebaseAuthUid}, searching by email ${authUser.email}`
      );
      const emailQuery = await adminDb
        .collection("users")
        .where("email", "==", authUser.email)
        .limit(1)
        .get();

      if (!emailQuery.empty) {
        const emailDoc = emailQuery.docs[0];
        userData = emailDoc.data();
        canonicalUserId = emailDoc.id; // Use the existing Firestore document ID
        console.log(
          `getUserProfile: Found existing user document with ID: ${canonicalUserId}`
        );

        // Update the existing document to include Firebase Auth UID for future reference
        await emailDoc.ref.update({
          firebaseAuthUid: firebaseAuthUid,
          updatedAt: new Date(),
        });
      }
    }

    // If still no user data, create a new user document using Firebase Auth UID
    if (!userData) {
      console.log(
        `getUserProfile: Creating new user document for ${firebaseAuthUid}`
      );
      userData = {
        email: authUser.email,
        name: authUser.displayName || authUser.email?.split("@")[0] || "User",
        photoURL: authUser.photoURL,
        image: authUser.photoURL,
        roles: ["user"],
        creativeRoles: [],
        status: "active",
        uid: firebaseAuthUid,
        firebaseAuthUid: firebaseAuthUid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await adminDb.collection("users").doc(firebaseAuthUid).set(userData);
      canonicalUserId = firebaseAuthUid;
      console.log("getUserProfile: New user document created");
    }

    // Combine data from Firestore and Auth
    const userProfile: UserProfileResponse = {
      uid: canonicalUserId, // Use the canonical user ID (preserves existing relationships)
      email: authUser.email,
      emailVerified: authUser.emailVerified,
      displayName: authUser.displayName || userData.name,
      photoURL: authUser.photoURL || userData.photoURL,
      roles: userData.roles || ["user"],
      creativeRoles: userData.creativeRoles || [],
      status: userData.status || "active",
      createdAt: userData.createdAt?.toDate
        ? userData.createdAt.toDate()
        : userData.createdAt,
      updatedAt: userData.updatedAt?.toDate
        ? userData.updatedAt.toDate()
        : userData.updatedAt,
      lastSignInTime: authUser.metadata.lastSignInTime || null,
    };

    console.log("getUserProfile: Successfully returning user profile");
    return NextResponse.json(userProfile);
  } catch (error: any) {
    console.error("getUserProfile: Error fetching user profile:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withFirebaseAuth(getUserProfile);
