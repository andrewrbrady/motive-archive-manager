import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    // [REMOVED] // [REMOVED] console.log("Listing all Firebase Auth users");

    // List batch of users, 1000 at a time.
    const listAllUsers = async (nextPageToken?: string) => {
      // List up to 1000 users.
      const listUsersResult = await adminAuth.listUsers(1000, nextPageToken);
      const users = listUsersResult.users.map((userRecord) => ({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        emailVerified: userRecord.emailVerified,
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
        providerData: userRecord.providerData.map((provider) => ({
          providerId: provider.providerId,
          uid: provider.uid,
          displayName: provider.displayName,
          email: provider.email,
          photoURL: provider.photoURL,
        })),
      }));

      // [REMOVED] // [REMOVED] console.log(`Found ${users.length} users in Firebase Auth`);

      return {
        users,
        pageToken: listUsersResult.pageToken,
      };
    };

    // Get the first batch of users
    const result = await listAllUsers();

    return NextResponse.json({
      users: result.users,
      pageToken: result.pageToken,
    });
  } catch (error: any) {
    console.error("Error listing Firebase Auth users:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
