import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthMiddleware,
  getUserIdFromToken,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 POST /api/deliverables/assign: Starting request");

  // Check authentication and required roles
  const authResult = await verifyAuthMiddleware(request, ["admin", "editor"]);
  if (authResult) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ POST /api/deliverables/assign: Authentication failed");
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

    // Parse the request body
    const body = await request.json();
    const { deliverableId, userId, editorName } = body;

    // Validate required parameters
    if (!deliverableId) {
      return NextResponse.json(
        { error: "Deliverable ID is required" },
        { status: 400 }
      );
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Received assignment request:", body);

    const db = await getDatabase();
    const deliverablesCol = db.collection("deliverables");
    const deliverable = await deliverablesCol.findOne({ _id: new ObjectId(deliverableId) });
    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    // If userId is provided, get user details from Firebase
    let finalEditorName = editorName || null;

    // Handle assignment logic
    if (userId === null || userId === "unassigned") {
      // Explicitly unassigning
      deliverable.firebase_uid = "";
      deliverable.editor = "Unassigned";
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Unassigning deliverable:", deliverableId);
    } else if (userId) {
      try {
        // If we already have the editor name from the client, use it
        if (finalEditorName) {
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Using provided editor name: ${finalEditorName}`);
          deliverable.firebase_uid = userId;
          deliverable.editor = finalEditorName;
        } else {
          // Try looking up the user in multiple data sources
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Looking up user with ID: ${userId}`);

          // Check if this is a Firebase UID
          const userDoc = await adminDb.collection("users").doc(userId).get();

          if (userDoc.exists) {
            // Found in Firebase
            const userData = userDoc.data();
            finalEditorName = userData?.name || "Unknown User";

            // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Found user in Firebase: ${finalEditorName}`);

            // Update deliverable with user info
            deliverable.firebase_uid = userId;
            deliverable.editor = finalEditorName;
          } else {
            // Not found in Firebase, try MongoDB
            const db = await getDatabase();
            const mongoUser = await db
              .collection("users")
              .findOne({ _id: userId });

            if (mongoUser) {
              // Found in MongoDB
              finalEditorName = mongoUser.name;
              // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Found user in MongoDB: ${finalEditorName}`);

              deliverable.firebase_uid = mongoUser.uid || userId;
              deliverable.editor = finalEditorName;
            } else {
              // As a last resort, check if this might be a name mismatch
              console.log(
                "User not found by direct ID lookup, trying find by uid field"
              );

              const firebaseUsers = await adminDb
                .collection("users")
                .where("uid", "==", userId)
                .limit(1)
                .get();

              if (!firebaseUsers.empty) {
                const userData = firebaseUsers.docs[0].data();
                finalEditorName = userData?.name || "Unknown User";
                // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Found user by uid field: ${finalEditorName}`);

                deliverable.firebase_uid = userId;
                deliverable.editor = finalEditorName;
              } else {
                // User truly not found
                return NextResponse.json(
                  { error: `User with ID ${userId} not found in any database` },
                  { status: 404 }
                );
              }
            }
          }
        }

        console.log("Assigning deliverable to user:", {
          userId,
          finalEditorName,
        });
      } catch (error) {
        console.error("Error fetching user:", error);
        return NextResponse.json(
          { error: "Failed to fetch user information" },
          { status: 500 }
        );
      }
    } else {
      // If no userId provided but editorName exists, just update the editor name
      if (finalEditorName) {
        deliverable.editor = finalEditorName;
      } else {
        deliverable.editor = "Unassigned";
      }
      deliverable.firebase_uid = "";
    }

    console.log("Updating deliverable assignment:", {
      deliverableId,
      firebase_uid: deliverable.firebase_uid,
      editor: deliverable.editor,
    });

    // Save the updated deliverable with explicit write concern options
    try {
      await deliverablesCol.updateOne(
        { _id: new ObjectId(deliverableId) },
        {
          $set: {
            firebase_uid: deliverable.firebase_uid || "",
            editor: deliverable.editor || "Unassigned",
            updated_at: new Date(),
          },
        }
      );
    } catch (error) {
      console.error("Error saving deliverable:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: "Failed to save deliverable: " + errorMessage },
        { status: 500 }
      );
    }

    // Return the updated deliverable
    return NextResponse.json({
      success: true,
      deliverable: {
        ...deliverable,
        firebase_uid: deliverable.firebase_uid || "",
        editor: deliverable.editor || "Unassigned",
      },
    });
  } catch (error: any) {
    console.error("Error in deliverable assignment API:", error);

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
