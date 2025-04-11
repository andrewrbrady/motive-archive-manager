/**
 * OAuth User Migration Script
 *
 * This script identifies users with OAuth IDs and helps migrate them to proper Firebase UIDs.
 * Run this script using:
 *   node src/scripts/migrate-oauth-users.cjs
 */

// Load environment variables
require("dotenv").config({ path: ".env.local" });

// Debug environment variables
console.log("Environment variables check:");
console.log(
  "FIREBASE_PROJECT_ID:",
  process.env.FIREBASE_PROJECT_ID ? "✓ defined" : "❌ missing"
);
console.log(
  "FIREBASE_CLIENT_EMAIL:",
  process.env.FIREBASE_CLIENT_EMAIL ? "✓ defined" : "❌ missing"
);
console.log(
  "FIREBASE_PRIVATE_KEY:",
  process.env.FIREBASE_PRIVATE_KEY
    ? "✓ defined but not showing value"
    : "❌ missing"
);

// Set up Firebase Admin
const admin = require("firebase-admin");

// Initialize Firebase Admin with the service account
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!process.env.FIREBASE_PROJECT_ID) {
      throw new Error("FIREBASE_PROJECT_ID is not defined");
    }

    if (!process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error("FIREBASE_CLIENT_EMAIL is not defined");
    }

    if (!privateKey) {
      throw new Error("FIREBASE_PRIVATE_KEY is not defined");
    }

    console.log("Initializing Firebase Admin with:");
    console.log("Project ID:", process.env.FIREBASE_PROJECT_ID);
    console.log("Client Email:", process.env.FIREBASE_CLIENT_EMAIL);

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    process.exit(1);
  }
}

// Regular expression to identify OAuth IDs
const OAUTH_ID_REGEX = /^\d{21,}$/;

/**
 * Migration process:
 * 1. Find all users with OAuth IDs (numeric IDs with 21+ digits)
 * 2. For each such user, look up their Firebase Auth record
 * 3. Update the Firestore document with the correct Firebase UID
 * 4. Update any deliverables that reference the OAuth ID
 */
async function migrateOAuthUsers() {
  console.log("Starting OAuth user migration...");
  const db = admin.firestore();
  const auth = admin.auth();

  try {
    // Get all users from Firestore
    const usersSnapshot = await db.collection("users").get();
    console.log(`Found ${usersSnapshot.size} total users in Firestore`);

    // Identify users with OAuth IDs
    const oauthUsers = [];
    usersSnapshot.forEach((doc) => {
      const userId = doc.id;
      if (OAUTH_ID_REGEX.test(userId)) {
        oauthUsers.push({
          id: userId,
          data: doc.data(),
        });
      }
    });

    console.log(
      `Found ${oauthUsers.length} users with OAuth IDs that need migration`
    );

    // Process each OAuth user
    for (const user of oauthUsers) {
      console.log(`Processing user: ${user.data.name} (${user.id})`);

      try {
        // Try to find the user by email in Firebase Auth
        const userEmail = user.data.email;
        if (!userEmail) {
          console.error(`User ${user.id} has no email address, skipping...`);
          continue;
        }

        // Look up user by email in Firebase Auth
        const authUsers = await auth.getUserByEmail(userEmail);
        const firebaseUid = authUsers.uid;

        console.log(`Found Firebase UID for ${user.data.name}: ${firebaseUid}`);

        if (firebaseUid === user.id) {
          console.log(
            `User ${user.data.name} already has matching IDs, skipping...`
          );
          continue;
        }

        // Check if a Firestore document already exists with the Firebase UID
        const existingDoc = await db.collection("users").doc(firebaseUid).get();

        if (existingDoc.exists) {
          console.log(
            `User document already exists with Firebase UID ${firebaseUid}, merging data...`
          );

          // Merge the data from the OAuth user into the Firebase user
          const mergedData = {
            ...existingDoc.data(),
            ...user.data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            oauthId: user.id, // Store the original OAuth ID for reference
          };

          await db.collection("users").doc(firebaseUid).update(mergedData);
          console.log(
            `Updated existing user document with Firebase UID ${firebaseUid}`
          );
        } else {
          // Create a new document with the Firebase UID
          const userData = {
            ...user.data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            oauthId: user.id, // Store the original OAuth ID for reference
          };

          await db.collection("users").doc(firebaseUid).set(userData);
          console.log(
            `Created new user document with Firebase UID ${firebaseUid}`
          );
        }

        // Now update any deliverables that reference this user's OAuth ID
        const deliverableUpdates = await migrateUserDeliverables(
          user.id,
          firebaseUid
        );
        console.log(
          `Updated ${deliverableUpdates} deliverables for user ${user.data.name}`
        );

        // Optionally, after migration we could delete the old document
        if (process.env.DELETE_OLD_DOCUMENTS === "true") {
          await db.collection("users").doc(user.id).delete();
          console.log(`Deleted old user document with OAuth ID ${user.id}`);
        } else {
          // Mark the document as migrated
          await db.collection("users").doc(user.id).update({
            migrated: true,
            migratedTo: firebaseUid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(
            `Marked user document with OAuth ID ${user.id} as migrated`
          );
        }
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
      }
    }

    console.log("OAuth user migration completed");
  } catch (error) {
    console.error("Error in migration process:", error);
  }
}

/**
 * Updates deliverables to use the correct Firebase UID instead of OAuth ID
 */
async function migrateUserDeliverables(oauthId, firebaseUid) {
  console.log(`Migrating deliverables from ${oauthId} to ${firebaseUid}...`);

  try {
    // Find deliverables with this user's OAuth ID in MongoDB collection
    const { MongoClient } = require("mongodb");
    const mongoUrl = process.env.MONGODB_URI;
    if (!mongoUrl) {
      console.error("MONGODB_URI environment variable is not defined");
      return 0;
    }

    console.log("Connecting to MongoDB...");
    const client = new MongoClient(mongoUrl);

    await client.connect();
    console.log("Connected to MongoDB");

    const database = client.db(process.env.MONGODB_DB_NAME || "motive_archive");
    const deliverablesCollection = database.collection("deliverables");

    // Find deliverables with this OAuth ID
    const query = { firebase_uid: oauthId };
    const deliverables = await deliverablesCollection.find(query).toArray();

    console.log(
      `Found ${deliverables.length} deliverables to update for user ${oauthId}`
    );

    if (deliverables.length > 0) {
      // Update each deliverable with the Firebase UID
      const updateResult = await deliverablesCollection.updateMany(
        { firebase_uid: oauthId },
        { $set: { firebase_uid: firebaseUid } }
      );

      console.log(
        `Updated ${updateResult.modifiedCount} deliverables for user ${oauthId}`
      );
      await client.close();
      return updateResult.modifiedCount;
    }

    await client.close();
    return 0;
  } catch (error) {
    console.error(`Error updating deliverables for user ${oauthId}:`, error);
    return 0;
  }
}

// Run the migration
migrateOAuthUsers().catch(console.error);
