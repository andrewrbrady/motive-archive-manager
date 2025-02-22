import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

async function migrateBatchTemplates() {
  const client = new MongoClient(MONGODB_URI as string);

  try {
    console.log("Connecting to MongoDB Atlas...");
    await client.connect();

    // Connect to both databases in the same cluster
    const sourceDb = client.db("motive-archive");
    const targetDb = client.db("motive_archive");

    // Get the batch_templates collection from source
    const sourceCollection = sourceDb.collection("batch_templates");

    // Get count of documents in source collection
    const sourceCount = await sourceCollection.countDocuments();
    console.log(`Found ${sourceCount} batch templates in source database`);

    if (sourceCount === 0) {
      console.log("No batch templates found in source database");
      return;
    }

    // Get all documents from source collection
    const documents = await sourceCollection.find({}).toArray();

    // Insert documents into target collection
    console.log(
      `Migrating ${documents.length} batch templates to target database...`
    );
    const result = await targetDb
      .collection("batch_templates")
      .insertMany(documents);

    console.log(
      `Successfully migrated ${result.insertedCount} batch templates`
    );

    // Verify the migration
    const targetCount = await targetDb
      .collection("batch_templates")
      .countDocuments();

    console.log(`\nMigration verification:`);
    console.log(`- Source database count: ${sourceCount}`);
    console.log(`- Target database count: ${targetCount}`);

    if (sourceCount === targetCount) {
      console.log("✅ Migration successful - counts match");
    } else {
      console.log("⚠️ Warning: Source and target counts don't match");
    }
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    await client.close();
  }
}

migrateBatchTemplates();
