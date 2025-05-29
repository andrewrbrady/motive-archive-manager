// Add the dynamic export at the top of the file
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FirestoreUser } from "@/types/firebase";

// Define response types
type SuccessResponse = {
  users: FirestoreUser[];
  pagination: {
    lastId?: string;
    hasMore: boolean;
    limit: number;
  };
};

type ErrorResponse = {
  error: string;
};

// Combined response type
type ApiResponse = SuccessResponse | ErrorResponse;

/**
 * GET list of users with pagination and filtering
 * Protected endpoint requiring admin role
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  console.log("🔒 GET /api/users/list: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    console.log("❌ GET /api/users/list: Authentication failed");
    return authResult;
  }

  try {
    console.log(
      "🔒 GET /api/users/list: Authentication successful, fetching users"
    );

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const startAfter = searchParams.get("startAfter") || undefined;

    console.log(
      `Fetching users with params: limit=${limit}, startAfter=${startAfter}`
    );

    // Get users from Firestore
    const usersSnapshot = await adminDb.collection("users").get();
    const users: FirestoreUser[] = usersSnapshot.docs.map((doc) => ({
      uid: doc.id,
      email: doc.data().email || "",
      name: doc.data().name || "",
      creativeRoles: doc.data().creativeRoles || [],
      roles: doc.data().roles || [],
      status: doc.data().status || "active",
      ...doc.data(),
    })) as FirestoreUser[];

    console.log("✅ GET /api/users/list: Successfully fetched users", {
      count: users.length,
    });

    // Return users with pagination info
    return NextResponse.json({
      users: users,
      pagination: {
        lastId: users[users.length - 1]?.uid,
        hasMore: false,
        limit,
      },
    } as SuccessResponse);
  } catch (error: any) {
    console.error("💥 GET /api/users/list: Error fetching users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}
