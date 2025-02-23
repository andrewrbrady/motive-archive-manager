import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { RawAsset } from "@/types/inventory";
import { HardDrive } from "@/models/hard-drive";
import { Document, ObjectId } from "mongodb";

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const rawCollection = db.collection("raw");
    const hardDrivesCollection = db.collection("hard_drives");

    const data = await request.json();
    console.log("Received CSV data:", data);

    const assets: (Partial<RawAsset> & { locations: ObjectId[] })[] = [];
    const now = new Date().toISOString();

    // Process each row and handle hard drives
    for (const row of data) {
      // Filter out empty locations and clean up the values
      const locationLabels = [
        row["location 1"],
        row["location 2"],
        row["location 3"],
        row["location 4"],
      ]
        .filter(Boolean)
        .map((location) => location.trim());

      console.log("Processing row with locations:", locationLabels);

      // Array to store the hard drive ObjectIds
      const locationIds: ObjectId[] = [];

      // For each location, check if we need to create a hard drive
      for (const label of locationLabels) {
        // Skip if location is empty
        if (!label) continue;

        console.log("Checking for hard drive with label:", label);

        // Try to find existing hard drive
        const existingDrive = await hardDrivesCollection.findOne({
          label: { $regex: new RegExp(`^${label}$`, "i") }, // Case-insensitive exact match
        });

        let driveId;
        if (!existingDrive) {
          console.log(
            "No existing drive found, creating new drive with label:",
            label
          );

          // Create new hard drive if it doesn't exist
          const newDrive = {
            label: label,
            capacity: {
              total: 0, // Default capacity, can be updated later
            },
            type: "HDD", // Default type
            interface: "USB", // Default interface
            status: "In Use",
            location: "Studio", // Default location
            notes: "Created from raw asset location migration",
            rawAssets: [], // Will be updated after raw asset is created
            createdAt: now,
            updatedAt: now,
          };

          const result = await hardDrivesCollection.insertOne(newDrive);
          driveId = result.insertedId;
          console.log("Created new drive:", driveId.toString());
        } else {
          driveId = existingDrive._id;
          console.log("Found existing drive:", driveId.toString());
        }

        locationIds.push(driveId);
      }

      // Create the raw asset with ObjectIds instead of labels
      const asset: Partial<RawAsset> & { locations: ObjectId[] } = {
        date: row.date,
        client: row.client || undefined,
        description: row.description,
        locations: locationIds, // Store the ObjectIds instead of labels
        createdAt: now,
        updatedAt: now,
      };

      assets.push(asset);
    }

    console.log("Inserting assets:", assets);

    // Insert all processed assets
    const result = await rawCollection.insertMany(
      assets as unknown as Document[]
    );
    console.log("Inserted assets result:", result);

    // Now update the hard drives with the new raw asset IDs
    for (const [index, assetId] of Object.entries(result.insertedIds)) {
      const assetData = assets[parseInt(index)];
      console.log(
        "Updating hard drives for asset:",
        assetId.toString(),
        "with locations:",
        assetData.locations
      );

      // Update each hard drive that corresponds to this asset's locations
      for (const driveId of assetData.locations) {
        console.log(
          "Updating drive:",
          driveId.toString(),
          "with asset:",
          assetId.toString()
        );
        await hardDrivesCollection.updateOne(
          { _id: driveId },
          {
            $addToSet: { rawAssets: assetId },
            $set: { updatedAt: now },
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      insertedCount: result.insertedCount,
      message: "Successfully imported assets and updated hard drives",
    });
  } catch (error) {
    console.error("Error importing raw assets:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to import raw assets",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
