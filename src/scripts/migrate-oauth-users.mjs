/**
 * OAuth User Migration Script
 *
 * This script identifies users with OAuth IDs and helps migrate them to proper Firebase UIDs.
 * Run this script using:
 *   node src/scripts/migrate-oauth-users.cjs
 */

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

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

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    process.exit(1);
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI environment variable is not set');
}

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('motive-archive');
    const users = db.collection('users');

    // Get all users from Firebase
    const listUsersResult = await admin.auth().listUsers();
    const firebaseUsers = listUsersResult.users;

    console.log(`Found ${firebaseUsers.length} users in Firebase`);

    // Process each user
    for (const firebaseUser of firebaseUsers) {
      const {
        uid,
        email,
        displayName,
        photoURL,
        customClaims,
        metadata,
        providerData,
      } = firebaseUser;

      // Check if user already exists in MongoDB
      const existingUser = await users.findOne({ firebaseId: uid });

      if (existingUser) {
        console.log(`User ${uid} already exists in MongoDB`);
        continue;
      }

      // Create new user document
      const newUser = {
        firebaseId: uid,
        email,
        name: displayName || email?.split('@')[0] || 'Unknown',
        image: photoURL,
        role: customClaims?.role || 'user',
        createdAt: new Date(metadata.creationTime),
        updatedAt: new Date(metadata.lastSignInTime),
        providers: providerData.map(provider => provider.providerId),
      };

      // Insert the new user
      await users.insertOne(newUser);
      console.log(`Created new user ${uid} in MongoDB`);
    }

    console.log('Migration completed successfully');
  } finally {
    await client.close();
  }
}

run().catch(console.error);
