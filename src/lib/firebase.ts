import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate Firebase configuration
const requiredFields = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

const missingFields = requiredFields.filter(
  (field) => !firebaseConfig[field as keyof typeof firebaseConfig]
);

if (missingFields.length > 0) {
  console.error("Missing Firebase configuration fields:", missingFields);
  console.error("Current Firebase config:", {
    apiKey: firebaseConfig.apiKey ? "✓ Set" : "❌ Missing",
    authDomain: firebaseConfig.authDomain ? "✓ Set" : "❌ Missing",
    projectId: firebaseConfig.projectId ? "✓ Set" : "❌ Missing",
    storageBucket: firebaseConfig.storageBucket ? "✓ Set" : "❌ Missing",
    messagingSenderId: firebaseConfig.messagingSenderId
      ? "✓ Set"
      : "❌ Missing",
    appId: firebaseConfig.appId ? "✓ Set" : "❌ Missing",
  });
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
