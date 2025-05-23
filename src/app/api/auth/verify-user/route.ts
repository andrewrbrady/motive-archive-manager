import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Get the UID from the query params
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`Verifying user with UID: ${uid.substring(0, 8)}***`);
    }

    // Check if the user exists in Firebase Auth
    try {
      const userRecord = await adminAuth.getUser(uid);
      if (process.env.NODE_ENV !== "production") {
        console.log("User exists in Firebase Auth:", {
          hasUid: !!userRecord.uid,
          hasEmail: !!userRecord.email,
          emailVerified: userRecord.emailVerified,
          hasDisplayName: !!userRecord.displayName,
          hasCreationTime: !!userRecord.metadata.creationTime,
        });
      }

      return NextResponse.json({
        exists: true,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          emailVerified: userRecord.emailVerified,
          displayName: userRecord.displayName,
          creationTime: userRecord.metadata.creationTime,
        },
      });
    } catch (error: any) {
      if (process.env.NODE_ENV !== "production") {
        console.error(`User verification failed - Code: ${error.code}`);
      }

      return NextResponse.json({
        exists: false,
        error: error.message,
        code: error.code,
      });
    }
  } catch (error: any) {
    console.error("Error verifying user:", error.message || "Unknown error");
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
