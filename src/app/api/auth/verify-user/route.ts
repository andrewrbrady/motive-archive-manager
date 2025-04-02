import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

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

    console.log(`Verifying user with UID: ${uid}`);

    // Check if the user exists in Firebase Auth
    try {
      const userRecord = await adminAuth.getUser(uid);
      console.log("User exists in Firebase Auth:", {
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName,
        creationTime: userRecord.metadata.creationTime,
      });

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
      console.error(`User with UID ${uid} not found in Firebase Auth:`, error);
      console.error(
        `Error details - code: ${error.code}, message: ${error.message}`
      );
      console.error(
        `Full error:`,
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      );

      return NextResponse.json({
        exists: false,
        error: error.message,
        code: error.code,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
    }
  } catch (error: any) {
    console.error("Error verifying user:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
