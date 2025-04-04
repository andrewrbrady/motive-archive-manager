import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";

/**
 * Emergency endpoint to grant admin privileges to the specified user
 * This bypasses normal authorization checks
 * REMOVE THIS ENDPOINT AFTER USE
 */
export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "No authenticated user found" },
        { status: 401 }
      );
    }

    console.log("Initial session data:", {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      roles: session.user.roles,
    });

    // First try to get the user by email
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.getUserByEmail(session.user.email);
      console.log("Found existing Firebase user:", {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
      });
    } catch (error) {
      if ((error as any)?.errorInfo?.code === "auth/user-not-found") {
        console.log("Creating new Firebase user...");
        // Create the user in Firebase Auth
        firebaseUser = await adminAuth.createUser({
          email: session.user.email,
          displayName: session.user.name || session.user.email.split("@")[0],
          photoURL: session.user.image || undefined,
          disabled: false,
        });
        console.log("Created new Firebase user:", {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        });
      } else {
        throw error;
      }
    }

    // Set Firebase Auth custom claims
    await adminAuth.setCustomUserClaims(firebaseUser.uid, {
      roles: ["admin", "user"],
      creativeRoles: [],
      status: "active",
    });
    console.log("Set Firebase Auth custom claims");

    // Create or update Firestore document
    const userDoc = await adminDb
      .collection("users")
      .doc(firebaseUser.uid)
      .get();

    if (!userDoc.exists) {
      const userData = {
        uid: firebaseUser.uid,
        email: session.user.email,
        name: session.user.name,
        roles: ["admin", "user"],
        creativeRoles: [],
        status: "active",
        accountType: "personal",
        photoURL: session.user.image || null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await adminDb.collection("users").doc(firebaseUser.uid).set(userData);
      console.log("Created new Firestore document");
    } else {
      await adminDb
        .collection("users")
        .doc(firebaseUser.uid)
        .update({
          roles: ["admin", "user"],
          updatedAt: new Date(),
          email: session.user.email,
          name: session.user.name || session.user.email.split("@")[0],
          photoURL: session.user.image || null,
        });
      console.log("Updated existing Firestore document");
    }

    // Return success with instructions
    return NextResponse.json({
      success: true,
      message:
        "Admin privileges granted successfully. Please follow these steps:\n\n" +
        "1. Sign out completely\n" +
        "2. Clear your browser cache and cookies for this site\n" +
        "3. Sign back in with Google\n\n" +
        "This will ensure your session is properly synchronized with the new permissions.",
      userId: firebaseUser.uid,
      email: session.user.email,
      nextSteps: [
        "Sign out completely",
        "Clear browser cache and cookies for this site",
        "Sign back in with Google",
      ],
    });
  } catch (error: any) {
    console.error("Error in grant-admin endpoint:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to grant admin privileges",
        details: error.stack,
        errorInfo: error.errorInfo || {},
      },
      { status: 500 }
    );
  }
}
