import clientPromise from "@/lib/mongodb";

export interface Platform {
  _id: string;
  name: string;
  platformId: string;
  color: string;
}

export async function fetchPlatforms() {
  try {
    const client = await clientPromise;

    if (!client) {
      throw new Error("Failed to connect to MongoDB");
    }

    const db = client.db("motive_archive");

    console.log("Fetching platforms from MongoDB...");
    const platforms = await db.collection("platforms").find({}).toArray();

    console.log(`Successfully fetched ${platforms.length} platforms`);

    return platforms.map((platform) => ({
      _id: platform._id.toString(),
      name: platform.name,
      platformId: platform.platformId,
      color: "text-zinc-600", // Hardcode this for now until we add to DB
    }));
  } catch (error) {
    console.error("Error fetching platforms:", error);
    throw error;
  }
}
