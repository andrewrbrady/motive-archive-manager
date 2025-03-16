import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

/**
 * This script specifically checks MongoDB Atlas for the existence of collections,
 * examining collection names with different case variations and analyzing permissions.
 */
async function verifyAtlasCollections() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("❌ MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  // Sanitize the URI for logging
  const sanitizedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
  console.log(`🔍 Testing connection to MongoDB Atlas: ${sanitizedUri}`);

  // Get the database name from environment or use default
  const databaseName = process.env.MONGODB_DB || "motive_archive";
  console.log(`🔹 Target database: ${databaseName}`);

  // Optional alternate database name to test if the main one fails
  let altDatabaseName = null;

  // Check if "motive-archive" (with hyphen) might be the database instead of "motive_archive" (with underscore)
  if (databaseName === "motive_archive") {
    altDatabaseName = "motive-archive";
  }

  // MongoDB connection options
  const options = {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
  };

  let client;

  try {
    // Connect to MongoDB Atlas
    console.log("⏳ Connecting to MongoDB Atlas...");
    client = new MongoClient(uri, options);
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas successfully");

    // Get server information
    const adminDb = client.db().admin();
    const serverInfo = await adminDb.serverInfo();
    console.log(`🖥️  Server version: ${serverInfo.version}`);
    console.log(`🖥️  Connection: ${serverInfo.userReadableName || "Unknown"}`);

    // List available databases
    console.log("\n📋 Available databases:");
    const dbList = await adminDb.listDatabases();

    const databases = [];
    dbList.databases.forEach((db) => {
      console.log(`  - ${db.name} (${formatSize(db.sizeOnDisk)})`);
      databases.push(db.name);
    });

    // Check if our target database exists
    if (!databases.includes(databaseName)) {
      console.log(
        `\n⚠️  Target database '${databaseName}' not found in available databases!`
      );

      if (altDatabaseName && databases.includes(altDatabaseName)) {
        console.log(
          `🔎 Found alternative database '${altDatabaseName}' - will check this as well`
        );
      }
    }

    // Function to check a specific database
    async function checkDatabase(dbName) {
      console.log(`\n📊 Examining database: ${dbName}`);
      const db = client.db(dbName);

      // Check for collections
      const collections = await db.listCollections().toArray();
      console.log(`  Found ${collections.length} collections`);

      // Print collection names and types
      console.log("\n  Collections:");
      collections.forEach((coll) => {
        console.log(`  - ${coll.name} (${coll.type})`);
      });

      // Check for our target collections
      const targetCollections = [
        { name: "hard_drives", displayName: "Hard Drives" },
        { name: "raw_assets", displayName: "Raw Assets" },
      ];

      console.log("\n  Target collections check:");
      for (const target of targetCollections) {
        const exists = collections.some((c) => c.name === target.name);
        console.log(
          `  - ${target.displayName} (${target.name}): ${
            exists ? "✅ Present" : "❌ Missing"
          }`
        );

        if (exists) {
          // Check document count
          const count = await db.collection(target.name).countDocuments();
          console.log(`    📊 Contains ${count} documents`);

          // Get a sample document if any exist
          if (count > 0) {
            try {
              const sample = await db.collection(target.name).findOne({});
              console.log(
                `    📄 Sample document properties: ${Object.keys(sample).join(
                  ", "
                )}`
              );
            } catch (err) {
              console.log(
                `    ⚠️ Could not fetch sample document: ${err.message}`
              );
            }
          }
        }
      }

      // Check for case variations that might be causing issues
      console.log("\n  Case sensitivity check:");
      const caseVariations = [
        // Hard drive variations
        { original: "hard_drives", variation: "Hard_Drives" },
        { original: "hard_drives", variation: "harddrives" },
        { original: "hard_drives", variation: "HardDrives" },
        { original: "hard_drives", variation: "HARD_DRIVES" },

        // Raw assets variations
        { original: "raw_assets", variation: "Raw_Assets" },
        { original: "raw_assets", variation: "rawassets" },
        { original: "raw_assets", variation: "RawAssets" },
        { original: "raw_assets", variation: "RAW_ASSETS" },
      ];

      for (const variation of caseVariations) {
        try {
          // Try to access the collection with the variation
          const exists = collections.some(
            (c) => c.name === variation.variation
          );

          if (exists) {
            const count = await db
              .collection(variation.variation)
              .countDocuments();
            console.log(
              `  - ${variation.variation}: ✅ Exists with ${count} documents`
            );

            if (count > 0) {
              const sample = await db
                .collection(variation.variation)
                .findOne({});
              console.log(
                `    📄 Sample document properties: ${Object.keys(sample).join(
                  ", "
                )}`
              );
            }
          } else {
            // Try direct access even if not listed (some collections can be accessed directly even if not visible)
            try {
              const count = await db
                .collection(variation.variation)
                .countDocuments();
              console.log(
                `  - ${variation.variation}: ⚠️ Not listed but accessible, contains ${count} documents`
              );
            } catch (err) {
              console.log(`  - ${variation.variation}: ❌ Not found`);
            }
          }
        } catch (err) {
          console.log(`  - ${variation.variation}: ❌ Error: ${err.message}`);
        }
      }

      // Check collection creation and permissions
      console.log("\n  Permission test:");
      const testCollName = `test_collection_${Date.now()}`;

      try {
        // Try to create a test collection
        await db.createCollection(testCollName);
        console.log(
          `  ✅ Successfully created test collection: ${testCollName}`
        );

        // Try to insert a document
        const insertResult = await db.collection(testCollName).insertOne({
          test: true,
          timestamp: new Date(),
        });

        if (insertResult.acknowledged) {
          console.log(`  ✅ Successfully inserted test document`);

          // Try to read it back
          const doc = await db.collection(testCollName).findOne({ test: true });
          console.log(
            `  ✅ Successfully read test document: ${
              doc ? "found" : "not found"
            }`
          );

          // Clean up by dropping the collection
          await db.collection(testCollName).drop();
          console.log(`  ✅ Successfully dropped test collection`);
        } else {
          console.log(`  ❌ Failed to insert test document`);
        }
      } catch (err) {
        console.log(`  ❌ Permission test failed: ${err.message}`);
        if (err.codeName) {
          console.log(`    Error code: ${err.codeName}`);
        }
      }

      // Check authentication and roles
      console.log("\n  User authentication:");
      try {
        const connectionStatus = await db.command({ connectionStatus: 1 });

        if (
          connectionStatus.authInfo &&
          connectionStatus.authInfo.authenticatedUsers
        ) {
          const authenticatedUsers =
            connectionStatus.authInfo.authenticatedUsers;
          console.log(
            `  ✅ Authenticated as: ${authenticatedUsers
              .map((u) => u.user)
              .join(", ")}`
          );
        } else {
          console.log(`  ⚠️ No authenticated user information available`);
        }

        if (
          connectionStatus.authInfo &&
          connectionStatus.authInfo.authenticatedUserRoles
        ) {
          const roles = connectionStatus.authInfo.authenticatedUserRoles;
          console.log("  Roles:");
          roles.forEach((role) => {
            console.log(`  - ${role.role} on ${role.db}`);
          });
        } else {
          console.log(`  ⚠️ No role information available`);
        }
      } catch (err) {
        console.log(`  ❌ Failed to get authentication info: ${err.message}`);
      }
    }

    // Check the primary database
    await checkDatabase(databaseName);

    // Check the alternative database if it exists
    if (altDatabaseName && databases.includes(altDatabaseName)) {
      await checkDatabase(altDatabaseName);
    }
  } catch (err) {
    console.error("\n❌ Error connecting to MongoDB Atlas:");
    console.error(`  ${err.message}`);

    if (err.name === "MongoServerSelectionError") {
      console.error("\n🔍 Connection details:");
      if (err.reason) {
        console.error(`  Type: ${err.reason.type}`);

        if (err.reason.servers) {
          console.error("  Server status:");
          for (const [key, value] of Object.entries(err.reason.servers)) {
            console.error(
              `  - ${key}: ${value.type}, error: ${value.error || "none"}`
            );
          }
        }
      }
      console.error("\n💡 Potential issues:");
      console.error("  - IP access restrictions in MongoDB Atlas");
      console.error("  - Network connectivity problems");
      console.error("  - Incorrect connection string");
      console.error("  - MongoDB Atlas cluster is down or being maintained");
    }
  } finally {
    if (client) {
      console.log("\n🔌 Closing MongoDB connection...");
      await client.close();
      console.log("✅ MongoDB connection closed");
    }
  }
}

// Helper function to format size in a readable way
function formatSize(bytes) {
  if (bytes === undefined) return "Unknown";
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Run the verification
verifyAtlasCollections().catch(console.error);
