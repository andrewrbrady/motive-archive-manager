import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { content, stage, sessionId } = await request.json();
      const carId = params.id;

      if (!carId || !content || !stage || !sessionId) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      console.log("Saving article:", {
        carId,
        stage,
        contentLength: content.length,
        sessionId,
      });

      const db = await getDatabase();

      // Save the article state
      const result = await db.collection("article_states").updateOne(
        { carId, sessionId },
        {
          $set: {
            content,
            stage,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      console.log("Article saved successfully:", {
        id: result.upsertedId || sessionId,
        stage,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        id: result.upsertedId || sessionId,
      });
    } catch (error) {
      lastError = error;
      console.error(`Save attempt ${attempt + 1} failed:`, error);

      // If it's not the last attempt, wait before retrying
      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.log(`Retrying save in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // If we get here, all retries failed
  console.error("All save attempts failed:", lastError);
  return NextResponse.json(
    { error: "Failed to save article after multiple attempts" },
    { status: 500 }
  );
}
