import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import { Deliverable } from "@/models/Deliverable";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    // Verify the user is authenticated and has appropriate permissions
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user has admin or editor role
    const userRoles = session.user.roles || [];
    const hasPermission = userRoles.some((role) =>
      ["admin", "editor"].includes(role)
    );

    if (!hasPermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Parse the request body
    const body = await req.json();
    const { deliverableId, userId } = body;

    // Validate required parameters
    if (!deliverableId) {
      return NextResponse.json(
        { error: "Deliverable ID is required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await dbConnect();

    // Find the deliverable
    const deliverable = await Deliverable.findById(deliverableId);

    if (!deliverable) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    // If userId is provided, get user details from Firebase
    let editorName = null;
    if (userId) {
      try {
        // Get user from Firestore
        const userDoc = await adminDb.collection("users").doc(userId).get();

        if (!userDoc.exists) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        const userData = userDoc.data();
        editorName = userData?.name || "Unknown User";
      } catch (error) {
        console.error("Error fetching user from Firestore:", error);
        return NextResponse.json(
          { error: "Failed to fetch user information" },
          { status: 500 }
        );
      }
    }

    // Update the deliverable with assignment info
    deliverable.firebase_uid = userId || undefined; // Store Firebase UID
    deliverable.editor = editorName || ""; // Use name for display

    // Save the updated deliverable
    await deliverable.save();

    // Return the updated deliverable
    return NextResponse.json({
      success: true,
      deliverable: deliverable.toPublicJSON(),
    });
  } catch (error: any) {
    console.error("Error in deliverable assignment API:", error);

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
