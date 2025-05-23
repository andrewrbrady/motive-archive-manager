import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();

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
      session: session
        ? {
            hasUser: !!session.user,
            userId: session.user?.id,
            email: session.user?.email,
            roles: session.user?.roles,
          }
        : null,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        hasNextAuthSecret: !!(
          process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
        ),
      },
      services: {
        firebaseAuth: firebaseTest,
        firestore: firestoreTest,
      },
      oauth: {
        googleClientIdSuffix: process.env.GOOGLE_CLIENT_ID?.slice(-20),
        expectedCallbackUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/callback/google`,
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
