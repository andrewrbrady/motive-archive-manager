import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    // Get the current session
    const session = await auth();
    console.log("Current session:", JSON.stringify(session, null, 2));

    // If there's no session or user, return early
    if (!session || !session.user) {
      return NextResponse.json({
        authenticated: false,
        message: "No active session found",
        session,
      });
    }

    // User is authenticated
    const userId = session.user.id;
    const email = session.user.email;
    const sessionRoles = session.user.roles || [];

    // Get the user from Firebase Auth
    let firebaseAuthUser = null;
    let authClaims = null;
    try {
      firebaseAuthUser = await adminAuth.getUser(userId);

      // Get custom claims
      const idTokenResult = await adminAuth.createCustomToken(userId);
      authClaims = firebaseAuthUser.customClaims || {};

      console.log(
        "Firebase Auth User:",
        JSON.stringify(firebaseAuthUser, null, 2)
      );
      console.log("Auth Claims:", JSON.stringify(authClaims, null, 2));
    } catch (error) {
      console.error("Error fetching Firebase Auth user:", error);
    }

    // Get the user from Firestore
    let firestoreUser = null;
    try {
      const userDoc = await adminDb.collection("users").doc(userId).get();
      if (userDoc.exists) {
        firestoreUser = userDoc.data();
        console.log("Firestore User:", JSON.stringify(firestoreUser, null, 2));
      } else {
        console.log("No Firestore document found for user:", userId);
      }
    } catch (error) {
      console.error("Error fetching Firestore user:", error);
    }

    // Try to fix the roles if needed
    if (
      firestoreUser &&
      Array.isArray(firestoreUser.roles) &&
      firestoreUser.roles.includes("admin")
    ) {
      // Admin role exists in Firestore but not in session
      if (!sessionRoles.includes("admin")) {
        console.log(
          "Admin role found in Firestore but not in session - fixing claims"
        );

        // Set custom claims
        await adminAuth.setCustomUserClaims(userId, {
          roles: firestoreUser.roles,
          creativeRoles: firestoreUser.creativeRoles || [],
          status: firestoreUser.status || "active",
        });

        console.log("Fixed admin claims for user");
      }
    }

    return NextResponse.json({
      authenticated: true,
      userId,
      email,
      session: {
        roles: sessionRoles,
        expires: session.expires,
      },
      firebaseAuth: firebaseAuthUser
        ? {
            uid: firebaseAuthUser.uid,
            email: firebaseAuthUser.email,
            emailVerified: firebaseAuthUser.emailVerified,
            displayName: firebaseAuthUser.displayName,
            providerData: firebaseAuthUser.providerData,
            customClaims: authClaims,
          }
        : null,
      firestore: firestoreUser,
      needsReauthentication:
        firestoreUser?.roles?.includes("admin") &&
        !sessionRoles.includes("admin"),
      nextSteps:
        "If your roles mismatch between Firestore and session, try signing out completely and signing back in",
    });
  } catch (error: any) {
    console.error("Session debug error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to debug session" },
      { status: 500 }
    );
  }
}
