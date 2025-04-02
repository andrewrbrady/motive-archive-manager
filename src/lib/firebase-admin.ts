import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin
let adminApp: App;
let adminDb: ReturnType<typeof getFirestore>;
let adminAuth: ReturnType<typeof getAuth>;

// Function to safely parse environment variables
const getEnvVar = (name: string): string | undefined => {
  const value = process.env[name];

  // Check if value exists and is not empty
  if (!value || value.trim() === "") {
    console.error(`❌ Environment variable ${name} is not set or empty`);
    return undefined;
  }

  // For private key, we need to handle special formatting
  if (name === "FIREBASE_PRIVATE_KEY") {
    // Handle the case where the private key is stored as a JSON string in Vercel
    try {
      // Try to parse JSON if it's in that format
      if (value.startsWith('"') && value.endsWith('"')) {
        const parsedValue = JSON.parse(value);
        if (parsedValue) return parsedValue.replace(/\\n/g, "\n");
      }
    } catch (e) {
      // If parsing fails, proceed with normal replacement
      console.log(
        "Private key is not JSON formatted, using direct replacement"
      );
    }

    // Normal newline replacement
    return value.replace(/\\n/g, "\n");
  }

  return value;
};

// Get environment variables safely
const projectId = getEnvVar("FIREBASE_PROJECT_ID");
const clientEmail = getEnvVar("FIREBASE_CLIENT_EMAIL");
const privateKey = getEnvVar("FIREBASE_PRIVATE_KEY");
const databaseURL = getEnvVar("FIREBASE_DATABASE_URL");

// Debug environment variables (with sensitive data redacted)
console.log("Initializing Firebase Admin with credentials:");
console.log("- Project ID:", projectId || "Not set");
console.log("- Client Email:", clientEmail || "Not set");
console.log("- Private Key [length]:", privateKey ? privateKey.length : 0);
console.log("- Database URL:", databaseURL || "Not set");

// Check for missing required variables
const hasRequiredVars = projectId && clientEmail && privateKey;

if (!hasRequiredVars) {
  console.error(
    "❌ One or more required Firebase Admin environment variables are missing"
  );

  if (process.env.NODE_ENV === "production") {
    console.error("Environment: Production - This will cause errors");
    console.error(
      "Missing variables must be set in Vercel environment settings"
    );
  }
}

try {
  // Check if there are already initialized apps
  if (!getApps().length && hasRequiredVars) {
    console.log("No existing Firebase Admin apps, initializing new app");

    // Log formatted key length for debugging (don't log the actual key)
    console.log(
      "- Private Key after processing [length]:",
      privateKey ? privateKey.length : 0
    );

    // Initialize the app with the service account credentials
    adminApp = initializeApp({
      credential: cert({
        projectId: projectId!,
        clientEmail: clientEmail!,
        privateKey: privateKey!,
      }),
      // Optional: Set database URL if needed
      databaseURL: databaseURL,
    });
    console.log("✅ Firebase Admin initialized successfully with new app");
  } else if (getApps().length) {
    console.log("Using existing Firebase Admin app");
    adminApp = getApps()[0];
    console.log("✅ Retrieved existing Firebase Admin app");
  } else {
    throw new Error(
      "Cannot initialize Firebase Admin due to missing environment variables"
    );
  }
} catch (error: any) {
  console.error("❌ Error initializing Firebase Admin:", error);
  console.error("Error code:", error?.code);
  console.error("Error message:", error?.message);
  console.error("Stack trace:", error?.stack);

  // In development, provide a mock/fallback if Firebase Admin fails to initialize
  if (process.env.NODE_ENV === "development") {
    console.warn("⚠️ Using mock Firebase Admin for development");
    // Create a placeholder app object
    adminApp = {} as App;
  } else {
    // In production, we need to handle this error gracefully
    console.error("⚠️ Failed to initialize Firebase Admin in production");
    // Create a placeholder for now, but this will likely cause issues
    adminApp = {} as App;
  }
}

try {
  // Initialize Firebase Admin services
  if (
    adminApp &&
    typeof adminApp === "object" &&
    Object.keys(adminApp).length > 0
  ) {
    console.log("Initializing Firebase Admin services (Firestore, Auth)");
    adminDb = getFirestore(adminApp);
    console.log("✅ Firebase Admin Firestore initialized");
    adminAuth = getAuth(adminApp);
    console.log("✅ Firebase Admin Auth initialized");
  } else {
    throw new Error(
      "Cannot initialize Firebase Admin services: invalid app instance"
    );
  }
} catch (error: any) {
  console.error("❌ Error initializing Firebase Admin services:", error);
  console.error("Error code:", error?.code);
  console.error("Error message:", error?.message);
  console.error("Stack trace:", error?.stack);

  // Create mock services for development or as fallback in production
  console.warn("⚠️ Using mock Firebase Admin services");
  adminDb = {} as ReturnType<typeof getFirestore>;
  adminAuth = {} as ReturnType<typeof getAuth>;
}

export { adminApp, adminDb, adminAuth };
