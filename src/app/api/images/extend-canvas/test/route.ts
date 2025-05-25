import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    // Check if extend_canvas executable exists
    const executablePath = path.join(process.cwd(), "extend_canvas");

    try {
      await fs.access(executablePath);
      const stats = await fs.stat(executablePath);

      return NextResponse.json({
        success: true,
        executableExists: true,
        executablePath,
        fileSize: stats.size,
        isExecutable: (stats.mode & parseInt("111", 8)) !== 0,
        cwd: process.cwd(),
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        executableExists: false,
        executablePath,
        error: error instanceof Error ? error.message : "Unknown error",
        cwd: process.cwd(),
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
