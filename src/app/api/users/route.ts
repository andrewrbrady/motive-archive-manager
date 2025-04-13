import { NextRequest, NextResponse } from "next/server";
import { listUsers } from "@/lib/firestore/users";
import { logger } from "@/lib/logging";
import { getUsers } from "@/lib/users/cache";

// Define allowed methods
const allowedMethods = ["GET", "POST"];

/**
 * GET /api/users
 *
 * Fetches users from Firestore with caching
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    logger.info({
      message: "Fetching users from cache/Firestore",
      requestId,
      route: "api/users",
    });

    // Use the caching utility to get users
    const users = await getUsers();

    logger.info({
      message: "Successfully fetched users",
      requestId,
      count: users.length,
    });

    return NextResponse.json(users);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error({
      message: "Error fetching users",
      requestId,
      error: errorMessage,
    });

    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users is now deprecated
 * User creation should happen through Firebase Auth and Firestore directly
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error:
        "POST to /api/users is deprecated. User management should now be handled through Firebase.",
    },
    { status: 400 }
  );
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: allowedMethods.join(", "),
    },
  });
}

// Handle all other methods
export async function PUT(request: NextRequest) {
  return methodNotAllowed();
}

export async function DELETE(request: NextRequest) {
  return methodNotAllowed();
}

export async function PATCH(request: NextRequest) {
  return methodNotAllowed();
}

function methodNotAllowed() {
  return new NextResponse(null, {
    status: 405,
    headers: {
      Allow: allowedMethods.join(", "),
    },
  });
}
