import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin
let adminApp: App;

// Check that all required environment variables are present
const requiredEnvVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length) {
  // Log warning but don't crash in development
  console.error(`❌ Missing required Firebase Admin environment variables: ${missingVars.join(
    ", "
  )}
    Please check your .env.local file and ensure all variables are set properly.
  `);
}

try {
  if (!getApps().length) {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Ensure proper handling of the private key format
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
      // Optional: Set database URL if needed
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  } else {
    adminApp = getApps()[0];
  }
} catch (error) {
  console.error("❌ Error initializing Firebase Admin:", error);
  // In development, provide a mock/fallback if Firebase Admin fails to initialize
  if (process.env.NODE_ENV === "development") {
    console.warn("⚠️ Using mock Firebase Admin for development");
    // Create a placeholder app object
    adminApp = {} as App;
  } else {
    // In production, rethrow the error
    throw error;
  }
}

// Initialize Firebase Admin services
const adminDb = getFirestore(adminApp);
const adminAuth = getAuth(adminApp);

export { adminApp, adminDb, adminAuth };
