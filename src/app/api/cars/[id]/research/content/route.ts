import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");
    const carId =
      searchParams.get("carId") ||
      request.url.split("/cars/")[1]?.split("/")[0];

    console.log("Research Content API - Detailed Debug Info:", {
      requestUrl: request.url,
      fileId,
      carId,
      searchParams: Object.fromEntries(searchParams.entries()),
      headers: Object.fromEntries(request.headers.entries()),
    });

    // Early validation logging
    if (!fileId || !carId) {
      console.error("Research Content API - Missing IDs Debug:", {
        fileId: fileId || "missing",
        carId: carId || "missing",
        urlParts: request.url.split("/"),
        searchParamsRaw: searchParams.toString(),
      });
    }

    // ObjectId validation logging
    let fileObjectId, carObjectId;
    try {
      if (!fileId || !carId) {
        throw new Error("File ID or Car ID is missing");
      }
      fileObjectId = new ObjectId(fileId);
      carObjectId = new ObjectId(carId);
      console.log("Research Content API - ObjectId Validation:", {
        fileIdValid: true,
        carIdValid: true,
        fileObjectId: fileObjectId.toString(),
        carObjectId: carObjectId.toString(),
      });
    } catch (error) {
      console.error("Research Content API - ObjectId Validation Error:", {
        fileId,
        carId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    if (!fileId || !carId) {
      console.error("Research Content API - Missing required IDs:", {
        fileId,
        carId,
      });
      return NextResponse.json(
        { error: "File ID and Car ID are required" },
        { status: 400 }
      );
    }

    // Validate ObjectIds
    try {
      new ObjectId(fileId);
      new ObjectId(carId);
    } catch (error) {
      console.error("Research Content API - Invalid ObjectId:", {
        fileId,
        carId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return NextResponse.json(
        { error: "Invalid File ID or Car ID format" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    console.log("Research Content API - MongoDB Connected");

    // First try to find the file in research_files collection
    const query = {
      _id: new ObjectId(fileId),
      $or: [
        { carId: new ObjectId(carId) },
        { carId: carId },
        { "metadata.carId": new ObjectId(carId) },
        { "metadata.carId": carId },
      ],
    };

    console.log("Research Content API - Database Query:", {
      collection: "research_files",
      query: {
        _id: query._id.toString(),
        $or: query.$or.map((condition) => {
          if ("carId" in condition && condition.carId) {
            return { carId: condition.carId.toString() };
          }
          if ("metadata.carId" in condition && condition["metadata.carId"]) {
            return { "metadata.carId": condition["metadata.carId"].toString() };
          }
          return condition;
        }),
      },
      dbName: db.databaseName,
    });

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(
      "Research Content API - Available collections:",
      collections.map((c) => c.name)
    );

    // Check if collections exist
    const researchFilesExists = collections.some(
      (c) => c.name === "research_files"
    );
    const researchExists = collections.some((c) => c.name === "research");
    console.log("Research Content API - Collection Check:", {
      researchFilesExists,
      researchExists,
    });

    const file = await db.collection("research_files").findOne(query);
    console.log("Research Content API - Initial query result:", {
      found: !!file,
      fileDetails: file
        ? {
            id: file._id.toString(),
            carId: file.carId.toString(),
            filename: file.filename,
            hasContent: !!file.content,
            hasS3Key: !!file.s3Key,
            s3Key: file.s3Key,
          }
        : null,
    });

    let researchFile = file;
    if (!researchFile) {
      console.log(
        "Research Content API - File not found in research_files, trying research collection"
      );
      // Try research collection if not found
      researchFile = await db.collection("research").findOne(query);
      console.log("Research Content API - Fallback query result:", {
        found: !!researchFile,
        fileDetails: researchFile
          ? {
              id: researchFile._id.toString(),
              carId: researchFile.carId.toString(),
              filename: researchFile.filename,
              hasContent: !!researchFile.content,
              hasS3Key: !!researchFile.s3Key,
              s3Key: researchFile.s3Key,
            }
          : null,
      });
      if (!researchFile) {
        console.error(
          "Research Content API - File not found in either collection"
        );
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    }

    console.log("Research Content API - File found:", {
      id: researchFile._id.toString(),
      filename: researchFile.filename,
      hasContent: !!researchFile.content,
      hasS3Key: !!researchFile.s3Key,
      s3Key: researchFile.s3Key,
    });

    // First check if content is stored in MongoDB
    if (researchFile.content) {
      console.log("Research Content API - Returning content from MongoDB");
      return new NextResponse(researchFile.content, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    // If no content in MongoDB, get from S3
    if (!researchFile.s3Key) {
      console.error("Research Content API - File has no content and no S3 key");
      return NextResponse.json(
        { error: "File content not found" },
        { status: 404 }
      );
    }

    try {
      console.log("Research Content API - Fetching from S3:", {
        bucket: process.env.AWS_BUCKET_NAME,
        key: researchFile.s3Key,
      });

      const s3Response = await s3.send(
        new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: researchFile.s3Key,
        })
      );

      if (!s3Response.Body) {
        console.error("Research Content API - S3 response has no body");
        throw new Error("Failed to get file content from S3");
      }

      // Convert stream to text
      const content = await s3Response.Body.transformToString();
      console.log(
        "Research Content API - Successfully retrieved content from S3"
      );

      // Store content in MongoDB for future use
      await db
        .collection("research_files")
        .updateOne(
          { _id: researchFile._id },
          { $set: { content, updatedAt: new Date() } }
        );

      return new NextResponse(content, {
        headers: { "Content-Type": "text/plain" },
      });
    } catch (error) {
      console.error("Research Content API - S3 Error:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return NextResponse.json(
        { error: "Failed to fetch content from S3" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Research Content API - Error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to fetch file content" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const carId = segments[segments.length - 3]; // -3 because URL is /cars/[id]/research/content

    const { fileId, content } = await request.json();

    if (!fileId || !carId || content === undefined) {
      return NextResponse.json(
        { error: "File ID, Car ID, and content are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Update the file content
    const query = {
      _id: new ObjectId(fileId),
      $or: [
        { carId: new ObjectId(carId) },
        { carId: carId },
        { "metadata.carId": new ObjectId(carId) },
        { "metadata.carId": carId },
      ],
    };

    // First try research_files collection
    const result = await db.collection("research_files").updateOne(query, {
      $set: {
        content,
        updatedAt: new Date(),
      },
    });

    if (result.matchedCount === 0) {
      // Try the research collection if not found in research_files
      const researchResult = await db.collection("research").updateOne(query, {
        $set: {
          content,
          updatedAt: new Date(),
        },
      });

      if (researchResult.matchedCount === 0) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating file content:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update file content",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
