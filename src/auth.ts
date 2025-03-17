import NextAuth, { type DefaultSession, User as DefaultUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { User } from "@/models/User";
import { dbConnect } from "@/lib/mongodb";

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
interface CustomUser extends DefaultUser {
  roles?: string[];
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
 * This file is required for NextAuth v5 beta
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
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
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          await dbConnect();

          const user = await User.findOne({
            email: String(credentials.email).toLowerCase(),
          }).select("+password");

          if (!user || !user.password) {
            return null;
          }

          const isValid = await user.comparePassword(
            String(credentials.password)
          );
          if (!isValid) {
            return null;
          }

          // Update last login time
          try {
            await User.updateOne(
              { _id: user._id },
              { $set: { last_login: new Date() } },
              { writeConcern: { w: "majority" } }
            );
          } catch (error) {
            console.error("Failed to update last login time:", error);
            // Continue even if this fails
          }

          // Return user information
          return {
            id: String(user._id),
            email: user.email,
            name: user.name,
            roles: user.roles,
          };
        } catch (error) {
          console.error("Auth error:", error);
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
    async jwt({ token, user }) {
      // Add custom user data to the JWT token
      if (user) {
        token.id = user.id;
        token.roles = (user as CustomUser).roles || [];
      }
      return token;
    },
    async session({ session, token }) {
      // Add custom user data to the session
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.roles = (token.roles as string[]) || [];
      }
      return session;
    },
  },
});
