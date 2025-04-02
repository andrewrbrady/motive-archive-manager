export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dirPath = searchParams.get("path");

    if (!dirPath) {
      return NextResponse.json(
        { error: "Path parameter is required" },
        { status: 400 }
      );
    }

    // Sanitize and validate the path
    const normalizedPath = path.normalize(dirPath);

    // Check if path exists and is a directory
    try {
      const stats = await fs.stat(normalizedPath);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { error: "Specified path is not a directory" },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Directory not found or inaccessible" },
        { status: 404 }
      );
    }

    // Read directory contents
    const items = await fs.readdir(normalizedPath, { withFileTypes: true });

    // Filter for directories only and format response
    const directories = items
      .filter((item) => item.isDirectory())
      .map((dir) => ({
        name: dir.name,
        path: path.join(normalizedPath, dir.name),
        isDirectory: true,
      }));

    return NextResponse.json({
      directories,
      path: normalizedPath,
      count: directories.length,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
    return NextResponse.json(
      { error: "Failed to read directory contents", details: String(error) },
      { status: 500 }
    );
  }
}
