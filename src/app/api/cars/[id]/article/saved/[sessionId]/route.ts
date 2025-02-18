import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; sessionId: string } }
) {
  try {
    const { id, sessionId } = params;
    const carId = new ObjectId(id);

    if (!carId || !sessionId) {
      return NextResponse.json(
        { error: "Car ID and session ID are required" },
        { status: 400 }
      );
    }

    console.log("Deleting saved article:", { carId, sessionId });

    const db = await getDatabase();

    // First, find the document to verify we're deleting the correct one
    const articleToDelete = await db.collection("saved_articles").findOne({
      carId,
      "metadata.sessionId": sessionId,
    });

    console.log("Found article to delete:", {
      found: !!articleToDelete,
      articleId: articleToDelete?._id?.toString(),
      stage: articleToDelete?.stage,
      createdAt: articleToDelete?.createdAt,
      sessionId: articleToDelete?.metadata?.sessionId,
    });

    if (!articleToDelete) {
      return NextResponse.json(
        { error: "Saved article not found" },
        { status: 404 }
      );
    }

    // Delete the saved article
    const result = await db.collection("saved_articles").deleteOne({
      _id: articleToDelete._id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete article" },
        { status: 404 }
      );
    }

    console.log("Successfully deleted saved article:", {
      carId,
      sessionId,
      articleId: articleToDelete._id.toString(),
      stage: articleToDelete.stage,
      deletedCount: result.deletedCount,
    });

    return NextResponse.json({
      success: true,
      deleted: {
        id: articleToDelete._id.toString(),
        stage: articleToDelete.stage,
        sessionId: articleToDelete.metadata.sessionId,
        createdAt: articleToDelete.createdAt,
      },
    });
  } catch (error) {
    console.error("Error deleting saved article:", error);
    return NextResponse.json(
      { error: "Failed to delete saved article" },
      { status: 500 }
    );
  }
}
