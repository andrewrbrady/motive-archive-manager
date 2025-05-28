import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    // Test Firebase Admin connectivity
    let firebaseTest = "Unknown";
    try {
      // Simple test - list users (limited to 1)
      const listResult = await adminAuth.listUsers(1);
      firebaseTest = `Working - found ${listResult.users.length} users`;
    } catch (error: any) {
      firebaseTest = `Error: ${error.message}`;
    }

    // Test Firestore connectivity
    let firestoreTest = "Unknown";
    try {
      const testDoc = await adminDb.collection("users").limit(1).get();
      firestoreTest = `Working - ${testDoc.size} documents in users collection`;
    } catch (error: any) {
      firestoreTest = `Error: ${error.message}`;
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      authSystem: "Firebase Auth",
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
        hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        hasFirebaseApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        hasFirebaseAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      },
      services: {
        firebaseAuth: firebaseTest,
        firestore: firestoreTest,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
