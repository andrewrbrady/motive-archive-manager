import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const testEmail = `test-${Date.now()}@example.com`;
    // [REMOVED] // [REMOVED] console.log(`🧪 Testing user creation for: ${testEmail}`);

    // Step 1: Test Firebase Auth user creation
    // [REMOVED] // [REMOVED] console.log(`Step 1: Creating Firebase Auth user...`);
    const newUser = await adminAuth.createUser({
      email: testEmail,
      emailVerified: true,
      displayName: "Test User",
      disabled: false,
    });
    // [REMOVED] // [REMOVED] console.log(`✅ Firebase Auth user created: ${newUser.uid}`);

    // Step 2: Test custom claims
    // [REMOVED] // [REMOVED] console.log(`Step 2: Setting custom claims...`);
    await adminAuth.setCustomUserClaims(newUser.uid, {
      roles: ["user"],
      creativeRoles: [],
      status: "active",
    });
    // [REMOVED] // [REMOVED] console.log(`✅ Custom claims set`);

    // Step 3: Test Firestore document creation
    // [REMOVED] // [REMOVED] console.log(`Step 3: Creating Firestore document...`);
    await adminDb
      .collection("users")
      .doc(newUser.uid)
      .set({
        uid: newUser.uid,
        name: "Test User",
        email: testEmail,
        image: "",
        photoURL: "",
        roles: ["user"],
        creativeRoles: [],
        status: "active",
        accountType: "personal",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    // [REMOVED] // [REMOVED] console.log(`✅ Firestore document created`);

    // Step 4: Clean up test user
    // [REMOVED] // [REMOVED] console.log(`Step 4: Cleaning up test user...`);
    await adminDb.collection("users").doc(newUser.uid).delete();
    await adminAuth.deleteUser(newUser.uid);
    // [REMOVED] // [REMOVED] console.log(`✅ Test user cleaned up`);

    return NextResponse.json({
      success: true,
      message: "User creation test passed",
      testUserId: newUser.uid,
      testEmail: testEmail,
    });
  } catch (error: any) {
    console.error(`❌ User creation test failed:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        details: {
          message: error.message,
          code: error.code,
          stack: error.stack,
        },
      },
      { status: 500 }
    );
  }
}
