import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthMiddleware,
  getUserIdFromToken,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";
import { dbConnect } from "@/lib/mongodb";
import { Deliverable } from "@/models/Deliverable";
import { adminDb } from "@/lib/firebase-admin";
import { getUserById } from "@/lib/firestore/users";
import { logger } from "@/lib/logging";

export const dynamic = "force-dynamic";

/**
 * Validates the request payload for deliverable assignment
 * @param body - The request body to validate
 * @returns Object with validation result and any error messages
 */
function validateAssignmentPayload(body: any) {
  const errors = [];

  // Required fields
  if (!body.deliverableId) {
    errors.push("Deliverable ID is required");
  }

  // Validate types
  if (
    body.userId !== null &&
    body.userId !== undefined &&
    typeof body.userId !== "string"
  ) {
    errors.push("User ID must be a string or null");
  }

  if (
    body.editorName !== null &&
    body.editorName !== undefined &&
    typeof body.editorName !== "string"
  ) {
    errors.push("Editor name must be a string or null");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export async function POST(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 POST /api/cars/[id]/deliverables/assign: Starting request");

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Check authentication and required roles
  const authResult = await verifyAuthMiddleware(request, ["admin", "editor"]);
  if (authResult) {
    console.log(
      "❌ POST /api/cars/[id]/deliverables/assign: Authentication failed"
    );
    return authResult;
  }

  try {
    // Get token data and extract user ID
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const currentUserId = getUserIdFromToken(tokenData);

    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3]; // -3 because URL is /cars/[id]/deliverables/assign

    logger.info({
      message: "Assignment request received",
      requestId,
      carId: id,
      route: "api/cars/[id]/deliverables/assign",
    });

    // Parse the request body
    const body = await request.json();

    // Validate the payload
    const validation = validateAssignmentPayload(body);
    if (!validation.isValid) {
      logger.warn({
        message: "Invalid request payload",
        requestId,
        validationErrors: validation.errors,
        statusCode: 400,
      });

      return NextResponse.json(
        { error: "Invalid request payload", details: validation.errors },
        { status: 400 }
      );
    }

    const { deliverableId, userId, editorName } = body;
    const carId = id;

    logger.info({
      message: "Processing assignment request",
      requestId,
      deliverableId,
      carId,
      userId: userId || "unassigned",
    });

    // Connect to MongoDB
    await dbConnect();

    // Find the deliverable and verify it belongs to the specified car
    const deliverable = await Deliverable.findOne({
      _id: deliverableId,
      car_id: carId,
    });

    if (!deliverable) {
      logger.warn({
        message: "Deliverable not found",
        requestId,
        deliverableId,
        carId,
        statusCode: 404,
      });

      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    // If userId is provided, get user details from Firebase
    let finalEditorName = editorName || null;

    // Handle assignment logic
    if (userId === null) {
      // Explicitly unassigning
      deliverable.firebase_uid = "";
      deliverable.editor = "Unassigned";

      logger.info({
        message: "Unassigning deliverable",
        requestId,
        deliverableId,
        previousEditor: deliverable.editor,
      });
    } else if (userId) {
      try {
        // Log the incoming userId for debugging
        logger.info({
          message: "Looking up user for assignment",
          requestId,
          userId,
          userIdType: typeof userId,
        });

        // Get user from Firestore using Firebase UID
        const userData = await getUserById(userId);

        if (!userData) {
          logger.warn({
            message: "User not found in Firestore",
            requestId,
            userId,
            statusCode: 404,
          });

          return NextResponse.json(
            { error: "User not found in Firestore" },
            { status: 404 }
          );
        } else {
          finalEditorName = userData.name || editorName || "Unknown User";

          // Log the found user info
          logger.info({
            message: "Found user for assignment",
            requestId,
            userId,
            userName: finalEditorName,
            userFirebaseUid: userData.uid,
          });

          // Update deliverable with Firebase UID and editor name
          deliverable.firebase_uid = userData.uid;
          deliverable.editor = finalEditorName;

          logger.info({
            message: "Assigning deliverable to user",
            requestId,
            userId: userData.uid,
            userName: finalEditorName,
            deliverableId,
          });
        }
      } catch (error) {
        logger.error({
          message: "Error fetching user from Firestore",
          requestId,
          userId,
          error: error instanceof Error ? error.message : String(error),
          statusCode: 500,
        });

        return NextResponse.json(
          { error: "Failed to fetch user information" },
          { status: 500 }
        );
      }
    } else if (finalEditorName) {
      // If no userId provided but editorName exists, just update the editor name
      deliverable.editor = finalEditorName;
      deliverable.firebase_uid = "";

      logger.info({
        message: "Updating editor name only",
        requestId,
        editorName: finalEditorName,
        deliverableId,
      });
    } else {
      deliverable.editor = "Unassigned";
      deliverable.firebase_uid = "";

      logger.info({
        message: "Setting deliverable to unassigned (no userId or editorName)",
        requestId,
        deliverableId,
      });
    }

    // Add audit info to the deliverable
    deliverable.updated_at = new Date();

    // Save the updated deliverable with explicit write concern options
    try {
      // Use simpler save options to avoid write concern errors
      const saveResult = await deliverable.save();

      logger.info({
        message: "Deliverable save successful",
        requestId,
        deliverableId: saveResult._id,
        processingTimeMs: Date.now() - startTime,
      });
    } catch (error) {
      logger.error({
        message: "Error saving deliverable",
        requestId,
        deliverableId,
        error: error instanceof Error ? error.message : String(error),
        statusCode: 500,
      });

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: "Failed to save deliverable: " + errorMessage },
        { status: 500 }
      );
    }

    // Return the updated deliverable
    return NextResponse.json({
      success: true,
      deliverable: deliverable.toPublicJSON(),
    });
  } catch (error: any) {
    logger.error({
      message: "Unhandled error in deliverable assignment API",
      requestId,
      error: error.message || String(error),
      statusCode: 500,
    });

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
