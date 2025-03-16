import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

// Match the same settings as in our mongodb.ts file
const options = {
  maxPoolSize: 5,
  minPoolSize: 1,
  connectTimeoutMS: 15000,
  socketTimeoutMS: 15000,
  serverSelectionTimeoutMS: 15000,
  family: 4, // Force IPv4
  heartbeatFrequencyMS: 15000,
  maxIdleTimeMS: 15000,
  // Note: useNewUrlParser and useUnifiedTopology are deprecated in newer MongoDB driver versions
};

async function checkApplicationConnection() {
  const MONGODB_URI = process.env.MONGODB_URI;
  const MONGODB_DB = process.env.MONGODB_DB || "motive_archive";

  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not defined in environment variables");
    process.exit(1);
  }

  console.log("Starting MongoDB connection check (using application settings)");
  console.log(`Using database: ${MONGODB_DB}`);

  let client;
  try {
    console.log("Connecting to MongoDB...");
    client = new MongoClient(MONGODB_URI, options);
    await client.connect();

    console.log("✅ Connected to MongoDB successfully");

    const adminDb = client.db().admin();
    const serverInfo = await adminDb.serverInfo();
    console.log(`Server version: ${serverInfo.version}`);

    // Get list of all databases
    const dbList = await adminDb.listDatabases();
    console.log("\nAvailable databases:");
    dbList.databases.forEach((db) => {
      console.log(
        `- ${db.name}${
          db.name === MONGODB_DB ? " (this is our target database)" : ""
        }`
      );
    });

    // Target database exists?
    const dbExists = dbList.databases.some((db) => db.name === MONGODB_DB);
    if (!dbExists) {
      console.error(`\n❌ Target database "${MONGODB_DB}" does not exist!`);
      process.exit(1);
    }

    // Using the target database
    const db = client.db(MONGODB_DB);

    // Exactly match the hasCollection check in our application
    console.log("\nChecking for collections using application method:");

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`Total collections found: ${collections.length}`);

    if (collections.length === 0) {
      console.log("No collections found in database");
    } else {
      console.log("Collection names:");
      collections.forEach((coll) => {
        console.log(`- ${coll.name} (${coll.type})`);
      });
    }

    // Check specifically for our required collections
    const targetCollections = ["hard_drives", "raw_assets"];
    console.log("\nChecking for target collections:");

    for (const collName of targetCollections) {
      // This is how our application checks for collections
      const collectionExists = collections.some(
        (coll) => coll.name === collName
      );

      console.log(
        `- ${collName}: ${collectionExists ? "✅ Found" : "❌ Not found"}`
      );

      if (collectionExists) {
        try {
          // Count documents
          const count = await db.collection(collName).countDocuments();
          console.log(`  Document count: ${count}`);

          // Get a sample
          if (count > 0) {
            const sample = await db.collection(collName).findOne({});
            console.log(
              `  Sample document keys: ${Object.keys(sample).join(", ")}`
            );
          }
        } catch (err) {
          console.error(`  Error accessing collection: ${err.message}`);
        }
      }
    }

    // Try direct collection access - sometimes listCollections can be misleading
    console.log("\nTrying direct collection access:");
    for (const collName of targetCollections) {
      try {
        const count = await db.collection(collName).countDocuments();
        console.log(
          `- ${collName}: Can access directly, contains ${count} documents`
        );

        if (count > 0) {
          const sample = await db.collection(collName).findOne({});
          console.log(
            `  Sample document keys: ${Object.keys(sample).join(", ")}`
          );
        }
      } catch (err) {
        console.error(
          `- ${collName}: Error accessing directly: ${err.message}`
        );
      }
    }

    // Check user permissions
    console.log("\nChecking user permissions:");
    try {
      const roles = await db.command({ connectionStatus: 1 });
      console.log("User roles:");

      if (roles && roles.authInfo && roles.authInfo.authenticatedUserRoles) {
        roles.authInfo.authenticatedUserRoles.forEach((role) => {
          console.log(`- ${role.role} on ${role.db}`);
        });
      } else {
        console.log("No authenticated user or roles information available");
      }
    } catch (err) {
      console.error(`Error checking permissions: ${err.message}`);
    }
  } catch (err) {
    console.error("\n❌ Error:", err.message);

    if (err.name === "MongoServerSelectionError") {
      console.error(
        "Server selection timed out. This often indicates network issues or IP whitelisting problems."
      );

      if (err.reason && err.reason.servers) {
        console.error("Server information:");
        Object.entries(err.reason.servers).forEach(([address, info]) => {
          console.error(
            `- ${address}: ${info.type}, error: ${info.error || "none"}`
          );
        });
      }
    }
  } finally {
    if (client) {
      console.log("\nClosing MongoDB connection...");
      await client.close();
      console.log("Connection closed");
    }
  }
}

// Run the test
checkApplicationConnection().catch(console.error);
