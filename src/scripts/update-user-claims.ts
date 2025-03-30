/**
 * Script to update existing Firebase users with custom claims and Firestore documents
 *
 * This script ensures that all Firebase Authentication users have:
 * 1. Appropriate custom claims set (roles, creativeRoles, status)
 * 2. A corresponding document in the Firestore users collection
 */

import { adminAuth, adminDb } from "../lib/firebase-admin";

async function main() {
  try {
    console.log("🔍 Finding all users in Firebase Authentication...");

    // List all users from Firebase Authentication
    // Note: For a large number of users, you would need to use pagination
    const listUsersResult = await adminAuth.listUsers(1000);

    console.log(`Found ${listUsersResult.users.length} users`);

    // Process each user
    for (const user of listUsersResult.users) {
      console.log(`Processing user: ${user.email} (${user.uid})`);

      // Check if custom claims are already set
      const customClaims = user.customClaims || {};
      const hasValidClaims =
        customClaims.roles &&
        Array.isArray(customClaims.roles) &&
        customClaims.status;

      // Check if user has a document in Firestore
      const userDoc = await adminDb.collection("users").doc(user.uid).get();
      const userExists = userDoc.exists;
      const userData = userExists ? userDoc.data() : null;

      // Set default data if needed
      if (!hasValidClaims || !userExists) {
        // Prepare custom claims
        const claims = {
          roles: customClaims.roles || userData?.roles || ["user"],
          creativeRoles:
            customClaims.creativeRoles || userData?.creativeRoles || [],
          status: customClaims.status || userData?.status || "active",
        };

        // Prepare Firestore data
        const firestoreData = {
          name: user.displayName || user.email?.split("@")[0] || "User",
          email: user.email,
          roles: claims.roles,
          creativeRoles: claims.creativeRoles,
          status: claims.status,
          accountType: userData?.accountType || "personal",
          profileImage: user.photoURL || userData?.profileImage || "",
          updatedAt: new Date(),
          createdAt: userData?.createdAt || new Date(),
        };

        // Update operations
        if (!hasValidClaims) {
          console.log(`- Setting custom claims for ${user.email}`);
          await adminAuth.setCustomUserClaims(user.uid, claims);
        }

        if (!userExists) {
          console.log(`- Creating Firestore document for ${user.email}`);
          await adminDb.collection("users").doc(user.uid).set(firestoreData);
        } else if (!hasValidClaims) {
          console.log(`- Updating Firestore document for ${user.email}`);
          await adminDb.collection("users").doc(user.uid).update(firestoreData);
        }
      } else {
        console.log(
          `- User ${user.email} already has valid claims and document`
        );
      }
    }

    console.log("✅ User update process completed successfully!");
  } catch (error) {
    console.error("Error updating users:", error);
    process.exit(1);
  }
}

// Run the script
main().then(() => process.exit(0));
