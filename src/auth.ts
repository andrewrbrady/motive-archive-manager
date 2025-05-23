import NextAuth from "next-auth";
import type { Session, User, Account, Profile } from "next-auth";
import type { JWT } from "next-auth/jwt";
import authConfig from "@/auth.config";
import { adminAuth } from "@/lib/firebase-admin";

// Cache for Firebase claims to prevent excessive calls
const claimsCache = new Map<string, { claims: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper to get Firebase claims with caching
async function getFirebaseClaims(userId: string) {
  const now = Date.now();
  const cached = claimsCache.get(userId);

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.claims;
  }

  try {
    const firebaseUser = await adminAuth.getUser(userId);
    const claims = firebaseUser.customClaims || {};
    claimsCache.set(userId, { claims, timestamp: now });
    return claims;
  } catch (error) {
    console.error("Error fetching Firebase claims:", error);
    return null;
  }
}

// Extend authConfig with additional callbacks
const extendedAuthConfig = {
  ...authConfig,
  callbacks: {
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }): Promise<Session> {
      if (!session?.user) {
        console.error("Invalid session state:", { session, token });
        return session;
      }

      try {
        // Ensure consistent user ID
        const userId = (token.firebase_uid as string | undefined) || token.sub;
        if (!userId) {
          throw new Error("No valid user ID found in token");
        }
        session.user.id = userId;

        // Get latest claims if available
        const claims = await getFirebaseClaims(userId);
        if (claims) {
          session.user.roles = claims.roles || ["user"];
          session.user.creativeRoles = claims.creativeRoles || [];
          session.user.status = claims.status || "active";
        } else {
          // Fallback to token data if claims fetch fails
          session.user.roles = (token.roles as string[]) || ["user"];
          session.user.creativeRoles = (token.creativeRoles as string[]) || [];
          session.user.status = (token.status as string) || "active";
        }

        if (process.env.NODE_ENV !== "production") {
          console.log("Session updated with latest claims:", {
            hasUserId: !!session.user.id,
            rolesCount: session.user.roles?.length || 0,
            status: session.user.status,
          });
        }
      } catch (error) {
        console.error("Error updating session:", error);
        // Ensure session has minimum required data
        session.user.roles = session.user.roles || ["user"];
        session.user.creativeRoles = session.user.creativeRoles || [];
        session.user.status = session.user.status || "active";
      }

      return session;
    },

    async jwt({
      token,
      user,
      account,
      trigger,
    }: {
      token: JWT;
      user?: User;
      account?: Account | null;
      trigger?: "signIn" | "signUp" | "update";
    }): Promise<JWT> {
      try {
        // Initial sign in
        if (account && user) {
          if (account.provider === "credentials" && user.id) {
            token.firebase_uid = user.id;
            const claims = await getFirebaseClaims(user.id);
            if (claims) {
              token.roles = claims.roles;
              token.creativeRoles = claims.creativeRoles;
              token.status = claims.status;
            }
          } else if (account.provider === "google" && user.email) {
            // For Google sign-in, we need to get the Firebase user
            try {
              const firebaseUser = await adminAuth.getUserByEmail(user.email);
              token.firebase_uid = firebaseUser.uid;
              const claims = await getFirebaseClaims(firebaseUser.uid);
              if (claims) {
                token.roles = claims.roles;
                token.creativeRoles = claims.creativeRoles;
                token.status = claims.status;
              }
            } catch (error) {
              console.error("Error getting Firebase user:", error);
              // Set default values
              token.roles = ["user"];
              token.creativeRoles = [];
              token.status = "active";
            }
          }
        }

        // Token refresh - update claims if needed
        if (trigger === "update" && token.firebase_uid) {
          const firebaseUid = token.firebase_uid as string;
          const claims = await getFirebaseClaims(firebaseUid);
          if (claims) {
            token.roles = claims.roles;
            token.creativeRoles = claims.creativeRoles;
            token.status = claims.status;
          }
        }

        return token;
      } catch (error) {
        console.error("Error in JWT callback:", error);
        // Ensure token has minimum required data
        return {
          ...token,
          roles: token.roles || ["user"],
          creativeRoles: token.creativeRoles || [],
          status: token.status || "active",
        };
      }
    },
  },
};

export const { auth, handlers } = NextAuth(extendedAuthConfig);

// Direct export for compatibility with App Router
export default auth;
