import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin
let adminApp: App;
let adminDb: ReturnType<typeof getFirestore>;
let adminAuth: ReturnType<typeof getAuth>;

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

console.log("Initializing Firebase Admin with credentials:");
console.log("- Project ID:", process.env.FIREBASE_PROJECT_ID);
console.log("- Client Email:", process.env.FIREBASE_CLIENT_EMAIL);
console.log(
  "- Private Key [length]:",
  process.env.FIREBASE_PRIVATE_KEY?.length || 0
);
console.log("- Database URL:", process.env.FIREBASE_DATABASE_URL || "Not set");

try {
  if (!getApps().length) {
    console.log("No existing Firebase Admin apps, initializing new app");
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
    console.log("✅ Firebase Admin initialized successfully with new app");
  } else {
    console.log("Using existing Firebase Admin app");
    adminApp = getApps()[0];
    console.log("✅ Retrieved existing Firebase Admin app");
  }
} catch (error: any) {
  console.error("❌ Error initializing Firebase Admin:", error);
  console.error("Error code:", error.code);
  console.error("Error message:", error.message);
  console.error("Stack trace:", error.stack);

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

try {
  // Initialize Firebase Admin services
  console.log("Initializing Firebase Admin services (Firestore, Auth)");
  adminDb = getFirestore(adminApp);
  console.log("✅ Firebase Admin Firestore initialized");
  adminAuth = getAuth(adminApp);
  console.log("✅ Firebase Admin Auth initialized");
} catch (error: any) {
  console.error("❌ Error initializing Firebase Admin services:", error);
  console.error("Error code:", error.code);
  console.error("Error message:", error.message);
  console.error("Stack trace:", error.stack);

  // Create mock services for development
  if (process.env.NODE_ENV === "development") {
    console.warn("⚠️ Using mock Firebase Admin services for development");
    adminDb = {} as ReturnType<typeof getFirestore>;
    adminAuth = {} as ReturnType<typeof getAuth>;
  } else {
    throw error;
  }
}

export { adminApp, adminDb, adminAuth };
