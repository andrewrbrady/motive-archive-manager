#!/usr/bin/env tsx

import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/motive-archive";

interface SanitizationReport {
  rawAssets: {
    total: number;
    fixedHardDriveIds: number;
    fixedCarIds: number;
    orphanedHardDriveRefs: number;
    orphanedCarRefs: number;
  };
  hardDrives: {
    total: number;
    fixedRawAssetIds: number;
    orphanedRawAssetRefs: number;
  };
  cars: {
    total: number;
    checked: number;
  };
}

async function sanitizeProductionData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    const report: SanitizationReport = {
      rawAssets: {
        total: 0,
        fixedHardDriveIds: 0,
        fixedCarIds: 0,
        orphanedHardDriveRefs: 0,
        orphanedCarRefs: 0,
      },
      hardDrives: {
        total: 0,
        fixedRawAssetIds: 0,
        orphanedRawAssetRefs: 0,
      },
      cars: {
        total: 0,
        checked: 0,
      },
    };

    console.log("🔍 Starting data sanitization...\n");

    // Get all collections
    const rawCollection = db.collection("raw_assets");
    const hardDrivesCollection = db.collection("hard_drives");
    const carsCollection = db.collection("cars");

    // Get all existing IDs for validation
    const existingHardDriveIds = new Set(
      (
        await hardDrivesCollection
          .find({}, { projection: { _id: 1 } })
          .toArray()
      ).map((doc) => doc._id.toString())
    );

    const existingCarIds = new Set(
      (await carsCollection.find({}, { projection: { _id: 1 } }).toArray()).map(
        (doc) => doc._id.toString()
      )
    );

    console.log(
      `📊 Found ${existingHardDriveIds.size} hard drives and ${existingCarIds.size} cars\n`
    );

    // 1. Sanitize Raw Assets
    console.log("🔧 Sanitizing raw assets...");
    const rawAssets = await rawCollection.find({}).toArray();
    report.rawAssets.total = rawAssets.length;

    for (const asset of rawAssets) {
      const updates: any = {};
      let needsUpdate = false;

      // Fix hardDriveIds
      if (asset.hardDriveIds && Array.isArray(asset.hardDriveIds)) {
        const sanitizedHardDriveIds: ObjectId[] = [];
        const validHardDriveIds: ObjectId[] = [];

        for (const id of asset.hardDriveIds) {
          if (id) {
            try {
              const objectId = typeof id === "string" ? new ObjectId(id) : id;
              sanitizedHardDriveIds.push(objectId);

              // Check if the hard drive actually exists
              if (existingHardDriveIds.has(objectId.toString())) {
                validHardDriveIds.push(objectId);
              } else {
                report.rawAssets.orphanedHardDriveRefs++;
                console.log(
                  `⚠️  Orphaned hard drive reference: ${objectId} in raw asset ${asset._id}`
                );
              }
            } catch (error) {
              console.log(
                `❌ Invalid hardDriveId: ${id} in raw asset ${asset._id}`
              );
            }
          }
        }

        if (
          JSON.stringify(sanitizedHardDriveIds) !==
          JSON.stringify(asset.hardDriveIds)
        ) {
          updates.hardDriveIds = validHardDriveIds;
          needsUpdate = true;
          report.rawAssets.fixedHardDriveIds++;
        }
      }

      // Fix carIds
      if (asset.carIds && Array.isArray(asset.carIds)) {
        const sanitizedCarIds: ObjectId[] = [];
        const validCarIds: ObjectId[] = [];

        for (const id of asset.carIds) {
          if (id) {
            try {
              const objectId = typeof id === "string" ? new ObjectId(id) : id;
              sanitizedCarIds.push(objectId);

              // Check if the car actually exists
              if (existingCarIds.has(objectId.toString())) {
                validCarIds.push(objectId);
              } else {
                report.rawAssets.orphanedCarRefs++;
                console.log(
                  `⚠️  Orphaned car reference: ${objectId} in raw asset ${asset._id}`
                );
              }
            } catch (error) {
              console.log(`❌ Invalid carId: ${id} in raw asset ${asset._id}`);
            }
          }
        }

        if (JSON.stringify(sanitizedCarIds) !== JSON.stringify(asset.carIds)) {
          updates.carIds = validCarIds;
          needsUpdate = true;
          report.rawAssets.fixedCarIds++;
        }
      }

      // Apply updates
      if (needsUpdate) {
        await rawCollection.updateOne({ _id: asset._id }, { $set: updates });
      }
    }

    // 2. Sanitize Hard Drives
    console.log("\n🔧 Sanitizing hard drives...");
    const hardDrives = await hardDrivesCollection.find({}).toArray();
    report.hardDrives.total = hardDrives.length;

    const existingRawAssetIds = new Set(
      (await rawCollection.find({}, { projection: { _id: 1 } }).toArray()).map(
        (doc) => doc._id.toString()
      )
    );

    for (const drive of hardDrives) {
      const updates: any = {};
      let needsUpdate = false;

      // Fix rawAssets array (if it exists)
      if (drive.rawAssets && Array.isArray(drive.rawAssets)) {
        const sanitizedRawAssetIds: ObjectId[] = [];

        for (const id of drive.rawAssets) {
          if (id) {
            try {
              const objectId = typeof id === "string" ? new ObjectId(id) : id;

              // Check if the raw asset actually exists
              if (existingRawAssetIds.has(objectId.toString())) {
                sanitizedRawAssetIds.push(objectId);
              } else {
                report.hardDrives.orphanedRawAssetRefs++;
                console.log(
                  `⚠️  Orphaned raw asset reference: ${objectId} in hard drive ${drive._id}`
                );
              }
            } catch (error) {
              console.log(
                `❌ Invalid rawAssetId: ${id} in hard drive ${drive._id}`
              );
            }
          }
        }

        if (
          JSON.stringify(sanitizedRawAssetIds) !==
          JSON.stringify(drive.rawAssets)
        ) {
          updates.rawAssets = sanitizedRawAssetIds;
          needsUpdate = true;
          report.hardDrives.fixedRawAssetIds++;
        }
      }

      // Apply updates
      if (needsUpdate) {
        await hardDrivesCollection.updateOne(
          { _id: drive._id },
          { $set: updates }
        );
      }
    }

    // 3. Check Cars (mostly for reporting)
    console.log("\n🔧 Checking cars...");
    const cars = await carsCollection.find({}).toArray();
    report.cars.total = cars.length;
    report.cars.checked = cars.length;

    // Print final report
    console.log("\n📋 SANITIZATION REPORT");
    console.log("========================");
    console.log(`\n📁 Raw Assets (${report.rawAssets.total} total):`);
    console.log(
      `  ✅ Fixed hardDriveIds: ${report.rawAssets.fixedHardDriveIds}`
    );
    console.log(`  ✅ Fixed carIds: ${report.rawAssets.fixedCarIds}`);
    console.log(
      `  ⚠️  Orphaned hard drive refs: ${report.rawAssets.orphanedHardDriveRefs}`
    );
    console.log(`  ⚠️  Orphaned car refs: ${report.rawAssets.orphanedCarRefs}`);

    console.log(`\n💾 Hard Drives (${report.hardDrives.total} total):`);
    console.log(
      `  ✅ Fixed rawAssetIds: ${report.hardDrives.fixedRawAssetIds}`
    );
    console.log(
      `  ⚠️  Orphaned raw asset refs: ${report.hardDrives.orphanedRawAssetRefs}`
    );

    console.log(`\n🚗 Cars (${report.cars.total} total):`);
    console.log(`  ✅ Checked: ${report.cars.checked}`);

    const totalIssuesFixed =
      report.rawAssets.fixedHardDriveIds +
      report.rawAssets.fixedCarIds +
      report.hardDrives.fixedRawAssetIds;

    const totalOrphanedRefs =
      report.rawAssets.orphanedHardDriveRefs +
      report.rawAssets.orphanedCarRefs +
      report.hardDrives.orphanedRawAssetRefs;

    console.log(`\n🎯 SUMMARY:`);
    console.log(`  ✅ Total issues fixed: ${totalIssuesFixed}`);
    console.log(`  ⚠️  Total orphaned references: ${totalOrphanedRefs}`);

    if (totalIssuesFixed > 0) {
      console.log(`\n✨ Data sanitization completed successfully!`);
    } else {
      console.log(`\n✨ No issues found - data is already clean!`);
    }

    return report;
  } catch (error) {
    console.error("❌ Error during sanitization:", error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the sanitization if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sanitizeProductionData()
    .then(() => {
      console.log("\n🎉 Sanitization complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Sanitization failed:", error);
      process.exit(1);
    });
}

export { sanitizeProductionData };
