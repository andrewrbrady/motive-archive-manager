import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { uid, email } = data;

    // Validate input
    if (!uid && !email) {
      return NextResponse.json(
        { error: "Either uid or email is required" },
        { status: 400 }
      );
    }

    // Find user by either UID or email
    let authUser;
    try {
      if (uid) {
        authUser = await adminAuth.getUser(uid);
      } else {
        authUser = await adminAuth.getUserByEmail(email);
      }

      console.log(
        `Found user in Firebase Auth: ${authUser.uid} (${authUser.email})`
      );
    } catch (error) {
      return NextResponse.json(
        { error: "User not found in Firebase Authentication" },
        { status: 404 }
      );
    }

    // Get custom claims
    const customClaims = authUser.customClaims || {};

    // Ensure roles exist
    let roles = customClaims.roles || ["user"];

    // Check if user should be admin (override)
    const makeAdmin = data.makeAdmin === true;
    if (makeAdmin && !roles.includes("admin")) {
      roles = [...roles, "admin"];
      console.log(`Adding admin role to user ${authUser.uid}`);
    }

    // Check if user exists in Firestore
    const userDocRef = adminDb.collection("users").doc(authUser.uid);
    const userDoc = await userDocRef.get();

    if (userDoc.exists) {
      console.log(`User exists in Firestore: ${authUser.uid}`);
      const firestoreData = userDoc.data() || {};

      // Get roles from Firestore (might be more accurate)
      if (Array.isArray(firestoreData.roles)) {
        if (makeAdmin && !firestoreData.roles.includes("admin")) {
          // Ensure admin role is in Firestore if requested
          roles = [...firestoreData.roles, "admin"];
        } else {
          // Use Firestore roles by default unless admin was requested
          roles = firestoreData.roles;
        }
      }

      // Update Firestore document to ensure it's synchronized
      await userDocRef.set(
        {
          email: authUser.email || email,
          name: authUser.displayName || authUser.email?.split("@")[0] || "User",
          roles: roles,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      console.log(`Updated Firestore document for ${authUser.uid}`);
    } else {
      // Create Firestore document if it doesn't exist
      console.log(`Creating new Firestore document for ${authUser.uid}`);

      await userDocRef.set({
        email: authUser.email || email,
        name: authUser.displayName || authUser.email?.split("@")[0] || "User",
        roles: roles,
        creativeRoles: [],
        status: "active",
        accountType: "personal",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`Created Firestore document for ${authUser.uid}`);
    }

    // Update custom claims in Firebase Auth
    await adminAuth.setCustomUserClaims(authUser.uid, {
      roles: roles,
      creativeRoles: [],
      status: "active",
    });

    console.log(`Updated custom claims for ${authUser.uid}`);

    return NextResponse.json({
      success: true,
      message: "User synchronized successfully",
      user: {
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName,
        roles: roles,
      },
      note: "You must sign out and sign back in for changes to take effect",
    });
  } catch (error: any) {
    console.error("Error synchronizing user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to synchronize user" },
      { status: 500 }
    );
  }
}

// Support GET requests as well for easier usage from browser
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");
    const email = searchParams.get("email");
    const makeAdmin = searchParams.get("makeAdmin") === "true";

    // Return early if no parameters provided
    if (!uid && !email) {
      return NextResponse.json(
        {
          error:
            "Missing parameters. Use ?uid=USERID or ?email=EMAIL&makeAdmin=true",
          usage:
            "To grant admin: /api/auth/sync-user?email=user@example.com&makeAdmin=true",
        },
        { status: 400 }
      );
    }

    // Reuse the same logic as POST handler
    const data = {
      uid: uid || undefined,
      email: email || undefined,
      makeAdmin,
    };

    // Find user by either UID or email
    let authUser;
    try {
      if (uid) {
        authUser = await adminAuth.getUser(uid);
      } else if (email) {
        authUser = await adminAuth.getUserByEmail(email);
      } else {
        throw new Error("Either uid or email is required");
      }

      console.log(
        `Found user in Firebase Auth: ${authUser.uid} (${authUser.email})`
      );
    } catch (error) {
      return NextResponse.json(
        { error: "User not found in Firebase Authentication" },
        { status: 404 }
      );
    }

    // Get custom claims
    const customClaims = authUser.customClaims || {};

    // Ensure roles exist
    let roles = customClaims.roles || ["user"];

    // Add admin role if requested
    if (makeAdmin && !roles.includes("admin")) {
      roles = [...roles, "admin"];
      console.log(`Adding admin role to user ${authUser.uid}`);
    }

    // Check if user exists in Firestore
    const userDocRef = adminDb.collection("users").doc(authUser.uid);
    const userDoc = await userDocRef.get();

    if (userDoc.exists) {
      console.log(`User exists in Firestore: ${authUser.uid}`);
      const firestoreData = userDoc.data() || {};

      // Get roles from Firestore (might be more accurate)
      if (Array.isArray(firestoreData.roles)) {
        if (makeAdmin && !firestoreData.roles.includes("admin")) {
          // Ensure admin role is in Firestore if requested
          roles = [...firestoreData.roles, "admin"];
        } else if (!makeAdmin) {
          // Use Firestore roles by default unless admin was explicitly requested
          roles = firestoreData.roles;
        }
      }

      // Update Firestore document to ensure it's synchronized
      await userDocRef.set(
        {
          email: authUser.email || email,
          name: authUser.displayName || authUser.email?.split("@")[0] || "User",
          roles: roles,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      console.log(`Updated Firestore document for ${authUser.uid}`);
    } else {
      // Create Firestore document if it doesn't exist
      console.log(`Creating new Firestore document for ${authUser.uid}`);

      await userDocRef.set({
        email: authUser.email || email,
        name: authUser.displayName || authUser.email?.split("@")[0] || "User",
        roles: roles,
        creativeRoles: [],
        status: "active",
        accountType: "personal",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`Created Firestore document for ${authUser.uid}`);
    }

    // Update custom claims in Firebase Auth
    await adminAuth.setCustomUserClaims(authUser.uid, {
      roles: roles,
      creativeRoles: [],
      status: "active",
    });

    console.log(`Updated custom claims for ${authUser.uid}`);

    return NextResponse.json({
      success: true,
      message: "User synchronized successfully",
      user: {
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName,
        roles: roles,
      },
      note: "You must sign out and sign back in for changes to take effect",
      action: "Sign out now",
      signoutUrl: "/api/auth/signout",
    });
  } catch (error: any) {
    console.error("Error synchronizing user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to synchronize user" },
      { status: 500 }
    );
  }
}
