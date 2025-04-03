import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

// Import environment setup (this must be first)
import "@/lib/env-setup";

// Check required environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error(
    "Missing required environment variables for Google OAuth: GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET"
  );
}

// Log critical environment variables
console.log("OAuth Configuration Check:", {
  GOOGLE_CLIENT_ID_SET: !!process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_ID_LENGTH: process.env.GOOGLE_CLIENT_ID?.length || 0,
  GOOGLE_CLIENT_SECRET_SET: !!process.env.GOOGLE_CLIENT_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || "Not set",
  NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
  VERCEL_ENV: process.env.VERCEL_ENV,
  NODE_ENV: process.env.NODE_ENV,
});

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            credentials.email as string,
            credentials.password as string
          );

          if (!userCredential.user) {
            return null;
          }

          const idTokenResult = await userCredential.user.getIdTokenResult();
          const uid = userCredential.user.uid;
          const email = userCredential.user.email || "";
          const displayName = userCredential.user.displayName;
          const photoURL = userCredential.user.photoURL;

          // Get custom claims from the token
          const claims = idTokenResult.claims || {};
          const roles = Array.isArray(claims.roles) ? claims.roles : ["user"];
          const creativeRoles = Array.isArray(claims.creativeRoles)
            ? claims.creativeRoles
            : [];
          const status =
            typeof claims.status === "string" ? claims.status : "active";

          return {
            id: uid,
            email,
            name: displayName || email?.split("@")[0] || "User",
            image: photoURL,
            roles,
            creativeRoles,
            status,
          };
        } catch (error) {
          console.error("Firebase auth error:", error);
          // Handle specific Firebase errors
          if (error instanceof FirebaseError) {
            if (error.code === "auth/user-not-found") {
              throw new Error("No user found with this email address.");
            } else if (error.code === "auth/wrong-password") {
              throw new Error("Invalid password.");
            } else if (error.code === "auth/invalid-credential") {
              throw new Error("Invalid email or password.");
            } else if (error.code === "auth/user-disabled") {
              throw new Error("This account has been disabled.");
            } else {
              throw new Error(error.message);
            }
          }
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          ...user,
        };
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      session.user = {
        ...session.user,
        ...token,
      };
      return session;
    },
  },
};

export default authConfig;
