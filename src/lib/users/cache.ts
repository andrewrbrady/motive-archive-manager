"use server";

/**
 * User caching utility to reduce API calls
 * This file only runs on the server side
 */
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FirestoreUser } from "@/lib/firestore/users";
import { logger } from "@/lib/logging";

// Cache users for 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

let userCache: FirestoreUser[] | null = null;
let lastFetchTime: number | null = null;

/**
 * Check if a user is an OAuth user based on their provider data
 */
async function isOAuthUser(uid: string): Promise<boolean> {
  try {
    const userRecord = await adminAuth.getUser(uid);

    // Check if user has any OAuth providers
    const hasOAuthProvider = userRecord.providerData.some(
      (provider) =>
        provider.providerId !== "password" && provider.providerId !== "email"
    );

    if (hasOAuthProvider) {
      logger.debug({
        message: "User identified as OAuth user",
        uid,
        providers: userRecord.providerData.map((p) => p.providerId),
      });
    }

    return hasOAuthProvider;
  } catch (error) {
    logger.error({
      message: "Error checking OAuth status",
      uid,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Get all users from Firestore with caching
 */
export async function getUsers(): Promise<FirestoreUser[]> {
  const now = Date.now();

  // Return cached users if available and not expired
  if (userCache && lastFetchTime && now - lastFetchTime < CACHE_TTL) {
    logger.debug({
      message: "Returning cached users",
      count: userCache.length,
    });
    return userCache;
  }

  try {
    logger.info({
      message: "Fetching users from Firestore",
      timestamp: new Date().toISOString(),
    });

    const snapshot = await adminDb.collection("users").get();
    const allUsers = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        // Get Firebase Auth data for each user
        try {
          const authUser = await adminAuth.getUser(doc.id);
          return {
            uid: doc.id,
            ...data,
            photoURL: authUser.photoURL || data.photoURL,
            image: authUser.photoURL || data.image,
          } as FirestoreUser;
        } catch (error) {
          logger.warn({
            message: "Failed to get Firebase Auth data for user",
            uid: doc.id,
            error: error instanceof Error ? error.message : String(error),
          });
          return {
            uid: doc.id,
            ...data,
          } as FirestoreUser;
        }
      })
    );

    logger.info({
      message: "Total users fetched",
      count: allUsers.length,
    });

    // Filter out OAuth users and inactive users
    const filteredUsers = [];
    for (const user of allUsers) {
      if (user.status !== "active") {
        logger.debug({
          message: "Filtering out inactive user",
          uid: user.uid,
        });
        continue;
      }

      const isOAuth = await isOAuthUser(user.uid);
      if (isOAuth) {
        logger.debug({
          message: "Filtering out OAuth user",
          uid: user.uid,
        });
        continue;
      }

      filteredUsers.push(user);
    }

    logger.info({
      message: "Users after filtering",
      totalUsers: allUsers.length,
      filteredUsers: filteredUsers.length,
      removedUsers: allUsers.length - filteredUsers.length,
    });

    // Update cache
    userCache = filteredUsers;
    lastFetchTime = now;

    return filteredUsers;
  } catch (error) {
    logger.error({
      message: "Error fetching users",
      error: error instanceof Error ? error.message : String(error),
    });

    // Return cached users if available, even if expired
    if (userCache) {
      logger.warn({
        message: "Returning expired cached users due to error",
        count: userCache.length,
      });
      return userCache;
    }

    return [];
  }
}

/**
 * Invalidate the user cache to force a fresh fetch
 */
export async function invalidateUserCache(): Promise<void> {
  logger.info({
    message: "Invalidating user cache",
  });

  userCache = null;
  lastFetchTime = null;
}

/**
 * Adds a user to the cache or updates if already exists
 * Useful for optimistic updates after user changes
 * @param user - The user to add or update
 */
export async function updateCachedUser(user: FirestoreUser): Promise<void> {
  if (!userCache) return;

  // Find if user already exists in cache
  const existingIndex = userCache.findIndex((u) => u.uid === user.uid);

  if (existingIndex >= 0) {
    // Update existing user
    userCache[existingIndex] = user;
  } else {
    // Add new user
    userCache.push(user);
  }
}

/**
 * Removes a user from the cache
 * @param userId - The Firebase UID of the user to remove
 */
export async function removeCachedUser(userId: string): Promise<void> {
  if (!userCache) return;

  userCache = userCache.filter((user) => user.uid !== userId);
}
