import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { verifyFirebaseToken } from "@/lib/firebase-auth-middleware";

export async function GET(request: NextRequest) {
  try {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 Debugging Authentication Issues...\n");

    // Get the current user from the request token
    const authHeader = request.headers.get("authorization");
    let currentUserId = null;
    let currentUserEmail = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1];
      const tokenData = await verifyFirebaseToken(token);
      if (tokenData) {
        if (tokenData.tokenType === "firebase_auth") {
          currentUserId = tokenData.uid;
          currentUserEmail = tokenData.email;
        } else if (tokenData.tokenType === "api_token") {
          currentUserId = tokenData.userId;
          currentUserEmail = tokenData.userEmail;
        }
      }
    }

    // Fallback to hardcoded admin user if no token provided
    const adminUid = currentUserId || "G46fdpqaufe7bmhluKAhakVM44e2";
    const adminEmail = currentUserEmail || "andrew@andrewrbrady.com";

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Fixing authentication for user: ${adminEmail} (${adminUid})`);

    const results = {
      firebaseAuth: null as any,
      firestoreDoc: null as any,
      fixed: false,
      error: null as string | null,
      currentUser: {
        uid: adminUid,
        email: adminEmail,
        fromToken: !!currentUserId,
      },
    };

    // 1. Check Firebase Auth user
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("1. Checking Firebase Auth user...");
    const authUser = await adminAuth.getUser(adminUid);
    results.firebaseAuth = {
      email: authUser.email,
      customClaims: authUser.customClaims || null,
      emailVerified: authUser.emailVerified,
      disabled: authUser.disabled,
    };

    // 2. Check Firestore user document
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("2. Checking Firestore user document...");
    const userDoc = await adminDb.collection("users").doc(adminUid).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      results.firestoreDoc = {
        exists: true,
        roles: userData?.roles || [],
        creativeRoles: userData?.creativeRoles || [],
        status: userData?.status || "unknown",
      };
    } else {
      results.firestoreDoc = { exists: false };
    }

    // 3. Fix admin access
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("3. Fixing admin access...");

    // Ensure admin roles in both places
    const adminRoles = ["user", "admin"];
    const adminClaims = {
      roles: adminRoles,
      creativeRoles: [],
      status: "active",
    };

    // Update Firebase Auth custom claims
    await adminAuth.setCustomUserClaims(adminUid, adminClaims);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("   ✅ Updated Firebase Auth custom claims");

    // Update or create Firestore document
    const firestoreData = {
      uid: adminUid,
      email: adminEmail,
      name: authUser.displayName || "Admin User",
      roles: adminRoles,
      creativeRoles: [],
      status: "active",
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    await adminDb
      .collection("users")
      .doc(adminUid)
      .set(firestoreData, { merge: true });
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("   ✅ Updated Firestore document");

    // 4. Verify fix
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("4. Verifying fix...");
    const updatedAuthUser = await adminAuth.getUser(adminUid);
    const updatedUserDoc = await adminDb
      .collection("users")
      .doc(adminUid)
      .get();

    results.fixed = true;

    return NextResponse.json({
      success: true,
      message: "Authentication issues have been fixed",
      results,
      verification: {
        firebaseAuthClaims: updatedAuthUser.customClaims,
        firestoreRoles: updatedUserDoc.data()?.roles,
      },
      nextSteps: [
        "Clear your browser cache and cookies",
        "Sign out and sign back in",
        "Try accessing /admin again",
      ],
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to fix authentication issues",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // List all users for debugging
    const listUsersResult = await adminAuth.listUsers(10);

    const users = listUsersResult.users.map((user) => ({
      email: user.email,
      uid: user.uid,
      claims: user.customClaims || null,
      disabled: user.disabled,
    }));

    return NextResponse.json({
      success: true,
      users,
      message: "User list retrieved successfully",
    });
  } catch (error) {
    console.error("❌ Error checking users:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to retrieve user list",
      },
      { status: 500 }
    );
  }
}
