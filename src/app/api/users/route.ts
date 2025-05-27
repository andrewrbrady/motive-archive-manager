import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
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
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    logger.info({
      message: "Fetching users for team member selection",
      requestId,
      route: "api/users",
      userId: session.user.id,
    });

    // Fetch users from Firestore using the cached function
    const users = await getUsers();

    // Transform to match the expected interface for backward compatibility
    const transformedUsers = users.map((user) => ({
      _id: user.uid, // Use Firebase UID as _id for backward compatibility
      name: user.name,
      email: user.email,
      roles: user.roles,
      creativeRoles: user.creativeRoles,
      status: user.status,
      firebaseUid: user.uid, // Include Firebase UID explicitly
    }));

    logger.info({
      message: "Successfully fetched users from Firestore",
      requestId,
      userCount: transformedUsers.length,
    });

    return NextResponse.json({
      users: transformedUsers,
      total: transformedUsers.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error({
      message: "Error fetching users",
      requestId,
      error: errorMessage,
    });

    return NextResponse.json(
      { error: "Internal server error" },
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
