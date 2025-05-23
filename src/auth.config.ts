import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";
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
console.log("- VERCEL_URL:", process.env.VERCEL_URL || "Not set");
console.log("- VERCEL_ENV:", process.env.VERCEL_ENV || "Not set");
console.log("- NODE_ENV:", process.env.NODE_ENV || "Not set");

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
  ],
  session: {
    // Use JWT-based sessions for better compatibility with Edge runtime
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    signOut: "/auth/signout",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allow relative callback URLs within the same origin
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        return url;
      }

      // Default to dashboard for external URLs or when no URL provided
      return `${baseUrl}/dashboard`;
    },
    async jwt({ token, user, account, trigger, session }) {
      console.log("JWT callback - input data:", {
        hasToken: !!token,
        hasUser: !!user,
        hasAccount: !!account,
        trigger,
        tokenData: token,
        userData: user,
        accountData: account,
        sessionData: session,
      });

      // Initial sign in
      if (account && user) {
        // For Google sign-in, we need to get the Firebase user by email
        if (account.provider === "google") {
          try {
            const firebaseUser = await adminAuth.getUserByEmail(user.email!);
            console.log("Found Firebase user for Google sign-in:", {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
            });

            // Set the Firebase UID in the token
            token.firebase_uid = firebaseUser.uid;

            // Get and set custom claims
            const claims = firebaseUser.customClaims || {};
            token.roles = claims.roles || ["user"];
            token.creativeRoles = claims.creativeRoles || [];
            token.status = claims.status || "active";

            console.log("Updated token with Firebase data:", {
              firebase_uid: token.firebase_uid,
              roles: token.roles,
              creativeRoles: token.creativeRoles,
              status: token.status,
            });
          } catch (error) {
            console.error(
              "Error getting Firebase user in JWT callback:",
              error
            );
            // Set default values
            token.roles = ["user"];
            token.creativeRoles = [];
            token.status = "active";
          }
        }
      }

      // Session update
      if (trigger === "update" && session) {
        if (
          session.refreshClaims === true &&
          token.firebase_uid &&
          typeof token.firebase_uid === "string"
        ) {
          try {
            const firebaseUser = await adminAuth.getUser(token.firebase_uid);
            const claims = firebaseUser.customClaims || {};

            token.roles = claims.roles || ["user"];
            token.creativeRoles = claims.creativeRoles || [];
            token.status = claims.status || "active";

            console.log("Refreshed claims in token:", {
              firebase_uid: token.firebase_uid,
              roles: token.roles,
              creativeRoles: token.creativeRoles,
            });
          } catch (error) {
            console.error("Error refreshing Firebase claims:", error);
          }
        } else if (session.roles || session.creativeRoles || session.status) {
          if (session.roles) token.roles = session.roles;
          if (session.creativeRoles)
            token.creativeRoles = session.creativeRoles;
          if (session.status) token.status = session.status;
        }
      }

      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      // Add error handling for undefined token or session
      if (!session || !session.user) {
        console.error(
          "Session or session.user is undefined in session callback",
          JSON.stringify({ session, token })
        );
        return session;
      }

      console.log("Session callback - input data:", {
        hasSession: !!session,
        hasToken: !!token,
        tokenData: token,
        sessionData: session,
      });

      // Pass Firebase custom claims from token to session
      if (token) {
        // Use the firebase_uid from token
        session.user.id = token.firebase_uid || token.sub;
        session.user.roles = token.roles || ["user"];
        session.user.creativeRoles = token.creativeRoles || [];
        session.user.status = token.status || "active";

        console.log("Session callback - updated session:", {
          userId: session.user.id,
          roles: session.user.roles,
          creativeRoles: session.user.creativeRoles,
          status: session.user.status,
        });
      } else {
        console.warn("Token is undefined in session callback, using defaults", {
          session,
          token,
        });
        // Set default values
        session.user.roles = ["user"];
        session.user.creativeRoles = [];
        session.user.status = "active";
      }

      return session;
    },
    async signIn({ user, account }) {
      try {
        // Only process OAuth sign-ins (like Google)
        if (account?.provider === "google") {
          const email = user.email;

          if (!email) {
            console.error("No email provided for Google sign-in");
            return false;
          }

          console.log(`🔍 Processing Google sign-in for email: ${email}`);

          // First try to find existing user by email
          try {
            const existingUser = await adminAuth.getUserByEmail(email);
            console.log(
              `✅ Found existing Firebase user with email ${email}:`,
              {
                uid: existingUser.uid,
                providerData: existingUser.providerData,
              }
            );

            // Update custom claims if needed
            const claims = existingUser.customClaims || {};
            if (!claims.roles) {
              await adminAuth.setCustomUserClaims(existingUser.uid, {
                roles: ["user"],
                creativeRoles: [],
                status: "active",
              });
              console.log(
                `🔧 Updated claims for existing user: ${existingUser.uid}`
              );
            }

            // Ensure Firestore document exists
            const userDoc = await adminDb
              .collection("users")
              .doc(existingUser.uid)
              .get();
            if (!userDoc.exists) {
              await adminDb
                .collection("users")
                .doc(existingUser.uid)
                .set({
                  uid: existingUser.uid,
                  name: user.name || email.split("@")[0],
                  email: email,
                  image: user.image || "",
                  photoURL: user.image || "",
                  roles: claims.roles || ["user"],
                  creativeRoles: claims.creativeRoles || [],
                  status: claims.status || "active",
                  accountType: "personal",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              console.log(
                `📄 Created Firestore document for existing user: ${existingUser.uid}`
              );
            }

            return true;
          } catch (error: any) {
            console.log(
              `❌ Firebase Auth error for ${email}:`,
              error.code,
              error.message
            );
            console.log(`Full error details:`, {
              code: error.code,
              message: error.message,
              stack: error.stack,
            });

            // User doesn't exist in Firebase Auth
            if (error.code === "auth/user-not-found") {
              console.log(`🆕 Creating new Firebase user for email: ${email}`);

              // Check if this user was invited
              const inviteDocId = `invited_${email.replace(/[.@]/g, "_")}`;
              const inviteDoc = await adminDb
                .collection("invited_users")
                .doc(inviteDocId)
                .get();

              let userData = {
                name: user.name || email.split("@")[0],
                roles: ["user"] as string[],
                creativeRoles: [] as string[],
                status: "active",
                accountType: "personal",
              };

              // If user was invited, use the invitation data
              if (inviteDoc.exists) {
                const inviteData = inviteDoc.data()!;
                userData = {
                  name: inviteData.name || user.name || email.split("@")[0],
                  roles: inviteData.roles || ["user"],
                  creativeRoles: inviteData.creativeRoles || [],
                  status: "active", // Change from 'invited' to 'active'
                  accountType: inviteData.accountType || "personal",
                };
                console.log(
                  `📧 Found invitation for ${email}, using invited data:`,
                  userData
                );
              } else {
                console.log(
                  `📧 No invitation found for ${email}, using default user data`
                );
              }

              try {
                // Create new Firebase Auth user
                const createUserData: any = {
                  email: email,
                  emailVerified: true,
                  displayName: userData.name,
                  disabled: false,
                };

                // Only include photoURL if we have a valid image URL
                if (user.image && user.image.trim() !== "") {
                  createUserData.photoURL = user.image;
                }

                const newUser = await adminAuth.createUser(createUserData);
                console.log(
                  `🔥 Created new Firebase Auth user: ${newUser.uid}`
                );

                // Set custom claims
                await adminAuth.setCustomUserClaims(newUser.uid, {
                  roles: userData.roles,
                  creativeRoles: userData.creativeRoles,
                  status: userData.status,
                });
                console.log(`🎫 Set custom claims for: ${newUser.uid}`);

                // Create Firestore document
                await adminDb
                  .collection("users")
                  .doc(newUser.uid)
                  .set({
                    uid: newUser.uid,
                    name: userData.name,
                    email: email,
                    image: user.image || "",
                    photoURL: user.image || "",
                    roles: userData.roles,
                    creativeRoles: userData.creativeRoles,
                    status: userData.status,
                    accountType: userData.accountType,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  });
                console.log(
                  `📄 Created Firestore document for: ${newUser.uid}`
                );

                // Clean up invitation document if it existed
                if (inviteDoc.exists) {
                  await adminDb
                    .collection("invited_users")
                    .doc(inviteDocId)
                    .delete();
                  console.log(`🧹 Cleaned up invitation document for ${email}`);
                }

                console.log(`✅ Successfully created new user: ${newUser.uid}`);
                return true;
              } catch (createError: any) {
                console.error(
                  `❌ CRITICAL: Failed to create new user for ${email}:`
                );
                console.error(`Error code: ${createError.code}`);
                console.error(`Error message: ${createError.message}`);
                console.error(`Full error:`, createError);
                console.error(`Stack trace:`, createError.stack);

                // Temporarily allow sign-in even if user creation fails (for debugging)
                // This ensures we can see the detailed error logs
                return true;
              }
            } else {
              // For any other Firebase Auth error, log it but allow sign in
              console.error(
                `❌ Other Firebase Auth error for ${email}:`,
                error.code,
                error.message
              );
              return true;
            }
          }
        }

        // For non-Google providers
        console.log(`🔍 Non-Google provider sign-in: ${account?.provider}`);
        return true;
      } catch (error) {
        console.error(`❌ Critical error in signIn callback:`, error);
        // Still allow sign-in even if there was an error
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
