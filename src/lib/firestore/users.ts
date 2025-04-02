import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FirebaseError } from "firebase/app";

/**
 * User interface for Firestore User document
 */
export interface FirestoreUser {
  uid: string;
  email: string;
  name: string;
  roles: string[];
  creativeRoles: string[];
  status: "active" | "inactive" | "suspended";
  accountType?: string;
  photoURL?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
  lastSignInTime?: Date;
  mongoId?: string; // Original MongoDB ID (for reference during migration)
}

/**
 * User data with both Firestore and Auth information
 */
export interface UserWithAuth extends FirestoreUser {
  emailVerified: boolean;
  providerData: {
    providerId: string;
    uid: string;
  }[];
  disabled: boolean;
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

/**
 * Get user by UID from Firestore
 * @param uid User ID
 * @returns FirestoreUser data or null if not found
 */
export async function getUserById(uid: string): Promise<FirestoreUser | null> {
  try {
    const userDoc = await adminDb.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data()!;

    return {
      uid: userDoc.id,
      email: userData.email || "",
      name: userData.name || "",
      roles: userData.roles || ["user"],
      creativeRoles: userData.creativeRoles || [],
      status: userData.status || "active",
      accountType: userData.accountType,
      photoURL: userData.photoURL,
      bio: userData.bio,
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
      lastSignInTime: userData.lastSignInTime?.toDate(),
      mongoId: userData.mongoId,
    };
  } catch (error) {
    console.error("Error getting user by ID:", error);
    return null;
  }
}

/**
 * Get user by email from Firestore
 * @param email User email address
 * @returns FirestoreUser data or null if not found
 */
export async function getUserByEmail(
  email: string
): Promise<FirestoreUser | null> {
  try {
    const userSnapshot = await adminDb
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return null;
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    return {
      uid: userDoc.id,
      email: userData.email || "",
      name: userData.name || "",
      roles: userData.roles || ["user"],
      creativeRoles: userData.creativeRoles || [],
      status: userData.status || "active",
      accountType: userData.accountType,
      photoURL: userData.photoURL,
      bio: userData.bio,
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
      lastSignInTime: userData.lastSignInTime?.toDate(),
      mongoId: userData.mongoId,
    };
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
}

/**
 * Get user with both Firestore and Auth information
 * @param uid User ID
 * @returns UserWithAuth data or null if not found
 */
export async function getUserWithAuth(
  uid: string
): Promise<UserWithAuth | null> {
  try {
    // Get Firestore user data
    const firestoreUser = await getUserById(uid);

    if (!firestoreUser) {
      return null;
    }

    // Get Firebase Auth user data
    const authUser = await adminAuth.getUser(uid);

    // Combine data
    return {
      ...firestoreUser,
      emailVerified: authUser.emailVerified,
      providerData: authUser.providerData.map((provider) => ({
        providerId: provider.providerId,
        uid: provider.uid,
      })),
      disabled: authUser.disabled,
      metadata: {
        creationTime: authUser.metadata.creationTime,
        lastSignInTime: authUser.metadata.lastSignInTime,
      },
    };
  } catch (error) {
    console.error("Error getting user with auth:", error);
    return null;
  }
}

/**
 * Update user profile in Firestore
 * @param uid User ID
 * @param data User data to update
 * @returns Updated user data or null if update failed
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<FirestoreUser>
): Promise<FirestoreUser | null> {
  try {
    // Don't allow updating sensitive fields
    const { roles, creativeRoles, status, uid: _, ...updateData } = data;

    // Add updated timestamp
    const updates = {
      ...updateData,
      updatedAt: new Date(),
    };

    // Update Firestore
    await adminDb.collection("users").doc(uid).update(updates);

    // Get and return updated user
    return await getUserById(uid);
  } catch (error) {
    console.error("Error updating user profile:", error);
    return null;
  }
}

/**
 * Update user roles and permissions
 * @param uid User ID
 * @param roles Array of role names
 * @param creativeRoles Array of creative role names
 * @param status User status
 * @returns Updated user data or null if update failed
 */
export async function updateUserRoles(
  uid: string,
  roles: string[] = [],
  creativeRoles: string[] = [],
  status: "active" | "inactive" | "suspended" = "active"
): Promise<UserWithAuth | null> {
  try {
    // Update custom claims in Firebase Auth
    await adminAuth.setCustomUserClaims(uid, {
      roles,
      creativeRoles,
      status,
    });

    // Update in Firestore
    await adminDb.collection("users").doc(uid).update({
      roles,
      creativeRoles,
      status,
      updatedAt: new Date(),
    });

    // Get and return updated user
    return await getUserWithAuth(uid);
  } catch (error) {
    console.error("Error updating user roles:", error);
    return null;
  }
}

/**
 * List users with pagination
 * @param limit Maximum number of users to return
 * @param startAfter User ID to start after (for pagination)
 * @param filterBy Optional field to filter by
 * @param filterValue Optional value to filter for
 * @returns Array of FirestoreUser objects
 */
export async function listUsers(
  limit: number = 20,
  startAfter?: string,
  filterBy?: string,
  filterValue?: string
): Promise<{ users: FirestoreUser[]; lastId?: string }> {
  try {
    let query = adminDb.collection("users").orderBy("name");

    // Apply filter if provided
    if (filterBy && filterValue) {
      query = query.where(filterBy, "==", filterValue);
    }

    // Apply pagination starting point
    if (startAfter) {
      const startDoc = await adminDb.collection("users").doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    // Apply limit
    query = query.limit(limit);

    // Execute query
    const snapshot = await query.get();

    // Parse results
    const users: FirestoreUser[] = [];
    let lastId: string | undefined;

    snapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        email: data.email || "",
        name: data.name || "",
        roles: data.roles || ["user"],
        creativeRoles: data.creativeRoles || [],
        status: data.status || "active",
        accountType: data.accountType,
        photoURL: data.photoURL,
        bio: data.bio,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastSignInTime: data.lastSignInTime?.toDate(),
        mongoId: data.mongoId,
      });

      lastId = doc.id;
    });

    return {
      users,
      lastId: snapshot.size > 0 ? lastId : undefined,
    };
  } catch (error) {
    console.error("Error listing users:", error);
    return { users: [] };
  }
}
