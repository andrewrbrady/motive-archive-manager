import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    // The email we need to fix (from the logs)
    const email = "andrew@andrewrbrady.com";
    const googleUid = "110131084707533797446";

    console.log(`Attempting to resolve email collision for: ${email}`);

    // Try to find the existing user by email
    let existingUser;
    try {
      existingUser = await adminAuth.getUserByEmail(email);
      console.log("Found existing user:", existingUser.uid);

      // Check if this is already the same UID as the Google account
      if (existingUser.uid === googleUid) {
        console.log("User already has the correct UID, just updating claims");
      } else {
        console.log("User exists with different UID. Need to handle linking.");
        console.log("Existing UID:", existingUser.uid);
        console.log("Google UID:", googleUid);
        // This requires manual migration or account linking
      }
    } catch (error) {
      console.log(`No existing user found with email ${email}`);
      return NextResponse.json(
        {
          error: "No user found with that email",
        },
        { status: 404 }
      );
    }

    // Set admin claims on the existing user
    await adminAuth.setCustomUserClaims(existingUser.uid, {
      roles: ["user", "admin"],
      creativeRoles: [],
      status: "active",
    });
    console.log("Admin claims set for user:", existingUser.uid);

    // Update Firestore document
    await adminDb
      .collection("users")
      .doc(existingUser.uid)
      .set(
        {
          name: "Andrew Brady",
          email: email,
          roles: ["user", "admin"],
          creativeRoles: [],
          status: "active",
          accountType: "personal",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      );
    console.log("Firestore document updated with admin privileges");

    return NextResponse.json({
      success: true,
      message: "User account fixed and admin privileges set",
      user: {
        uid: existingUser.uid,
        email: email,
        providerId: existingUser.providerData
          .map((p) => p.providerId)
          .join(", "),
        roles: ["user", "admin"],
      },
      nextSteps:
        "Try signing in with this email again. If still having issues, delete the user in Firebase Console and try again.",
    });
  } catch (error: any) {
    console.error("Error fixing user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fix user" },
      { status: 500 }
    );
  }
}
