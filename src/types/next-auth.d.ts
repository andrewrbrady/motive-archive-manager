// src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    roles?: string[];
    creativeRoles?: string[];
    status?: string;
    accountType?: string;
    profileImage?: string;
    bio?: string;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      roles: string[];
      creativeRoles: string[];
      status: string;
      accountType?: string;
      profileImage?: string;
      bio?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    roles?: string[];
    creativeRoles?: string[];
    status?: string;
    accountType?: string;
    profileImage?: string;
    bio?: string;
  }
}
