import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

/**
 * Temporary API endpoint to set admin privileges for the Firebase account owner
 * This should be removed after use for security reasons
 */
export async function GET(request: Request) {
  try {
    // The specific user ID to grant admin privileges to
    const uid = "115667720852671300123"; // This is your Google account ID from the logs
    const email = "andrewbradyonline@gmail.com"; // Your email from the logs

    console.log(`Setting admin privileges for ${email} (${uid})`);

    // Check if user exists in Firebase Auth
    let userExists = false;
    try {
      const userRecord = await adminAuth.getUser(uid);
      userExists = true;
      console.log("User exists in Firebase Auth:", userRecord.uid);
    } catch (error) {
      console.log("User not found in Firebase Auth, creating...");
      // Create the user if they don't exist
      await adminAuth.createUser({
        uid: uid,
        email: email,
        displayName: "Andrew Brady",
        photoURL:
          "https://lh3.googleusercontent.com/a/ACg8ocKAeSJCajl-FF0471bHXVbl3uchPR7prOox3BMeOPgTqa3W_yVa=s96-c",
        emailVerified: true,
      });
      console.log("User created in Firebase Auth");
    }

    // Set admin claims
    await adminAuth.setCustomUserClaims(uid, {
      roles: ["user", "admin"],
      creativeRoles: [],
      status: "active",
    });
    console.log("Admin claims set for user");

    // Update or create Firestore document
    await adminDb
      .collection("users")
      .doc(uid)
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
      message: "Admin privileges set successfully",
      user: {
        uid,
        email,
        roles: ["user", "admin"],
      },
    });
  } catch (error: any) {
    console.error("Error setting admin privileges:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set admin privileges" },
      { status: 500 }
    );
  }
}
