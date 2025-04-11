/**
 * Firebase types for use throughout the application
 * Re-exports from firestore/users to prevent build issues
 */

import { UserWithAuth } from "@/lib/firestore/users";

/**
 * User interface for Firestore User document
 * This aligns with the structure in src/lib/firestore/users.ts
 */
export interface FirestoreUser {
  uid: string; // Primary identifier in Firebase
  email: string;
  name: string;
  image?: string; // For NextAuth compatibility
  profileImage?: string; // Custom profile image URL
  photoURL?: string; // From Firebase Auth
  creativeRoles: string[];
  roles: string[];
  status: string; // "active", "inactive", "suspended"
  bio?: string;
  accountType?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastSignInTime?: Date;

  // Deprecated MongoDB fields - will be removed in future
  /** @deprecated Use uid instead */
  _id?: string;
  /** @deprecated Use name instead */
  displayName?: string;
  /** @deprecated Stored in mongoId field in Firestore */
  mongoId?: string;
}

export type { UserWithAuth };
