import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import crypto from "crypto";

// Import environment setup (this must be first)
import "@/lib/env-setup";

// Check required environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error(
    "Missing required environment variables for Google OAuth: GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET"
  );
}

// Log critical environment variables
console.log("NextAuth Environment Check:");
console.log("- NEXTAUTH_URL:", process.env.NEXTAUTH_URL || "Not set");
console.log(
  "- NEXTAUTH_SECRET:",
  process.env.NEXTAUTH_SECRET ? "Set" : "Not set"
);
console.log("- AUTH_SECRET:", process.env.AUTH_SECRET ? "Set" : "Not set");
console.log(
  "- GOOGLE_CLIENT_ID:",
  process.env.GOOGLE_CLIENT_ID
    ? `Set (${process.env.GOOGLE_CLIENT_ID.length} chars)`
    : "Not set"
);
console.log(
  "- GOOGLE_CLIENT_SECRET:",
  process.env.GOOGLE_CLIENT_SECRET ? "Set" : "Not set"
);

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
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
  session: {
    // Use JWT-based sessions for better compatibility with Edge runtime
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    // Add cookie configuration
    generateSessionToken: () => crypto.randomUUID(),
  },
  cookies: {
    // Configure cookies for better security and compatibility
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
    pkceCodeVerifier: {
      name: `__Host-next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        maxAge: 900, // 15 minutes in seconds
      },
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    signOut: "/auth/signout",
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id || "";
        token.roles = user.roles || ["user"];
        token.creativeRoles = user.creativeRoles || [];
        token.status = user.status || "active";

        // If using Firebase credentials provider, fetch fresh claims directly
        if (account?.provider === "credentials") {
          try {
            console.log("Getting fresh Firebase claims for credentials login");
            if (!user.id) {
              console.warn(
                "User ID is undefined, skipping Firebase claims fetch"
              );
            } else {
              const firebaseUser = await adminAuth.getUser(user.id);
              const claims = firebaseUser.customClaims || {};

              // Update token with fresh claims from Firebase
              if (claims.roles) token.roles = claims.roles;
              if (claims.creativeRoles)
                token.creativeRoles = claims.creativeRoles;
              if (claims.status) token.status = claims.status;

              console.log("Fresh Firebase claims added to token:", {
                uid: user.id,
                roles: token.roles,
                creativeRoles: token.creativeRoles,
              });
            }
          } catch (error) {
            console.error("Error getting Firebase custom claims:", error);
          }
        }
      }

      // Session update (manual refresh or role update)
      if (trigger === "update" && session) {
        if (session.refreshClaims === true) {
          try {
            console.log("Refreshing Firebase claims for user:", token.id);
            const firebaseUser = await adminAuth.getUser(token.id as string);
            const claims = firebaseUser.customClaims || {};

            // Update token with fresh claims
            token.roles = claims.roles || ["user"];
            token.creativeRoles = claims.creativeRoles || [];
            token.status = claims.status || "active";

            console.log("Refreshed Firebase claims in token:", {
              roles: token.roles,
              creativeRoles: token.creativeRoles,
            });
          } catch (error) {
            console.error("Error refreshing Firebase claims:", error);
          }
        } else if (session.roles || session.creativeRoles || session.status) {
          // Update with provided values from session
          if (session.roles) token.roles = session.roles;
          if (session.creativeRoles)
            token.creativeRoles = session.creativeRoles;
          if (session.status) token.status = session.status;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.roles = (token.roles as string[]) || ["user"];
        session.user.creativeRoles = (token.creativeRoles as string[]) || [];
        session.user.status = (token.status as string) || "active";

        // Add a function reference for refreshing claims
        // This gets serialized away but is useful for TypeScript types
        (session as any).refreshClaims = function () {
          return true;
        };
      }
      return session;
    },
    async signIn({ user, account }) {
      try {
        // Only process OAuth sign-ins (like Google)
        if (account?.provider === "google") {
          // IMPORTANT: Use the providerAccountId (Google's user ID) instead of NextAuth's user.id
          const uid = account.providerAccountId;
          const email = user.email;

          if (!uid || !email) return false;

          let firebaseUid = uid;

          // Try to find existing user by email first
          try {
            const existingUser = await adminAuth.getUserByEmail(email);
            console.log(`User ${email} found with UID: ${existingUser.uid}`);

            // If the user exists but with a different UID, we'll use the existing UID
            if (existingUser.uid !== uid) {
              console.log(
                `User exists with different UID (${existingUser.uid} vs ${uid}). Using existing UID.`
              );
              firebaseUid = existingUser.uid;
            }

            // Set or update custom claims
            await adminAuth.setCustomUserClaims(firebaseUid, {
              roles: ["user"],
              creativeRoles: [],
              status: "active",
            });
            console.log(`Updated claims for existing user: ${firebaseUid}`);
          } catch (error) {
            // User doesn't exist by email, continue with normal flow to create them
            console.log(
              `User ${email} not found by email, attempting to create with ID: ${uid}`
            );

            // Attempt to create the user in Firebase Auth if they don't exist yet
            try {
              await adminAuth.getUser(uid);
              console.log(
                `User ${email} with ID ${uid} already exists in Firebase Auth`
              );
            } catch (authError) {
              // User doesn't exist in Firebase Auth, create them
              try {
                // Create the user using our import endpoint that properly sets the provider
                const importResponse = await fetch(
                  `${process.env.NEXTAUTH_URL}/api/auth/import-google-user`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      uid: uid,
                      email: email,
                      displayName: user.name || email.split("@")[0],
                      photoURL: user.image || "",
                    }),
                  }
                );

                const importResult = await importResponse.json();

                if (!importResponse.ok) {
                  throw new Error(
                    importResult.error || "Failed to import user"
                  );
                }

                console.log(
                  `Successfully imported Firebase Auth user for ${email} with Google provider`
                );

                // Custom claims are set by the import endpoint
                console.log(`Claims already set by import endpoint`);
              } catch (createError) {
                console.error(
                  `Error creating Firebase Auth user for ${email}:`,
                  createError
                );
                // Don't fail the sign-in - we'll let the user in anyway
                // but log the error for debugging
              }
            }
          }

          // Check if this user already exists in Firestore
          const userDoc = await adminDb
            .collection("users")
            .doc(firebaseUid)
            .get();

          // First-time Google sign-in or missing Firestore document - create user in Firestore
          if (!userDoc.exists) {
            console.log(
              `Creating new user document for ${email} with ID: ${firebaseUid}`
            );

            // Create a user document in Firestore with standard user permissions
            await adminDb
              .collection("users")
              .doc(firebaseUid)
              .set({
                name: user.name || email.split("@")[0],
                email: email,
                image: user.image || "",
                roles: ["user"],
                creativeRoles: [],
                status: "active",
                accountType: "personal",
                createdAt: new Date(),
              });
          } else {
            // Existing user - only check if they're not suspended
            const userData = userDoc.data();
            if (userData?.status === "suspended") {
              console.log(`Sign-in attempt from suspended user: ${email}`);
              return false; // Prevent suspended users from signing in
            }
          }
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        // Still allow sign-in even if there was an error with Firestore
        // This prevents users from being locked out due to database issues
        return true;
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
  trustHost: true,
  basePath: "/api/auth",
};

export default authConfig;
