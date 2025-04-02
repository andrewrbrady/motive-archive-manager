import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

/**
 * Emergency endpoint to grant admin privileges to the specified user
 * This bypasses normal authorization checks
 * REMOVE THIS ENDPOINT AFTER USE
 */
export async function GET(request: Request) {
  try {
    // Check for specific user IDs (from your Google accounts)
    // This will work for both of your Google accounts based on your logs
    const users = [
      {
        uid: "G46fdpqaufe7bmhluKAhakVM44e2", // andrew@andrewrbrady.com
        email: "andrew@andrewrbrady.com",
      },
      {
        uid: "115667720852671300123", // andrewbradyonline@gmail.com
        email: "andrewbradyonline@gmail.com",
      },
    ];

    const results = [];

    for (const user of users) {
      try {
        // 1. Set admin claims in Firebase Auth
        await adminAuth.setCustomUserClaims(user.uid, {
          roles: ["user", "admin"],
          creativeRoles: [],
          status: "active",
        });

        // 2. Update document in Firestore
        await adminDb
          .collection("users")
          .doc(user.uid)
          .set(
            {
              roles: ["user", "admin"],
              updatedAt: new Date(),
            },
            { merge: true }
          );

        results.push({
          uid: user.uid,
          email: user.email,
          success: true,
          message: "Admin privileges granted",
        });
      } catch (error: any) {
        console.error(`Error granting admin to ${user.email}:`, error);
        results.push({
          uid: user.uid,
          email: user.email,
          success: false,
          error: error.message,
        });
      }
    }

    // Log successful results for verification
    const successful = results.filter((r) => r.success);
    console.log(`Successfully granted admin to ${successful.length} accounts`);

    return NextResponse.json({
      success: true,
      message: "Admin privileges operation completed",
      results,
    });
  } catch (error: any) {
    console.error("Error in grant-admin endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Failed to grant admin privileges" },
      { status: 500 }
    );
  }
}
