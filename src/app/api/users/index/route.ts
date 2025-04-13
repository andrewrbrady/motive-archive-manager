import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/firebase-auth-middleware";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FirestoreUser } from "@/types/firebase";
import { auth } from "@/auth";
import { getToken } from "next-auth/jwt";

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
 * This is a simplified endpoint without pagination for backwards compatibility
 */
async function getUsers(request: NextRequest) {
  try {
    // Get session and log detailed information
    const session = await auth();
    console.log("Session data in API route:", {
      sessionExists: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      roles: session?.user?.roles,
      allUserData: session?.user,
      rawSession: session,
    });

    // Check if user has admin role
    if (!session?.user?.roles?.includes("admin")) {
      console.log("Access denied: User does not have admin role in any system");
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Get users from Firestore
    const usersSnapshot = await adminDb.collection("users").get();
    const users = usersSnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * CREATE a new user in Firebase Auth and Firestore
 */
async function createUser(
  request: NextRequest
): Promise<NextResponse<CreateUserResponse | ErrorResponse>> {
  try {
    // Verify the user is authenticated and has admin privileges
    const session = await auth();
    console.log("Session for createUser:", {
      sessionExists: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      roles: session?.user?.roles,
    });

    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Default password if not provided for new users
    const password =
      data.password ||
      Math.random().toString(36).slice(-12) +
        Math.random().toString(36).slice(-12);

    console.log(`Creating new user with email: ${data.email}`);

    // Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: password,
      displayName: data.name,
      disabled: false,
    });

    console.log(`Created user in Firebase Auth with UID: ${userRecord.uid}`);

    // Set default values
    const now = new Date();
    const roles = data.roles || ["viewer"];
    const creativeRoles = data.creativeRoles || [];
    const status = data.status || "active";

    // Set custom claims for user
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      roles,
      creativeRoles,
      status,
    });

    console.log(`Set custom claims for user: ${userRecord.uid}`);

    // Create user document in Firestore
    const userData = {
      uid: userRecord.uid,
      email: data.email,
      name: data.name,
      roles,
      creativeRoles,
      status,
      accountType: data.accountType || "personal",
      photoURL: data.photoURL || null,
      bio: data.bio || null,
      createdAt: now,
      updatedAt: now,
    };

    await adminDb.collection("users").doc(userRecord.uid).set(userData);

    console.log(`Created user document in Firestore for: ${userRecord.uid}`);

    return NextResponse.json({
      ...userData,
      message: "User created successfully",
    } as CreateUserResponse);
  } catch (error: any) {
    console.error("Error creating user:", error);

    // Handle Firebase Auth errors
    if (error.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}

// Export the handlers directly, we'll use NextAuth session for authentication
export { getUsers as GET, createUser as POST };
