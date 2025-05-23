#!/usr/bin/env tsx

/**
 * Quick script to fix admin custom claims in Firebase Auth
 * Standalone version that doesn't require env-setup
 */

import admin from "firebase-admin";
import { config } from "dotenv";

// Load environment variables
config();

// Initialize Firebase Admin SDK directly
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

async function fixAdminClaims() {
  console.log("🔧 Fixing Admin Custom Claims...\n");

  const adminEmail = "andrew@andrewrbrady.com";
  const adminUid = "G46fdpqaufe7bmhluKAhakVM44e2";

  try {
    console.log(`1. Checking Firebase Auth user: ${adminEmail}`);

    // Get the Firebase Auth user
    const authUser = await adminAuth.getUser(adminUid);
    console.log(`   ✅ Found Firebase Auth user: ${authUser.uid}`);
    console.log(`   Current custom claims:`, authUser.customClaims || "None");

    // Get the Firestore user document
    console.log(`\n2. Checking Firestore document...`);
    const userDoc = await adminDb.collection("users").doc(adminUid).get();

    if (!userDoc.exists) {
      throw new Error("Firestore user document not found");
    }

    const userData = userDoc.data();
    console.log(`   ✅ Found Firestore document`);
    console.log(`   Firestore roles:`, userData?.roles || []);
    console.log(`   Firestore creative roles:`, userData?.creativeRoles || []);
    console.log(`   Firestore status:`, userData?.status || "unknown");

    // Update Firebase Auth custom claims to match Firestore
    console.log(`\n3. Updating Firebase Auth custom claims...`);

    const newClaims = {
      roles: userData?.roles || ["user"],
      creativeRoles: userData?.creativeRoles || [],
      status: userData?.status || "active",
    };

    await adminAuth.setCustomUserClaims(adminUid, newClaims);
    console.log(`   ✅ Updated custom claims:`, newClaims);

    // Verify the update
    console.log(`\n4. Verifying update...`);
    const updatedUser = await adminAuth.getUser(adminUid);
    console.log(`   ✅ Verified custom claims:`, updatedUser.customClaims);

    console.log(`\n🎉 Admin claims fixed successfully!`);
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Sign out completely from your app`);
    console.log(`   2. Clear browser cookies/localStorage`);
    console.log(`   3. Sign back in`);
    console.log(`   4. You should now have admin access`);
  } catch (error) {
    console.error(`\n❌ Error fixing admin claims:`, error);
    process.exit(1);
  }
}

// Run the fix
if (import.meta.url === `file://${process.argv[1]}`) {
  fixAdminClaims();
}

export { fixAdminClaims };
