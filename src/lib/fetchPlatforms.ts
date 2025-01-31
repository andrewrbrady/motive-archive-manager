import { connectToDatabase } from "@/lib/mongodb";

export interface Platform {
  _id: string;
  name: string;
  platformId: string;
  color: string;
}

export async function fetchPlatforms() {
  try {
    // Get database connection from our connection pool
    const dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    console.log("Fetching platforms from MongoDB...");
    const platforms = await db.collection("platforms").find({}).toArray();

    console.log(`Successfully fetched ${platforms.length} platforms`);

    return platforms.map((platform) => ({
      _id: platform._id.toString(),
      name: platform.name,
      platformId: platform.platformId,
      color: "text-gray-600", // Hardcode this for now until we add to DB
    }));
  } catch (error) {
    console.error("Error fetching platforms:", error);
    throw error;
  }
}
