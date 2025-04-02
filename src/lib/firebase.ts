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

// Debug logging for Firebase configuration
console.log("Firebase Configuration:", {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Set" : "Missing",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "Set" : "Missing",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "Set" : "Missing",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    ? "Set"
    : "Missing",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    ? "Set"
    : "Missing",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "Set" : "Missing",
});

// Initialize Firebase - use existing app if available
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
console.log(
  "Firebase App initialized:",
  app.name,
  "with options:",
  app.options
);

// Initialize Firebase services
const auth = getAuth(app);
console.log("Firebase Auth initialized");
const db = getFirestore(app);
console.log("Firebase Firestore initialized");

export { app, auth, db };
