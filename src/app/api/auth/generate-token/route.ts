import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { randomBytes } from "crypto";
import { adminDb } from "@/lib/firebase-admin";

/**
 * API route to generate an API token for admin users
 * This token can be used for CLI operations
 */
export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Generate a secure random token
    const token = randomBytes(32).toString("hex");

    // Store the token in Firestore with user reference and expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token valid for 7 days

    await adminDb.collection("api_tokens").add({
      token,
      userId: session.user.id,
      userEmail: session.user.email,
      createdAt: new Date(),
      expiresAt,
      lastUsed: null,
    });

    return NextResponse.json({
      token,
      expiresAt,
      userId: session.user.id,
      message:
        "API token generated successfully. This token will be valid for 7 days.",
    });
  } catch (error: any) {
    console.error("Error generating API token:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate API token" },
      { status: 500 }
    );
  }
}
