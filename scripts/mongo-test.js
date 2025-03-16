require("dotenv").config();
const { MongoClient } = require("mongodb");

// Sanitize connection string for safe logging (hide credentials)
function sanitizeUri(uri) {
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

async function testMongoDB() {
  // Get MongoDB URI from environment or use a default
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "motive_archive";

  if (!uri) {
    console.error("❌ MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  console.log(`🔍 Testing connection to MongoDB...`);
  console.log(`🔹 URI: ${sanitizeUri(uri)}`);
  console.log(`🔹 DB Name: ${dbName}`);

  let client;

  try {
    // Connect to MongoDB
    client = new MongoClient(uri, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });

    console.log("⏳ Connecting to MongoDB...");
    await client.connect();
    console.log("✅ Connected successfully to MongoDB server");

    // List all databases
    console.log("\n📋 Listing all databases:");
    const databasesList = await client.db().admin().listDatabases();
    databasesList.databases.forEach((db) => {
      console.log(`  - ${db.name} (${db.sizeOnDisk} bytes)`);
    });

    // Use the specified database
    const db = client.db(dbName);

    // List all collections in the database
    console.log(`\n📋 Listing all collections in '${dbName}' database:`);
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.log(`  ⚠️ No collections found in database '${dbName}'`);
    } else {
      collections.forEach((collection) => {
        console.log(`  - ${collection.name} (${collection.type})`);
      });
    }

    // Check for our specific collections
    const specificCollections = ["hard_drives", "raw_assets"];
    console.log("\n🔍 Checking for specific collections:");

    for (const collectionName of specificCollections) {
      const collectionExists = collections.some(
        (c) => c.name === collectionName
      );
      console.log(
        `  - ${collectionName}: ${
          collectionExists ? "✅ Found" : "❌ Not found"
        }`
      );

      if (collectionExists) {
        // Count documents
        const count = await db.collection(collectionName).countDocuments();
        console.log(`    📊 Document count: ${count}`);

        // Sample document (if any)
        if (count > 0) {
          const sample = await db.collection(collectionName).findOne({});
          console.log(
            `    📄 Sample document keys: ${Object.keys(sample).join(", ")}`
          );
        }
      }
    }

    // Check for alternative collection names (case variations)
    const variations = [
      "Hard_Drives",
      "harddrives",
      "HardDrives",
      "Raw_Assets",
      "rawassets",
      "RawAssets",
    ];

    console.log("\n🔍 Checking for collection name variations:");
    for (const variation of variations) {
      try {
        const count = await db.collection(variation).countDocuments();
        console.log(
          `  - ${variation}: ${
            count > 0
              ? `✅ Found (${count} documents)`
              : "❌ Empty but accessible"
          }`
        );
      } catch (e) {
        console.log(`  - ${variation}: ❌ Not accessible`);
      }
    }
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:");
    console.error(`  - Message: ${error.message}`);
    console.error(`  - Code: ${error.code}`);

    if (error.name === "MongoServerSelectionError") {
      console.error(`  - Server selection timed out`);
      if (error.reason) {
        console.error(`  - Reason: ${error.reason.type}`);
        console.error(`  - Addresses: ${JSON.stringify(error.reason.servers)}`);
      }
    }

    process.exit(1);
  } finally {
    if (client) {
      console.log("\n🔌 Closing MongoDB connection...");
      await client.close();
      console.log("✅ MongoDB connection closed");
    }
  }
}

// Run the test
testMongoDB().catch(console.error);
