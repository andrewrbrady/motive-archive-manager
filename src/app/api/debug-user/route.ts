import { NextRequest, NextResponse } from "next/server";
import {
  withFirebaseAuth,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

/**
 * Debug endpoint to check user data from different sources
 */
async function debugUser(request: NextRequest): Promise<NextResponse<object>> {
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

    // Get user data from Firebase Auth
    const authUser = await adminAuth.getUser(userId);

    // Get user data from Firestore
    const userDoc = await adminDb.collection("users").doc(userId).get();
    const firestoreData = userDoc.exists ? userDoc.data() : null;

    // Check if there are any other user documents with the same email
    const emailQuery = await adminDb
      .collection("users")
      .where("email", "==", authUser.email)
      .get();

    const emailMatches = emailQuery.docs.map((doc) => ({
      id: doc.id,
      data: doc.data(),
    }));

    const debugInfo = {
      requestedUserId: userId,
      firebaseAuth: {
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName,
        photoURL: authUser.photoURL,
        emailVerified: authUser.emailVerified,
        customClaims: authUser.customClaims,
      },
      firestore: {
        exists: userDoc.exists,
        data: firestoreData,
      },
      emailMatches: {
        count: emailMatches.length,
        documents: emailMatches,
      },
    };

    return NextResponse.json(debugInfo);
  } catch (error: any) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withFirebaseAuth(debugUser);
