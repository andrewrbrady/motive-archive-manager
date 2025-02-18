import { connectToDatabase } from "@/lib/mongodb";
import { PREDEFINED_BATCHES } from "@/types/deliverable";

async function initBatchTemplates() {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection("batch_templates");

    // Clear existing templates
    await collection.deleteMany({});

    // Insert predefined templates
    const templates = Object.values(PREDEFINED_BATCHES);
    await collection.insertMany(templates);

    console.log("Successfully initialized batch templates");
    process.exit(0);
  } catch (error) {
    console.error("Error initializing batch templates:", error);
    process.exit(1);
  }
}

initBatchTemplates();
