import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDatabase } from "@/lib/mongodb";
import { User, IUser } from "@/models/User";
import { dbConnect } from "@/lib/mongodb";
import { JWT } from "next-auth/jwt";

// Ensure the secret is defined
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("Please provide NEXTAUTH_SECRET environment variable");
}

// Type declaration for custom session and JWT
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roles: string[];
      permissions: string[];
      image?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roles: string[];
    permissions: string[];
  }
}

// Define auth options
const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Ensure database connection
          await dbConnect();

          // Find user by email and explicitly include password for comparison
          const user = (await User.findOne({
            email: credentials.email.toString().toLowerCase(),
          }).select("+password")) as IUser | null;

          if (!user) {
            return null;
          }

          // Check if the user has a password set
          if (!user.password) {
            console.error("User found but no password is set");
            return null;
          }

          // Verify password
          const isValid = await user.comparePassword(
            credentials.password.toString()
          );

          if (!isValid) {
            console.error("Invalid password");
            return null;
          }

          // Update last login time
          user.last_login = new Date();
          await user.save();

          // Return user data excluding sensitive information
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            roles: user.roles,
            permissions: user.permissions,
            image: user.profile?.avatar_url,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: any }) {
      // Include user roles and permissions in the JWT token
      if (user) {
        token.id = user.id;
        token.roles = user.roles;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      // Add user roles and permissions to the session
      if (session.user) {
        session.user.id = token.id;
        session.user.roles = token.roles;
        session.user.permissions = token.permissions;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin", // Custom sign-in page
    error: "/auth/error", // Error page
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
