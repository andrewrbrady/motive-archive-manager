import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { content, stage, metadata } = await request.json();
      const carId = params.id;

      if (!carId || !content || !stage || !metadata) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      console.log("Saving article:", {
        carId,
        stage,
        contentLength: content.length,
        hasMetadata: !!metadata,
      });

      const { db } = await connectToDatabase();

      // Save the article version
      const result = await db.collection("saved_articles").insertOne({
        carId,
        content,
        stage,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("Article saved successfully:", {
        id: result.insertedId,
        stage,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, id: result.insertedId });
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
