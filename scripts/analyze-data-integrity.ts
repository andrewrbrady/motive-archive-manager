#!/usr/bin/env tsx

import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/motive-archive";

interface IntegrityReport {
  rawAssets: {
    total: number;
    withInvalidHardDriveIds: number;
    withInvalidCarIds: number;
    orphanedHardDriveRefs: string[];
    orphanedCarRefs: string[];
    typeInconsistencies: {
      hardDriveIds: number;
      carIds: number;
    };
  };
  hardDrives: {
    total: number;
    withInvalidRawAssetRefs: number;
    orphanedRawAssetRefs: string[];
  };
  cars: {
    total: number;
  };
}

async function analyzeDataIntegrity() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    const report: IntegrityReport = {
      rawAssets: {
        total: 0,
        withInvalidHardDriveIds: 0,
        withInvalidCarIds: 0,
        orphanedHardDriveRefs: [],
        orphanedCarRefs: [],
        typeInconsistencies: {
          hardDriveIds: 0,
          carIds: 0,
        },
      },
      hardDrives: {
        total: 0,
        withInvalidRawAssetRefs: 0,
        orphanedRawAssetRefs: [],
      },
      cars: {
        total: 0,
      },
    };

    console.log("🔍 Analyzing data integrity (DRY RUN)...\n");

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

    // 1. Analyze Raw Assets
    console.log("🔧 Analyzing raw assets...");
    const rawAssets = await rawCollection.find({}).toArray();
    report.rawAssets.total = rawAssets.length;

    for (const asset of rawAssets) {
      let hasInvalidHardDriveIds = false;
      let hasInvalidCarIds = false;

      // Check hardDriveIds
      if (asset.hardDriveIds && Array.isArray(asset.hardDriveIds)) {
        let hasTypeInconsistency = false;

        for (const id of asset.hardDriveIds) {
          if (id) {
            // Check for type inconsistencies
            if (typeof id === "string") {
              hasTypeInconsistency = true;
            }

            try {
              const objectId = typeof id === "string" ? new ObjectId(id) : id;

              // Check if the hard drive actually exists
              if (!existingHardDriveIds.has(objectId.toString())) {
                report.rawAssets.orphanedHardDriveRefs.push(
                  `${asset._id} -> ${objectId}`
                );
                hasInvalidHardDriveIds = true;
              }
            } catch (error) {
              console.log(
                `❌ Invalid hardDriveId: ${id} in raw asset ${asset._id}`
              );
              hasInvalidHardDriveIds = true;
            }
          }
        }

        if (hasTypeInconsistency) {
          report.rawAssets.typeInconsistencies.hardDriveIds++;
        }
      }

      // Check carIds
      if (asset.carIds && Array.isArray(asset.carIds)) {
        let hasTypeInconsistency = false;

        for (const id of asset.carIds) {
          if (id) {
            // Check for type inconsistencies
            if (typeof id === "string") {
              hasTypeInconsistency = true;
            }

            try {
              const objectId = typeof id === "string" ? new ObjectId(id) : id;

              // Check if the car actually exists
              if (!existingCarIds.has(objectId.toString())) {
                report.rawAssets.orphanedCarRefs.push(
                  `${asset._id} -> ${objectId}`
                );
                hasInvalidCarIds = true;
              }
            } catch (error) {
              console.log(`❌ Invalid carId: ${id} in raw asset ${asset._id}`);
              hasInvalidCarIds = true;
            }
          }
        }

        if (hasTypeInconsistency) {
          report.rawAssets.typeInconsistencies.carIds++;
        }
      }

      if (hasInvalidHardDriveIds) report.rawAssets.withInvalidHardDriveIds++;
      if (hasInvalidCarIds) report.rawAssets.withInvalidCarIds++;
    }

    // 2. Analyze Hard Drives
    console.log("\n🔧 Analyzing hard drives...");
    const hardDrives = await hardDrivesCollection.find({}).toArray();
    report.hardDrives.total = hardDrives.length;

    const existingRawAssetIds = new Set(
      (await rawCollection.find({}, { projection: { _id: 1 } }).toArray()).map(
        (doc) => doc._id.toString()
      )
    );

    for (const drive of hardDrives) {
      let hasInvalidRawAssetRefs = false;

      // Check rawAssets array (if it exists)
      if (drive.rawAssets && Array.isArray(drive.rawAssets)) {
        for (const id of drive.rawAssets) {
          if (id) {
            try {
              const objectId = typeof id === "string" ? new ObjectId(id) : id;

              // Check if the raw asset actually exists
              if (!existingRawAssetIds.has(objectId.toString())) {
                report.hardDrives.orphanedRawAssetRefs.push(
                  `${drive._id} -> ${objectId}`
                );
                hasInvalidRawAssetRefs = true;
              }
            } catch (error) {
              console.log(
                `❌ Invalid rawAssetId: ${id} in hard drive ${drive._id}`
              );
              hasInvalidRawAssetRefs = true;
            }
          }
        }
      }

      if (hasInvalidRawAssetRefs) report.hardDrives.withInvalidRawAssetRefs++;
    }

    // 3. Count Cars
    const cars = await carsCollection.find({}).toArray();
    report.cars.total = cars.length;

    // Print detailed report
    console.log("\n📋 DATA INTEGRITY ANALYSIS REPORT");
    console.log("==================================");

    console.log(`\n📁 Raw Assets (${report.rawAssets.total} total):`);
    console.log(
      `  🔗 Assets with invalid hard drive references: ${report.rawAssets.withInvalidHardDriveIds}`
    );
    console.log(
      `  🔗 Assets with invalid car references: ${report.rawAssets.withInvalidCarIds}`
    );
    console.log(
      `  📝 Type inconsistencies in hardDriveIds: ${report.rawAssets.typeInconsistencies.hardDriveIds}`
    );
    console.log(
      `  📝 Type inconsistencies in carIds: ${report.rawAssets.typeInconsistencies.carIds}`
    );
    console.log(
      `  ⚠️  Orphaned hard drive references: ${report.rawAssets.orphanedHardDriveRefs.length}`
    );
    console.log(
      `  ⚠️  Orphaned car references: ${report.rawAssets.orphanedCarRefs.length}`
    );

    console.log(`\n💾 Hard Drives (${report.hardDrives.total} total):`);
    console.log(
      `  🔗 Drives with invalid raw asset references: ${report.hardDrives.withInvalidRawAssetRefs}`
    );
    console.log(
      `  ⚠️  Orphaned raw asset references: ${report.hardDrives.orphanedRawAssetRefs.length}`
    );

    console.log(`\n🚗 Cars: ${report.cars.total} total`);

    // Show sample orphaned references
    if (report.rawAssets.orphanedHardDriveRefs.length > 0) {
      console.log(`\n🔍 Sample orphaned hard drive references (first 5):`);
      report.rawAssets.orphanedHardDriveRefs.slice(0, 5).forEach((ref) => {
        console.log(`  - ${ref}`);
      });
    }

    if (report.rawAssets.orphanedCarRefs.length > 0) {
      console.log(`\n🔍 Sample orphaned car references (first 5):`);
      report.rawAssets.orphanedCarRefs.slice(0, 5).forEach((ref) => {
        console.log(`  - ${ref}`);
      });
    }

    const totalIssues =
      report.rawAssets.withInvalidHardDriveIds +
      report.rawAssets.withInvalidCarIds +
      report.hardDrives.withInvalidRawAssetRefs +
      report.rawAssets.typeInconsistencies.hardDriveIds +
      report.rawAssets.typeInconsistencies.carIds;

    console.log(`\n🎯 SUMMARY:`);
    console.log(`  ⚠️  Total issues found: ${totalIssues}`);
    console.log(
      `  📊 Total orphaned references: ${report.rawAssets.orphanedHardDriveRefs.length + report.rawAssets.orphanedCarRefs.length + report.hardDrives.orphanedRawAssetRefs.length}`
    );

    if (totalIssues > 0) {
      console.log(
        `\n💡 RECOMMENDATION: Run the sanitization script to fix these issues.`
      );
      console.log(`   Command: tsx scripts/sanitize-production-data.ts`);
    } else {
      console.log(`\n✨ Data integrity looks good!`);
    }

    return report;
  } catch (error) {
    console.error("❌ Error during analysis:", error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the analysis if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeDataIntegrity()
    .then(() => {
      console.log("\n🎉 Analysis complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Analysis failed:", error);
      process.exit(1);
    });
}

export { analyzeDataIntegrity };
