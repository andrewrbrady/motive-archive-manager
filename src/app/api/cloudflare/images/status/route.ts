import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

// Set maximum execution time to 30 seconds
export const maxDuration = 30;
export const runtime = "nodejs";

// Helper function to get MongoDB client
async function getMongoClient() {
  const client = new MongoClient(process.env.MONGODB_URI || "");
  await client.connect();
  return client;
}

export async function POST(request: NextRequest) {
  let mongoClient;
  try {
    const { id } = await request.json();
    // [REMOVED] // [REMOVED] console.log("[STATUS API] Checking status for image ID:", id);

    if (!id) {
      return NextResponse.json(
        { error: "No image ID provided" },
        { status: 400 }
      );
    }

    // First check if the image exists in MongoDB
    mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DB || "motive_archive");
    const imagesCollection = db.collection("images");

    // Try to find the image by cloudflareId
    const image = await imagesCollection.findOne({ cloudflareId: id });
    // [REMOVED] // [REMOVED] console.log("[STATUS API] MongoDB image found:", image ? "yes" : "no");

    if (image) {
      console.log(
        "[STATUS API] Image metadata:",
        JSON.stringify(image.metadata || {}, null, 2)
      );

      // If the image has complete metadata with OpenAI analysis, return it
      if (
        image.metadata?.aiAnalysis?.angle ||
        image.metadata?.aiAnalysis?.description ||
        image.metadata?.angle ||
        image.metadata?.description
      ) {
        // [REMOVED] // [REMOVED] console.log("[STATUS API] Analysis found, returning complete status");
        return NextResponse.json({
          status: "complete",
          ready: true,
          metadata: image.metadata,
        });
      }
    }

    // If we get here, we need to check with Cloudflare
    // [REMOVED] // [REMOVED] console.log("[STATUS API] Checking with Cloudflare");
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1/${id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[STATUS API] Error getting image status from Cloudflare:",
        {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        }
      );
      return NextResponse.json(
        {
          error: `Failed to check image status: ${response.statusText}`,
          status: "error",
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (!result.success) {
      console.error("[STATUS API] Cloudflare API error:", result.errors);
      return NextResponse.json(
        {
          error: result.errors?.[0]?.message || "Unknown Cloudflare error",
          status: "error",
        },
        { status: 400 }
      );
    }

    // If the image exists in Cloudflare but not in our DB or doesn't have metadata,
    // it might still be processing, or the OpenAI analysis might have failed
    if (image) {
      // Check if the image was recently uploaded (within the last 2 minutes)
      const imageCreatedAt = new Date(image.createdAt);
      const now = new Date();
      const timeDiffMinutes =
        (now.getTime() - imageCreatedAt.getTime()) / (1000 * 60);

      // If it's been less than 2 minutes, assume it's still processing
      if (timeDiffMinutes < 2) {
        console.log(
          "[STATUS API] Image is recent, returning processing status"
        );
        return NextResponse.json({
          status: "processing",
          ready: false,
          metadata: image.metadata || {},
        });
      }

      // Otherwise, check if OpenAI analysis is available but not reflected in MongoDB
      try {
        // Attempt to re-fetch the OpenAI analysis for this image
        const imageUrl = image.url;
        const vehicleInfo = image.metadata?.vehicleInfo;

        // [REMOVED] // [REMOVED] console.log("[STATUS API] Attempting to re-analyze image with OpenAI");
        const analysisResponse = await fetch(
          `${request.nextUrl.origin}/api/openai/analyze-image`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageUrl,
              vehicleInfo,
            }),
          }
        );

        if (analysisResponse.ok) {
          const analysisResult = await analysisResponse.json();
          if (analysisResult.analysis) {
            // Update the image metadata in MongoDB
            const updatedMetadata = {
              ...image.metadata,
              angle: analysisResult.analysis?.angle || "",
              view: analysisResult.analysis?.view || "",
              movement: analysisResult.analysis?.movement || "",
              tod: analysisResult.analysis?.tod || "",
              side: analysisResult.analysis?.side || "",
              description: analysisResult.analysis?.description || "",
              aiAnalysis: analysisResult.analysis,
            };

            // Update the MongoDB document
            await imagesCollection.updateOne(
              { _id: image._id },
              {
                $set: {
                  metadata: updatedMetadata,
                  updatedAt: new Date().toISOString(),
                },
              }
            );

            console.log(
              "[STATUS API] Successfully updated image with new OpenAI analysis"
            );
            return NextResponse.json({
              status: "complete",
              ready: true,
              metadata: updatedMetadata,
            });
          }
        }
      } catch (error) {
        console.error("[STATUS API] Error re-analyzing image:", error);
      }

      // If all else fails, return the current metadata
      console.log(
        "[STATUS API] Returning current metadata, indicating still processing"
      );
      return NextResponse.json({
        status: "processing",
        ready: false,
        metadata: image.metadata || {},
      });
    } else {
      // Image exists in Cloudflare but not in our DB - the upload is incomplete
      // [REMOVED] // [REMOVED] console.log("[STATUS API] Image exists in Cloudflare but not in MongoDB");
      return NextResponse.json({
        status: "uploading",
        ready: false,
      });
    }
  } catch (error) {
    console.error("[STATUS API] Error checking image status:", error);
    return NextResponse.json(
      { error: "Failed to check image status", status: "error" },
      { status: 500 }
    );
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}
