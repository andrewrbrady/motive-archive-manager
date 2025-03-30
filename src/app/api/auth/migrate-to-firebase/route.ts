import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";

/**
 * API route to migrate users from MongoDB to Firebase
 * This should be restricted to admin users only
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || !session.user || !session.user.roles.includes("admin")) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Connect to MongoDB
    await dbConnect();

    // Get all users from MongoDB
    const users = await User.find({});

    // Migration stats
    const migrationResults = {
      total: users.length,
      success: 0,
      failed: 0,
      failedUsers: [] as string[],
    };

    // Process each user
    for (const user of users) {
      try {
        // Check if user already exists in Firebase
        try {
          const firebaseUser = await adminAuth.getUserByEmail(user.email);
          console.log(`User ${user.email} already exists in Firebase`);
          migrationResults.success++;
          continue;
        } catch (error) {
          // User doesn't exist, proceed with creation
        }

        // Create the user in Firebase Auth
        const firebaseUser = await adminAuth.createUser({
          email: user.email,
          password: user.password
            ? user.password
            : Math.random().toString(36).slice(-8), // Generate random password if none exists
          displayName: user.name,
          disabled: false,
        });

        // Set custom claims for roles
        await adminAuth.setCustomUserClaims(firebaseUser.uid, {
          roles: user.roles || ["user"],
        });

        // Store additional user data in Firestore
        await adminDb
          .collection("users")
          .doc(firebaseUser.uid)
          .set({
            name: user.name,
            email: user.email,
            roles: user.roles || ["user"],
            createdAt: user.created_at || new Date(),
            lastLoginAt: user.last_login || new Date(),
            // Add other custom fields as needed
          });

        migrationResults.success++;
      } catch (error) {
        console.error(`Error migrating user ${user.email}:`, error);
        migrationResults.failed++;
        migrationResults.failedUsers.push(user.email);
      }
    }

    return NextResponse.json({
      message: "Migration completed",
      stats: migrationResults,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Failed to migrate users" },
      { status: 500 }
    );
  }
}
