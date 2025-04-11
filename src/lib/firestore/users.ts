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
  image?: string;
  profileImage?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
  lastSignInTime?: Date;
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
    console.log(`Looking up user with ID: ${uid}`);

    const userDoc = await adminDb.collection("users").doc(uid).get();

    if (userDoc.exists) {
      console.log(`Found user with UID: ${uid}`);
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
        image: userData.image,
        profileImage: userData.profileImage,
        bio: userData.bio,
        createdAt: userData.createdAt?.toDate() || new Date(),
        updatedAt: userData.updatedAt?.toDate() || new Date(),
        lastSignInTime: userData.lastSignInTime?.toDate(),
      };
    }

    console.log(`No user found with ID: ${uid}`);
    return null;
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
      image: userData.image,
      profileImage: userData.profileImage,
      bio: userData.bio,
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
      lastSignInTime: userData.lastSignInTime?.toDate(),
    };
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
}

/**
 * List users from Firestore with optional filtering and pagination
 * @param limit Maximum number of users to return
 * @param startAfter Document to start after for pagination
 * @returns Object containing users array and last document for pagination
 */
export async function listUsers(
  limit: number = 20,
  startAfter?: any
): Promise<{ users: FirestoreUser[]; lastDoc: any }> {
  try {
    console.log("Listing users from Firestore");

    // Build query
    let query = adminDb.collection("users").orderBy("name", "asc");

    // Apply pagination if startAfter is provided
    if (startAfter) {
      query = query.startAfter(startAfter);
    }

    // Apply limit
    query = query.limit(limit);

    // Execute query
    const snapshot = await query.get();

    // Convert to FirestoreUser array
    const users: FirestoreUser[] = [];
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
        image: data.image,
        profileImage: data.profileImage,
        bio: data.bio,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastSignInTime: data.lastSignInTime?.toDate(),
      });
    });

    console.log(`Found ${users.length} users`);

    return {
      users,
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
    };
  } catch (error) {
    console.error("Error listing users:", error);
    return { users: [], lastDoc: null };
  }
}

/**
 * Update a user's Firestore document
 * @param uid User ID
 * @param data Data to update
 * @returns Updated user data or null if update fails
 */
export async function updateUser(
  uid: string,
  data: Partial<FirestoreUser>
): Promise<FirestoreUser | null> {
  try {
    const userRef = adminDb.collection("users").doc(uid);

    // Update the document
    await userRef.update({
      ...data,
      updatedAt: new Date(),
    });

    // Get the updated document
    const updatedDoc = await userRef.get();
    if (!updatedDoc.exists) {
      return null;
    }

    const userData = updatedDoc.data()!;
    return {
      uid: updatedDoc.id,
      email: userData.email || "",
      name: userData.name || "",
      roles: userData.roles || ["user"],
      creativeRoles: userData.creativeRoles || [],
      status: userData.status || "active",
      accountType: userData.accountType,
      photoURL: userData.photoURL,
      image: userData.image,
      profileImage: userData.profileImage,
      bio: userData.bio,
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
      lastSignInTime: userData.lastSignInTime?.toDate(),
    };
  } catch (error) {
    console.error("Error updating user:", error);
    return null;
  }
}
