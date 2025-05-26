import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { adminDb } from "@/lib/firebase-admin";

/**
 * GET users for project team management
 * More relaxed permissions than admin users endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("Fetching users for project team management...");

    // Allow any authenticated user to fetch users for project management
    // (they can only see basic info like name and email)

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    let users: any[] = [];

    try {
      // First try to get active users
      console.log("Trying to fetch active users...");
      const activeQuery = adminDb
        .collection("users")
        .where("status", "==", "active")
        .limit(limit);

      const activeSnapshot = await activeQuery.get();
      console.log(`Found ${activeSnapshot.docs.length} active users`);

      if (activeSnapshot.docs.length > 0) {
        users = activeSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            uid: doc.id,
            name: data.name || data.email,
            email: data.email,
            image: data.image || data.photoURL,
            status: data.status,
          };
        });
      } else {
        // Fallback: get all users if no active users found
        console.log("No active users found, fetching all users...");
        const allQuery = adminDb.collection("users").limit(limit);

        const allSnapshot = await allQuery.get();
        console.log(`Found ${allSnapshot.docs.length} total users`);

        users = allSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            uid: doc.id,
            name: data.name || data.email,
            email: data.email,
            image: data.image || data.photoURL,
            status: data.status,
          };
        });
      }
    } catch (queryError: any) {
      console.error("Error in Firestore query:", queryError);
      throw queryError;
    }

    console.log(`Processing ${users.length} users...`);

    // Filter out users with problematic IDs (same logic as cache)
    const filteredUsers = users.filter((user) => {
      if (!user.uid) {
        console.log("Filtering out user with no UID");
        return false;
      }

      // Filter out users with no name or email
      if (!user.name && !user.email) {
        console.log(`Filtering out user with no name or email: ${user.uid}`);
        return false;
      }

      // Filter out long numeric OAuth IDs
      if (/^\d{15,}$/.test(user.uid)) {
        console.log(`Filtering out user with long numeric ID: ${user.uid}`);
        return false;
      }

      // Filter out UUID format OAuth IDs
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          user.uid
        )
      ) {
        console.log(`Filtering out user with UUID ID: ${user.uid}`);
        return false;
      }

      return true;
    });

    console.log(`After filtering: ${filteredUsers.length} users`);

    // Sort by name on the client side - with safe handling of undefined values
    filteredUsers.sort((a, b) => {
      const nameA = (a.name || a.email || "").toLowerCase();
      const nameB = (b.name || b.email || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Remove status from response (not needed on frontend)
    const responseUsers = filteredUsers.map(({ status, ...user }) => user);

    console.log(`Returning ${responseUsers.length} users`);

    return NextResponse.json({
      users: responseUsers,
      total: responseUsers.length,
    });
  } catch (error: any) {
    console.error("Error fetching users for projects:", error);

    // Return more detailed error information for debugging
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch users",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
