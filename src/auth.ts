import NextAuth from "next-auth";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import authConfig from "@/auth.config";
import { adminAuth } from "@/lib/firebase-admin";

// Extend authConfig with additional callbacks
const extendedAuthConfig = {
  ...authConfig,
  callbacks: {
    async session({ session, token }: { session: any; token: JWT }) {
      // Add error handling for undefined token or session
      if (!session || !session.user) {
        console.error(
          "Session or session.user is undefined in session callback"
        );
        return session;
      }

      // Pass Firebase custom claims from token to session
      if (token) {
        session.user.id = token.sub as string;
        session.user.roles = token.roles || [];
        session.user.creativeRoles = token.creativeRoles || [];
        session.user.status = token.status || "active";
      } else {
        console.warn("Token is undefined in session callback, using defaults");
        // Set default values
        session.user.roles = ["user"];
        session.user.creativeRoles = [];
        session.user.status = "active";
      }
      return session;
    },
    async jwt({
      token,
      user,
      account,
      profile,
      trigger,
      session,
    }: {
      token: JWT;
      user?: any;
      account?: any;
      profile?: any;
      trigger?: string;
      session?: any;
    }) {
      // Add error handling for undefined token
      if (!token) {
        console.error("Token is undefined in jwt callback");
        return {
          sub: "",
          roles: ["user"],
          creativeRoles: [],
          status: "active",
        } as JWT;
      }

      // If signing in
      if (account && user) {
        // If Firebase account
        if (account.provider === "firebase") {
          try {
            // Get Firebase custom claims
            const firebaseUser = await adminAuth.getUser(user.id);
            const claims = firebaseUser.customClaims || {};

            // Add claims to token
            token.roles = claims.roles || [];
            token.creativeRoles = claims.creativeRoles || [];
            token.status = claims.status || "active";

            console.log("Added Firebase claims to token:", {
              userId: user.id,
              roles: token.roles,
              creativeRoles: token.creativeRoles,
            });
          } catch (error) {
            console.error("Error getting Firebase custom claims:", error);
          }
        }
      }

      // Check for session update (after updating user in Firestore)
      if (trigger === "update" && session?.user) {
        // Update token with session data
        token.roles = session.user.roles;
        token.creativeRoles = session.user.creativeRoles;
        token.status = session.user.status;
      }

      return token;
    },
  },
};

// Create and export NextAuth instance
export const { auth, handlers } = NextAuth(extendedAuthConfig);

// Direct export for compatibility with App Router
export default auth;
