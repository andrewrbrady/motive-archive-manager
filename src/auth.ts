import NextAuth, {
  type DefaultSession,
  type User as NextAuthUser,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { auth as firebaseAuth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

// Dynamic URL detection for various environments
const getBaseUrl = () => {
  // Check for VERCEL_URL environment variable (Vercel deployments)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Check for explicit AUTH_URL or NEXTAUTH_URL
  if (process.env.AUTH_URL) {
    return process.env.AUTH_URL;
  }

  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  // Default to localhost for development
  return "http://localhost:3000";
};

// Extend the built-in NextAuth User type to include our custom properties
interface CustomUser extends NextAuthUser {
  id?: string;
  email: string;
  name?: string;
  roles?: string[];
  sub?: string; // OAuth providers use 'sub' instead of 'id'
}

// Extend the session user type to include our custom properties
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: string[];
    } & DefaultSession["user"];
  }
}

/**
 * NextAuth v5 configuration
 * Using Firebase Authentication
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true, // Enable NextAuth debug mode
  // Trust the host header from Vercel to handle dynamic URLs
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          // Type-safe credentials check
          const email = (credentials?.email as string) || "";
          const password = (credentials?.password as string) || "";

          if (!email || !password) {
            return null;
          }

          // Sign in with Firebase Authentication
          const userCredential = await signInWithEmailAndPassword(
            firebaseAuth,
            email,
            password
          );

          const user = userCredential.user;

          if (!user) {
            return null;
          }

          // Return user information with default role
          return {
            id: user.uid,
            email: user.email || email,
            name: user.displayName || email.split("@")[0],
            roles: ["user"], // Default role
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      console.log("JWT Callback - User:", user ? "exists" : "undefined");
      console.log(
        "JWT Callback - Account:",
        account ? account.provider : "undefined"
      );

      // Add custom user data to the JWT token
      if (user) {
        const customUser = user as CustomUser;
        token.id = customUser.id || customUser.sub || "";
        token.roles = customUser.roles || ["user"];
      }
      return token;
    },
    async session({ session, token }) {
      console.log(
        "Session Callback - Session user:",
        session.user ? "exists" : "undefined"
      );
      console.log("Session Callback - Token:", token.id);

      // Add custom user data to the session
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.roles = (token.roles as string[]) || ["user"];
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      console.log("SignIn Callback - Provider:", account?.provider);
      console.log("SignIn Callback - User:", user ? user.email : "undefined");

      if (account?.provider === "google") {
        // Always allow Google sign-ins
        return true;
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      console.log("Redirect Callback - URL:", url);
      console.log("Redirect Callback - BaseUrl:", baseUrl);

      // If the URL is relative, prepend the base URL
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // If the URL is already absolute but on the same site
      else if (new URL(url).origin === baseUrl) {
        return url;
      }
      // Default to admin dashboard
      return `${baseUrl}/admin`;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});
