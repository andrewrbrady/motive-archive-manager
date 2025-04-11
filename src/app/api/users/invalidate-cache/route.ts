import { NextRequest, NextResponse } from "next/server";
import { invalidateUserCache } from "@/lib/users/cache";
import { logger } from "@/lib/logging";

/**
 * POST /api/users/invalidate-cache
 *
 * Invalidates the user cache to force a fresh fetch from Firestore
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    logger.info({
      message: "Invalidating user cache",
      requestId,
      route: "api/users/invalidate-cache",
    });

    invalidateUserCache();

    logger.info({
      message: "Successfully invalidated user cache",
      requestId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error({
      message: "Error invalidating user cache",
      requestId,
      error: errorMessage,
    });

    return NextResponse.json(
      { error: "Failed to invalidate cache" },
      { status: 500 }
    );
  }
}
