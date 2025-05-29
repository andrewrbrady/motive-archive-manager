import { NextRequest, NextResponse } from "next/server";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
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
  console.log("🔒 GET /api/users: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    console.log("❌ GET /api/users: Authentication failed");
    return authResult;
  }

  try {
    console.log("🔒 GET /api/users: Authentication successful, fetching users");

    // Get users from Firestore
    const usersSnapshot = await adminDb.collection("users").get();
    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log("✅ GET /api/users: Successfully fetched users", {
      count: users.length,
    });
    return NextResponse.json({ users });
  } catch (error) {
    console.error("💥 GET /api/users: Error fetching users:", error);
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
