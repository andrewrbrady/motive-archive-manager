import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    signOut: "/auth/signout",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id || "";
        token.roles = user.roles || ["user"];
        token.creativeRoles = user.creativeRoles || [];
        token.status = user.status || "active";
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.roles = (token.roles as string[]) || ["user"];
        session.user.creativeRoles = (token.creativeRoles as string[]) || [];
        session.user.status = (token.status as string) || "active";
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
  trustHost: true,
};

export default authConfig;
