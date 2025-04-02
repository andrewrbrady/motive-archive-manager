import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";

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
 * API route to migrate users from MongoDB to Firebase
 * This should be restricted to admin users only
 */
export async function POST(request: Request) {
  try {
    // First check API token
    const tokenUser = await verifyApiToken(request);

    // If no token, check session
    if (!tokenUser) {
      // Check authentication
      const session = await auth();
      if (!session?.user?.roles?.includes("admin")) {
        return NextResponse.json(
          { error: "Unauthorized access" },
          { status: 403 }
        );
      }
    }

    // Parse request for options
    const requestData = await request.json().catch(() => ({}));
    const options = {
      dryRun: requestData.dryRun === true,
      batchSize: Math.min(parseInt(requestData.batchSize) || 50, 100), // Max 100 at a time
      skip: parseInt(requestData.skip) || 0,
      onlyEmail: requestData.email || null, // Migrate only a specific email if provided
    };

    console.log("Migration options:", options);

    // Connect to MongoDB
    await dbConnect();

    // Build the query
    let query = {};
    if (options.onlyEmail) {
      query = { email: options.onlyEmail };
      console.log(`Migrating only user with email: ${options.onlyEmail}`);
    }

    // Get users from MongoDB
    const totalCount = await User.countDocuments(query);
    const users = await User.find(query)
      .skip(options.skip)
      .limit(options.batchSize);

    // Migration stats
    const migrationResults = {
      total: users.length,
      totalAvailable: totalCount,
      success: 0,
      skipped: 0,
      failed: 0,
      dryRun: options.dryRun,
      batchSize: options.batchSize,
      skip: options.skip,
      nextBatchSkip: options.skip + users.length,
      hasMoreUsers: options.skip + users.length < totalCount,
      results: [] as any[],
    };

    // Process each user
    for (const user of users) {
      try {
        const result = {
          email: user.email,
          status: "pending",
          existingUser: false,
          firebaseUid: "",
          error: null,
        };

        // Check if user already exists in Firebase
        let existingUser = null;
        try {
          existingUser = await adminAuth.getUserByEmail(user.email);
          result.existingUser = true;
          result.firebaseUid = existingUser.uid;
          console.log(
            `User ${user.email} already exists in Firebase (${existingUser.uid})`
          );
        } catch (error) {
          // User doesn't exist, proceed with creation
          console.log(
            `User ${user.email} doesn't exist in Firebase, will create`
          );
        }

        // Dry run - skip actual creation
        if (options.dryRun) {
          result.status = "skipped";
          migrationResults.skipped++;
          migrationResults.results.push(result);
          continue;
        }

        if (existingUser) {
          // Update existing user's custom claims
          await adminAuth.setCustomUserClaims(existingUser.uid, {
            roles: user.roles || ["user"],
            creativeRoles: user.creativeRoles || [],
            status: user.status || "active",
          });

          // Update user data in Firestore
          await adminDb
            .collection("users")
            .doc(existingUser.uid)
            .set(
              {
                name: user.name,
                email: user.email,
                roles: user.roles || ["user"],
                creativeRoles: user.creativeRoles || [],
                status: user.status || "active",
                accountType: user.accountType || "personal",
                profileImage: user.profileImage || null,
                bio: user.bio || null,
                createdAt: user.created_at || new Date(),
                updatedAt: new Date(),
                lastLoginAt: user.last_login || null,
                mongoId: user._id ? user._id.toString() : undefined, // Store original MongoDB ID for reference
              },
              { merge: true }
            );

          result.status = "updated";
          migrationResults.success++;
        } else {
          // Create the user in Firebase Auth
          // Generate a secure password for users without one
          const randomPassword =
            Math.random().toString(36).slice(-10) +
            Math.random().toString(36).slice(-10).toUpperCase() +
            "!" +
            Math.floor(Math.random() * 10000);

          const firebaseUser = await adminAuth.createUser({
            email: user.email,
            password: user.password ? user.password : randomPassword,
            displayName: user.name,
            disabled: user.status === "suspended",
          });

          result.firebaseUid = firebaseUser.uid;

          // Set custom claims for roles
          await adminAuth.setCustomUserClaims(firebaseUser.uid, {
            roles: user.roles || ["user"],
            creativeRoles: user.creativeRoles || [],
            status: user.status || "active",
          });

          // Store complete user profile in Firestore
          await adminDb
            .collection("users")
            .doc(firebaseUser.uid)
            .set({
              name: user.name,
              email: user.email,
              roles: user.roles || ["user"],
              creativeRoles: user.creativeRoles || [],
              status: user.status || "active",
              accountType: user.accountType || "personal",
              profileImage: user.profileImage || null,
              bio: user.bio || null,
              createdAt: user.created_at || new Date(),
              updatedAt: new Date(),
              lastLoginAt: user.last_login || null,
              mongoId: user._id ? user._id.toString() : undefined, // Store original MongoDB ID for reference
            });

          result.status = "created";
          migrationResults.success++;
        }

        migrationResults.results.push(result);
      } catch (error: any) {
        console.error(`Error migrating user ${user.email}:`, error);
        migrationResults.failed++;
        migrationResults.results.push({
          email: user.email,
          status: "failed",
          error: error.message || "Unknown error",
        });
      }
    }

    return NextResponse.json({
      message: options.dryRun ? "Dry run completed" : "Migration completed",
      stats: migrationResults,
      nextSteps: migrationResults.hasMoreUsers
        ? `To migrate the next batch, use skip=${migrationResults.nextBatchSkip}`
        : "All users have been migrated",
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to migrate users" },
      { status: 500 }
    );
  }
}
