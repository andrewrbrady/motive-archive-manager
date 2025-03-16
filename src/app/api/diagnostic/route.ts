import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { getMongoClient, validateConnection } from "@/lib/mongodb";

export async function GET(request: Request) {
  const diagnosticResults: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: process.env.VERCEL === "1",
    tests: {},
  };

  // Sanitize connection string for safe logging (hide credentials)
  function sanitizeUri(uri: string): string {
    try {
      const url = new URL(uri);
      // Replace username and password with asterisks
      if (url.username) url.username = "***";
      if (url.password) url.password = "***";
      return url.toString();
    } catch (e) {
      // If parsing fails, do basic sanitization
      return uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
    }
  }

  try {
    // Test 1: Basic Environment Variables
    diagnosticResults.tests.environmentVars = {
      hasMongoUri: !!process.env.MONGODB_URI,
      uriPrefix: process.env.MONGODB_URI
        ? sanitizeUri(process.env.MONGODB_URI).substring(0, 30) + "..."
        : null,
      hasMongoDb: !!process.env.MONGODB_DB,
      dbName: process.env.MONGODB_DB || "motive_archive",
    };

    // Test 2: Connection Validation
    try {
      diagnosticResults.tests.connectionValidation = {
        status: "running",
      };
      const isConnected = await validateConnection();
      diagnosticResults.tests.connectionValidation = {
        status: "completed",
        success: isConnected,
      };
    } catch (error) {
      diagnosticResults.tests.connectionValidation = {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    // Test 3: Direct MongoDB Connection (bypass cached promise)
    try {
      diagnosticResults.tests.directConnection = {
        status: "running",
      };

      if (!process.env.MONGODB_URI) {
        diagnosticResults.tests.directConnection = {
          status: "skipped",
          reason: "MONGODB_URI not defined",
        };
      } else {
        const directClient = new MongoClient(process.env.MONGODB_URI, {
          connectTimeoutMS: 5000,
          socketTimeoutMS: 5000,
          serverSelectionTimeoutMS: 5000,
        });

        // Try to connect directly
        await directClient.connect();
        diagnosticResults.tests.directConnection = {
          status: "success",
          connected: true,
        };

        // Try to check server info
        const serverInfo = await directClient.db().admin().serverInfo();
        diagnosticResults.tests.directConnection.serverInfo = {
          version: serverInfo.version,
          gitVersion: serverInfo.gitVersion,
        };

        await directClient.close();
      }
    } catch (error) {
      diagnosticResults.tests.directConnection = {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    // Test 4: Database and Collections
    try {
      diagnosticResults.tests.databaseInfo = {
        status: "running",
      };

      const client = await getMongoClient(2, 300);
      const db = client.db();

      // Get database name
      const dbName = db.databaseName;

      // List all collections
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map((c) => c.name);

      // Check for specific collections
      const hasHardDrives = collectionNames.includes("hard_drives");
      const hasRawAssets = collectionNames.includes("raw_assets");

      // Get counts if collections exist
      let hardDrivesCount = 0;
      let rawAssetsCount = 0;

      if (hasHardDrives) {
        hardDrivesCount = await db.collection("hard_drives").countDocuments();
      }

      if (hasRawAssets) {
        rawAssetsCount = await db.collection("raw_assets").countDocuments();
      }

      // Try to find one document from each collection
      let hardDriveSample = null;
      let rawAssetSample = null;

      if (hasHardDrives) {
        const hardDrive = await db
          .collection("hard_drives")
          .findOne({}, { projection: { _id: 1 } });
        hardDriveSample = hardDrive ? { hasId: !!hardDrive._id } : null;
      }

      if (hasRawAssets) {
        const rawAsset = await db
          .collection("raw_assets")
          .findOne({}, { projection: { _id: 1 } });
        rawAssetSample = rawAsset ? { hasId: !!rawAsset._id } : null;
      }

      diagnosticResults.tests.databaseInfo = {
        status: "completed",
        dbName,
        collections: {
          total: collectionNames.length,
          names: collectionNames,
        },
        hardDrives: {
          exists: hasHardDrives,
          count: hardDrivesCount,
          sample: hardDriveSample,
        },
        rawAssets: {
          exists: hasRawAssets,
          count: rawAssetsCount,
          sample: rawAssetSample,
        },
      };
    } catch (error) {
      diagnosticResults.tests.databaseInfo = {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    // Test 5: Case Sensitivity Check
    try {
      diagnosticResults.tests.caseSensitivityCheck = {
        status: "running",
      };

      const client = await getMongoClient(2, 300);
      const db = client.db();

      // Check for variations of collection names
      const variations = [
        { name: "hard_drives", count: 0 },
        { name: "Hard_Drives", count: 0 },
        { name: "harddrives", count: 0 },
        { name: "HardDrives", count: 0 },
        { name: "raw_assets", count: 0 },
        { name: "Raw_Assets", count: 0 },
        { name: "rawassets", count: 0 },
        { name: "RawAssets", count: 0 },
      ];

      for (const variation of variations) {
        try {
          // Check if collection exists and get count
          variation.count = await db
            .collection(variation.name)
            .countDocuments();
        } catch (e) {
          // Collection doesn't exist or can't be accessed
          variation.count = -1;
        }
      }

      diagnosticResults.tests.caseSensitivityCheck = {
        status: "completed",
        variations,
      };
    } catch (error) {
      diagnosticResults.tests.caseSensitivityCheck = {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    // Test 6: Permission Test - Try to write a temporary document
    try {
      diagnosticResults.tests.permissionTest = {
        status: "running",
      };

      const client = await getMongoClient(2, 300);
      const db = client.db();

      // Create a test collection name that won't interfere with existing data
      const testCollectionName = `diagnostic_test_${Date.now()}`;

      // Try to create the collection
      await db.createCollection(testCollectionName);

      // Try to insert a document
      const insertResult = await db.collection(testCollectionName).insertOne({
        test: true,
        createdAt: new Date(),
      });

      // Try to read it back
      const readResult = await db
        .collection(testCollectionName)
        .findOne({ test: true });

      // Try to delete it
      const deleteResult = await db
        .collection(testCollectionName)
        .deleteOne({ test: true });

      // Try to drop the collection
      await db.dropCollection(testCollectionName);

      diagnosticResults.tests.permissionTest = {
        status: "completed",
        canCreate: true,
        canInsert: !!insertResult.insertedId,
        canRead: !!readResult,
        canDelete: deleteResult.deletedCount === 1,
        canDrop: true,
      };
    } catch (error) {
      diagnosticResults.tests.permissionTest = {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };

      // Add more detail about where it failed
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes("create")) {
          diagnosticResults.tests.permissionTest.failedAt = "create collection";
        } else if (errorMsg.includes("insert")) {
          diagnosticResults.tests.permissionTest.failedAt = "insert document";
        } else if (errorMsg.includes("read") || errorMsg.includes("find")) {
          diagnosticResults.tests.permissionTest.failedAt = "read document";
        } else if (errorMsg.includes("delete")) {
          diagnosticResults.tests.permissionTest.failedAt = "delete document";
        } else if (errorMsg.includes("drop")) {
          diagnosticResults.tests.permissionTest.failedAt = "drop collection";
        }
      }
    }

    return NextResponse.json(diagnosticResults);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Diagnostic failed",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
