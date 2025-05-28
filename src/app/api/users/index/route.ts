import { NextRequest, NextResponse } from "next/server";
import {
  withFirebaseAuth,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FirestoreUser } from "@/types/firebase";

// Response types
type ErrorResponse = {
  error: string;
};

type CreateUserResponse = {
  uid: string;
  email: string;
  name: string;
  roles: string[];
  creativeRoles: string[];
  status: string;
  accountType: string;
  photoURL: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
  message: string;
};

/**
 * GET all users from Firestore
 * Returns paginated results with format expected by frontend
 */
async function getUsers(request: NextRequest): Promise<NextResponse<object>> {
  try {
    // Authentication and authorization is handled by withFirebaseAuth wrapper

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const startAfter = searchParams.get("startAfter");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Build query
    let query = adminDb.collection("users").orderBy("createdAt", "desc");

    // Apply pagination if startAfter is provided
    if (startAfter) {
      const startAfterDoc = await adminDb
        .collection("users")
        .doc(startAfter)
        .get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    // Limit the results
    query = query.limit(limit + 1); // Get one extra to check if there are more

    // Execute query
    const usersSnapshot = await query.get();
    const allUsers = usersSnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    // Check if there are more results
    const hasMore = allUsers.length > limit;
    const users = hasMore ? allUsers.slice(0, limit) : allUsers;
    const lastId = users.length > 0 ? users[users.length - 1].uid : undefined;

    // Return in the format expected by frontend
    return NextResponse.json({
      users,
      hasMore,
      lastId,
      total: users.length,
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * CREATE/INVITE a user for Google OAuth authentication
 * Since we only use Google OAuth, this endpoint manages user invitations and roles
 */
async function inviteUser(request: NextRequest): Promise<NextResponse<object>> {
  try {
    // Authentication and authorization is handled by withFirebaseAuth wrapper

    const data = await request.json();

    // Validate required fields
    if (!data.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if user already exists in Firebase Auth
    try {
      const existingUser = await adminAuth.getUserByEmail(data.email);

      // User exists - update their roles/status
      const now = new Date();
      const roles = data.roles || ["user"];
      const creativeRoles = data.creativeRoles || [];
      const status = data.status || "active";

      // Update custom claims
      await adminAuth.setCustomUserClaims(existingUser.uid, {
        roles,
        creativeRoles,
        status,
      });

      // Update Firestore document
      const userData = {
        uid: existingUser.uid,
        email: data.email,
        name: data.name || existingUser.displayName || data.email.split("@")[0],
        roles,
        creativeRoles,
        status,
        accountType: data.accountType || "personal",
        photoURL: existingUser.photoURL || null,
        image: existingUser.photoURL || null,
        bio: data.bio || null,
        updatedAt: now,
      };

      await adminDb.collection("users").doc(existingUser.uid).update(userData);

      return NextResponse.json({
        ...userData,
        message: "User updated successfully",
        type: "updated",
      });
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        // User doesn't exist - create placeholder record for invitation
        const now = new Date();
        const roles = data.roles || ["user"];
        const creativeRoles = data.creativeRoles || [];
        const status = "invited"; // Special status for invited users

        // Create a placeholder document in Firestore with invited status
        // The actual Firebase Auth user will be created when they sign in with Google
        const invitedUserData = {
          email: data.email,
          name: data.name || data.email.split("@")[0],
          roles,
          creativeRoles,
          status,
          accountType: data.accountType || "personal",
          photoURL: null,
          image: null,
          bio: data.bio || null,
          createdAt: now,
          updatedAt: now,
          invitedBy: "admin", // Since auth is handled by wrapper, we know it's an admin
        };

        // Use email as document ID for invited users (will be replaced when they sign up)
        const docId = data.email.replace(/[.#$[\]]/g, "_");
        await adminDb.collection("users").doc(docId).set(invitedUserData);

        return NextResponse.json({
          ...invitedUserData,
          uid: docId,
          message: "User invitation created successfully",
          type: "invited",
        });
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error("Error creating/inviting user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create/invite user" },
      { status: 500 }
    );
  }
}

// Export the wrapped functions
export const GET = withFirebaseAuth(getUsers, ["admin"]);
export const POST = withFirebaseAuth(inviteUser, ["admin"]);
