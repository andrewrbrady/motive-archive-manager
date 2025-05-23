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
 * Get all users from Firestore with caching
 */
export async function getUsers(
  creativeRole?: string,
  forceRefresh: boolean = false
): Promise<FirestoreUser[]> {
  const now = Date.now();

  // Return cached users if available and not expired, unless forceRefresh is true
  if (
    !forceRefresh &&
    userCache &&
    lastFetchTime &&
    now - lastFetchTime < CACHE_TTL
  ) {
    logger.debug({
      message: "Returning cached users",
      count: userCache.length,
    });

    // Filter by creative role if specified
    if (creativeRole) {
      return userCache.filter((user) =>
        user.creativeRoles?.includes(creativeRole)
      );
    }

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

    // Filter out problematic OAuth IDs (long numeric strings and UUIDs)
    // Only include users with proper Firebase Auth UIDs and active status
    const filteredUsers = allUsers.filter((user) => {
      if (!user.uid) return false;

      // Filter out inactive users
      if (user.status !== "active") {
        logger.debug({
          message: "Filtering out inactive user",
          userId: user.uid,
          userName: user.name,
          status: user.status,
        });
        return false;
      }

      // Filter out long numeric OAuth IDs (like 115667720852671300123)
      if (/^\d{15,}$/.test(user.uid)) {
        logger.debug({
          message: "Filtering out user with long numeric OAuth ID",
          userId: user.uid,
          userName: user.name,
        });
        return false;
      }

      // Filter out UUID format OAuth IDs (like dc7fe9cd-1f34-4c9d-84cb-f967e2064448)
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          user.uid
        )
      ) {
        logger.debug({
          message: "Filtering out user with UUID OAuth ID",
          userId: user.uid,
          userName: user.name,
        });
        return false;
      }

      return true;
    });

    logger.info({
      message: "Users after filtering",
      totalUsers: allUsers.length,
      filteredUsers: filteredUsers.length,
      removedUsers: allUsers.length - filteredUsers.length,
    });

    // Update cache
    userCache = filteredUsers;
    lastFetchTime = now;

    // Filter by creative role if specified
    if (creativeRole) {
      return filteredUsers.filter((user) =>
        user.creativeRoles?.includes(creativeRole)
      );
    }

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

      // Filter by creative role if specified
      if (creativeRole) {
        return userCache.filter((user) =>
          user.creativeRoles?.includes(creativeRole)
        );
      }

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

// Invalidate cache immediately to ensure changes take effect
invalidateUserCache();
