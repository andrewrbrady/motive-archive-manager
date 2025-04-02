import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";

/**
 * Debug endpoint for OAuth user creation
 * This endpoint checks if a user exists in Firebase Auth and Firestore
 * and attempts to create the user if they don't exist
 */
export async function POST(request: Request) {
  try {
    // Only allow admin access
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await request.json();
    const { uid, email, name, photoURL } = data;

    if (!uid || !email) {
      return NextResponse.json(
        { error: "UID and email are required" },
        { status: 400 }
      );
    }

    // Check Firebase Auth
    let authUser;
    let authUserExists = false;
    try {
      authUser = await adminAuth.getUser(uid);
      authUserExists = true;
      console.log("User exists in Firebase Auth:", {
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName,
      });
    } catch (error: any) {
      console.log(
        `User ${email} with ID ${uid} does not exist in Firebase Auth`
      );
      console.error("Error details:", error);
    }

    // Check Firestore
    let firestoreUser;
    let firestoreUserExists = false;
    try {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      firestoreUserExists = userDoc.exists;
      if (userDoc.exists) {
        firestoreUser = userDoc.data();
        console.log("User exists in Firestore:", firestoreUser);
      } else {
        console.log(`User ${email} with ID ${uid} does not exist in Firestore`);
      }
    } catch (error) {
      console.error("Error checking Firestore:", error);
    }

    // If requested, create the user in Firebase Auth
    let authCreationResult = null;
    if (data.createAuth && !authUserExists) {
      try {
        authCreationResult = await adminAuth.createUser({
          uid: uid,
          email: email,
          displayName: name || email.split("@")[0],
          photoURL: photoURL || "",
          emailVerified: true,
        });
        console.log("Created user in Firebase Auth:", authCreationResult);

        // Set custom claims
        await adminAuth.setCustomUserClaims(uid, {
          roles: ["user"],
          creativeRoles: [],
          status: "active",
        });
        console.log("Set custom claims for user:", uid);
      } catch (error) {
        console.error("Error creating user in Firebase Auth:", error);
        authCreationResult = { error: error };
      }
    }

    // If requested, create the user in Firestore
    let firestoreCreationResult = null;
    if (data.createFirestore && !firestoreUserExists) {
      try {
        await adminDb
          .collection("users")
          .doc(uid)
          .set({
            name: name || email.split("@")[0],
            email: email,
            image: photoURL || "",
            roles: ["user"],
            creativeRoles: [],
            status: "active",
            accountType: "personal",
            createdAt: new Date(),
          });
        console.log("Created user in Firestore");
        firestoreCreationResult = { success: true };
      } catch (error) {
        console.error("Error creating user in Firestore:", error);
        firestoreCreationResult = { error: error };
      }
    }

    return NextResponse.json({
      authUserExists,
      firestoreUserExists,
      authUser:
        authUserExists && authUser
          ? {
              uid: authUser.uid,
              email: authUser.email,
              displayName: authUser.displayName,
              emailVerified: authUser.emailVerified,
              disabled: authUser.disabled,
              creationTime: authUser.metadata.creationTime,
              lastSignInTime: authUser.metadata.lastSignInTime,
            }
          : null,
      firestoreUser: firestoreUserExists ? firestoreUser : null,
      authCreationResult,
      firestoreCreationResult,
    });
  } catch (error: any) {
    console.error("Debug OAuth error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
