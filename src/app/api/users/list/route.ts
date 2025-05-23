// Add the dynamic export at the top of the file
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listUsers } from "@/lib/firestore/users";
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
  try {
    // Verify the user is authenticated and has admin privileges
    const session = await auth();
    console.log("Session data in list API route:", {
      sessionExists: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      roles: session?.user?.roles,
    });

    if (!session?.user?.roles?.includes("admin")) {
      // [REMOVED] // [REMOVED] console.log("User does not have admin role:", session?.user);
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const startAfter = searchParams.get("startAfter") || undefined;

    console.log(
      `Fetching users with params: limit=${limit}, startAfter=${startAfter}`
    );

    // Get users from Firestore
    const result = await listUsers(limit, startAfter);

    console.log(
      `Found ${result.users.length} users, hasMore: ${!!result.lastDoc}`
    );

    // Return users with pagination info
    return NextResponse.json({
      users: result.users,
      pagination: {
        lastId: result.lastDoc?.id,
        hasMore: !!result.lastDoc && result.users.length === limit,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Error listing users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list users" },
      { status: 500 }
    );
  }
}
