import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";

// Save file to disk
async function saveFile(file: File, originalFilename: string): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  // Create directory if it doesn't exist
  try {
    await mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    console.log("Directory already exists or error creating directory:", error);
  }

  // Generate a unique filename
  const uniqueFilename = `${uuidv4()}-${originalFilename}`;
  const filePath = path.join(uploadsDir, uniqueFilename);

  console.log("Saving file:", {
    originalFilename,
    uniqueFilename,
    filePath,
    fileSize: file.size,
  });

  // Convert file to buffer and save it
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  console.log("File saved successfully");

  // Return the URL path to the file
  return `/uploads/${uniqueFilename}`;
}

export async function POST(request: NextRequest) {
  console.log("Upload API called");
  try {
    // In App Router, we can use the built-in formData method
    console.log("Parsing form data...");
    const formData = await request.formData();

    // Log form data entries for debugging
    console.log("Form data entries:");
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(
          `${key}: File (${value.name}, ${value.type}, ${value.size} bytes)`
        );
      } else {
        console.log(`${key}: ${value}`);
      }
    }

    // Get the uploaded file
    const file = formData.get("file") as File | null;
    if (!file) {
      console.log("No file provided in request");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check if itemId was provided
    const itemId = formData.get("itemId") as string | null;
    if (!itemId) {
      console.log("No itemId provided in request");
      return NextResponse.json(
        { error: "No itemId provided" },
        { status: 400 }
      );
    }

    // Save the file and get its URL
    console.log("Saving file to disk...");
    const fileUrl = await saveFile(file, file.name);
    console.log("File URL:", fileUrl);

    // Success! Return the image URL with the same format as the original API
    const response = {
      id: path.basename(fileUrl),
      filename: file.name,
      uploaded: new Date().toISOString(),
      variants: ["public", "thumbnail"],
      imageUrl: fileUrl,
    };

    console.log("Returning response:", response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in upload API:", error);
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
