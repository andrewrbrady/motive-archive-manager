import { NextRequest } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-auth-middleware";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

interface User {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  roles: string[];
  creativeRoles: string[];
  status: string;
}

interface Session {
  user: User;
}

/**
 * Simplified auth function for compatibility with existing API routes
 * Returns null since these routes should use Firebase Auth middleware instead
 */
export async function auth(): Promise<Session | null> {
  // For now, return null to prevent build errors
  // These routes should be converted to use withFirebaseAuth middleware
  return null;
}

// Export handlers for compatibility
export const handlers = {
  GET: () =>
    new Response("Use Firebase Auth middleware instead", { status: 501 }),
  POST: () =>
    new Response("Use Firebase Auth middleware instead", { status: 501 }),
};
