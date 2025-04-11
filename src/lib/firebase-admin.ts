// Import environment setup first - this must be the first import
import "./env-setup";

import { getApps, initializeApp, cert, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Log environment variables status
console.log("Firebase Admin Environment Variables Status:", {
  projectId: !!process.env.FIREBASE_PROJECT_ID,
  clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
  privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
});

if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY
) {
  throw new Error("Missing Firebase Admin environment variables");
}

// Format private key by replacing literal '\n' with actual newlines
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

// Initialize Firebase Admin
const apps = getApps();
const firebaseAdmin = !apps.length
  ? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    })
  : getApp();

// Initialize Firestore
const adminDb = getFirestore();

console.log("Firebase Admin initialized successfully");

// Initialize Firebase Admin services
const adminAuth = getAuth(firebaseAdmin);
console.log("✅ Firebase Admin Auth initialized");

export { firebaseAdmin, adminDb, adminAuth };
