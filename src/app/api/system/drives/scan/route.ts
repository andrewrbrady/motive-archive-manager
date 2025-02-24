import { NextResponse } from "next/server";
import { execAsync } from "@/lib/exec";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import fs from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const { drivePath } = await request.json();

    if (!drivePath) {
      return NextResponse.json(
        { error: "Drive path is required" },
        { status: 400 }
      );
    }

    // Get root level folders
    const folders = await fs.readdir(drivePath, { withFileTypes: true });
    const datePatternFolders = folders
      .filter(
        (dirent) => dirent.isDirectory() && /^\d{6}$/.test(dirent.name) // Match YYMMDD pattern
      )
      .map((dirent) => dirent.name);

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Find raw assets with matching date patterns
    const matchingRawAssets = await db
      .collection("raw")
      .find({ date: { $in: datePatternFolders } })
      .toArray();

    // Get the drive ID from the path
    const driveResponse = await db
      .collection("hard-drives")
      .findOne({ systemName: path.basename(drivePath) });

    if (!driveResponse) {
      return NextResponse.json(
        { error: "Drive not found in database" },
        { status: 404 }
      );
    }

    const driveId = driveResponse._id;

    // Update raw assets with the drive location
    const updatePromises = matchingRawAssets.map((asset) => {
      const locations = asset.locations || [];
      if (!locations.includes(driveId)) {
        locations.push(driveId);
        return db
          .collection("raw")
          .updateOne({ _id: asset._id }, { $set: { locations: locations } });
      }
      return Promise.resolve();
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      matchedAssets: matchingRawAssets.length,
      scannedFolders: datePatternFolders.length,
    });
  } catch (error) {
    console.error("Error scanning drive:", error);
    return NextResponse.json(
      { error: "Failed to scan drive" },
      { status: 500 }
    );
  }
}
