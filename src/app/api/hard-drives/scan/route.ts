import { NextResponse } from "next/server";
import { execAsync } from "@/lib/exec";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import fs from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const { drivePath, driveId } = await request.json();
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Scanning drive path:", drivePath);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Drive ID (raw):", driveId);

    if (!drivePath || !driveId) {
      return NextResponse.json(
        { error: "Drive path and ID are required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB first since we'll need it for multiple operations
    const { db } = await connectToDatabase();

    // Debug: List all collections
    const collections = await db.listCollections().toArray();
    console.log(
      "Available collections:",
      collections.map((c) => c.name)
    );

    // Convert the ID to ObjectId, handling different formats
    let objectId;
    try {
      objectId = typeof driveId === "string" ? new ObjectId(driveId) : driveId;
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Converted to ObjectId:", objectId.toString());
    } catch (error) {
      console.error("Failed to convert drive ID to ObjectId:", error);
      return NextResponse.json(
        { error: "Invalid drive ID format" },
        { status: 400 }
      );
    }

    // Try to find the drive in the hard_drives collection
    const drive = await db.collection("hard_drives").findOne({ _id: objectId });
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Drive found in 'hard_drives' collection:", !!drive);

    if (!drive) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("No drive found with ObjectId:", objectId.toString());
      return NextResponse.json(
        { error: "Drive not found in database" },
        { status: 404 }
      );
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Found drive:", drive._id.toString());

    // Get root level folders
    const folders = await fs.readdir(drivePath, { withFileTypes: true });
    console.log(
      "Found folders:",
      folders.map((f) => f.name)
    );

    const datePatternFolders = folders
      .filter(
        (dirent) => dirent.isDirectory() && /^\d{6}$/.test(dirent.name) // Match YYMMDD pattern
      )
      .map((dirent) => dirent.name);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Date pattern folders:", datePatternFolders);

    // Find raw assets with matching date patterns
    const matchingRawAssets = await db
      .collection("raw_assets")
      .find({ date: { $in: datePatternFolders } })
      .toArray();
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Matching raw assets:", matchingRawAssets.length);

    // Get current rawAssets array or initialize empty array
    const currentRawAssets = drive.rawAssets || [];
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Current raw assets:", currentRawAssets.length);

    // Add new IDs that aren't already in the array
    const updatedRawAssets = Array.from(
      new Set([
        ...currentRawAssets.map((id: ObjectId) => id.toString()),
        ...matchingRawAssets.map((asset) => asset._id.toString()),
      ])
    ).map((id) => new ObjectId(id));
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Updated raw assets:", updatedRawAssets.length);

    // Update both the drive and raw assets
    const updatePromises = [
      // Update the drive with the new rawAssets array
      db
        .collection("hard_drives")
        .updateOne(
          { _id: drive._id },
          { $set: { rawAssets: updatedRawAssets } }
        ),

      // Update each raw asset to include this drive in its hardDriveIds
      ...matchingRawAssets.map((asset) =>
        db.collection("raw_assets").updateOne(
          { _id: asset._id },
          {
            $addToSet: { hardDriveIds: drive._id }, // Use addToSet to avoid duplicates
          }
        )
      ),
    ];

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      matchedAssets: matchingRawAssets.length,
      scannedFolders: datePatternFolders.length,
      addedAssets: updatedRawAssets.length - currentRawAssets.length,
    });
  } catch (error) {
    console.error("Error scanning drive:", error);
    return NextResponse.json(
      { error: "Failed to scan drive" },
      { status: 500 }
    );
  }
}
