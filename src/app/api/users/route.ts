import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
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

    await connectToDatabase();

    logger.info({
      message: "Fetching users for team member selection",
      requestId,
      route: "api/users",
      userId: session.user.id,
    });

    // Fetch all users with basic information
    const users = await User.find(
      {},
      {
        _id: 1,
        name: 1,
        email: 1,
        image: 1,
        createdAt: 1,
      }
    ).sort({ name: 1 });

    logger.info({
      message: "Successfully fetched users",
      requestId,
      userCount: users.length,
    });

    return NextResponse.json({
      users,
      total: users.length,
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
