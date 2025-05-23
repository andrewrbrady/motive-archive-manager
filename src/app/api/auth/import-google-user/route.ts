import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

/**
 * API endpoint to correctly import a Google OAuth user
 * This properly sets up the user with Google as the provider
 */
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { uid, email, displayName, photoURL } = data;

    if (!uid || !email) {
      return NextResponse.json(
        { error: "UID and email are required" },
        { status: 400 }
      );
    }

    // [REMOVED] // [REMOVED] console.log(`Attempting to import Google user: ${email} (${uid})`);

    // Check if user already exists
    try {
      const existingUser = await adminAuth.getUser(uid);
      // [REMOVED] // [REMOVED] console.log(`User already exists: ${existingUser.uid}`);

      // No need to import again
      return NextResponse.json({
        success: true,
        message: "User already exists",
        user: {
          uid: existingUser.uid,
          email: existingUser.email,
          displayName: existingUser.displayName,
          providerData: existingUser.providerData,
        },
      });
    } catch (error) {
      // User doesn't exist, proceed with import
    }

    // Import the user with Google as the provider
    const importResult = await adminAuth.importUsers(
      [
        {
          uid,
          email,
          displayName: displayName || email.split("@")[0],
          photoURL: photoURL || "",
          emailVerified: true,
          providerData: [
            {
              uid: email,
              providerId: "google.com",
              displayName: displayName || email.split("@")[0],
              email,
              photoURL: photoURL || "",
            },
          ],
        },
      ],
      {
        // Hash options are required but not used for Google provider
        hash: {
          algorithm: "HMAC_SHA256",
          key: Buffer.from("not-used-for-google-accounts"),
        },
      }
    );

    // [REMOVED] // [REMOVED] console.log(`User imported successfully: ${uid}`);

    // Set custom claims
    await adminAuth.setCustomUserClaims(uid, {
      roles: ["user"],
      creativeRoles: [],
      status: "active",
    });

    // Create a user document in Firestore
    await adminDb
      .collection("users")
      .doc(uid)
      .set({
        name: displayName || email.split("@")[0],
        email: email,
        image: photoURL || "",
        roles: ["user"],
        creativeRoles: [],
        status: "active",
        accountType: "personal",
        createdAt: new Date(),
      });

    return NextResponse.json({
      success: true,
      message: "Google user imported successfully",
      user: {
        uid,
        email,
        displayName: displayName || email.split("@")[0],
      },
    });
  } catch (error: any) {
    console.error("Error importing Google user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to import user" },
      { status: 500 }
    );
  }
}
