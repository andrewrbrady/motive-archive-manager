import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { auth } from "@/auth";
import { adminDb } from "@/lib/firebase-admin";

// WARNING: Development use only, remove in production
// This allows testing with scripts/migrate-users.js when no admin browser session is available
const DEV_API_KEY = "dev_migration_token_123456";

/**
 * Verify API token
 */
async function verifyApiToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.split("Bearer ")[1];
  if (!token) return null;

  // Development backdoor for testing
  if (process.env.NODE_ENV !== "production" && token === DEV_API_KEY) {
    console.log("Using development API key for testing");
    return {
      userId: "dev-admin",
      userEmail: "dev@example.com",
    };
  }

  // Check if token exists in Firestore
  const tokensSnapshot = await adminDb
    .collection("api_tokens")
    .where("token", "==", token)
    .where("expiresAt", ">", new Date())
    .limit(1)
    .get();

  if (tokensSnapshot.empty) return null;

  // Update last used
  const tokenDoc = tokensSnapshot.docs[0];
  await tokenDoc.ref.update({ lastUsed: new Date() });

  return {
    userId: tokenDoc.data().userId,
    userEmail: tokenDoc.data().userEmail,
  };
}

/**
 * API endpoint to analyze MongoDB users for migration
 */
export async function GET(request: Request) {
  try {
    // First check API token
    const tokenUser = await verifyApiToken(request);

    // If no token, check session
    if (!tokenUser) {
      // Check authentication
      const session = await auth();
      if (!session || !session.user || !session.user.roles.includes("admin")) {
        return NextResponse.json(
          { error: "Unauthorized access" },
          { status: 403 }
        );
      }
    }

    // Connect to MongoDB
    await dbConnect();

    // Get all users from MongoDB
    const users = await User.find({});

    // Basic statistics
    const userStats = {
      total: users.length,
      active: users.filter((user) => user.status === "active").length,
      suspended: users.filter((user) => user.status === "suspended").length,
      inactive: users.filter((user) => user.status === "inactive").length,
      withPassword: users.filter((user) => user.password).length,
      withoutPassword: users.filter((user) => !user.password).length,
      admins: users.filter((user) => user.roles?.includes("admin")).length,
      editors: users.filter((user) => user.roles?.includes("editor")).length,
      regularUsers: users.filter((user) => {
        return (
          !user.roles?.includes("admin") && !user.roles?.includes("editor")
        );
      }).length,
    };

    // Sample user structure (without sensitive data)
    const sampleUser =
      users.length > 0
        ? {
            _id: users[0]._id?.toString(),
            name: users[0].name,
            email: users[0].email,
            hasPassword: Boolean(users[0].password),
            roles: users[0].roles,
            creativeRoles: users[0].creativeRoles,
            status: users[0].status,
            accountType: users[0].accountType,
            created_at: users[0].created_at,
            // Omit other sensitive fields
          }
        : null;

    // Return the analysis
    return NextResponse.json({
      stats: userStats,
      sampleUserStructure: sampleUser,
      migrationReady: users.length > 0,
      nextStep:
        "To migrate these users, run a POST request to /api/users/migrate-to-firebase",
    });
  } catch (error: any) {
    console.error("MongoDB user analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze MongoDB users" },
      { status: 500 }
    );
  }
}
