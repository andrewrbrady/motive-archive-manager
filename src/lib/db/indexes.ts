import { Db } from "mongodb";

export async function ensureIndexes(db: Db) {
  try {
    // Research files indexes
    await db.collection("research_files").createIndexes([
      {
        key: { carId: 1, createdAt: -1 },
        name: "research_files_car_date",
      },
      {
        key: { carId: 1 },
        name: "research_files_car",
      },
      {
        key: { s3Key: 1 },
        name: "research_files_s3",
      },
    ]);

    // Images collection indexes
    await db.collection("images").createIndexes([
      {
        key: { carId: 1, createdAt: -1 },
        name: "images_car_date",
      },
      {
        key: { cloudflareId: 1 },
        name: "images_cloudflare",
        unique: true,
      },
      {
        key: { url: 1 },
        name: "images_url",
        unique: true,
      },
    ]);

    console.log("Successfully created indexes for collections");
  } catch (error) {
    console.error("Error creating indexes:", error);
    throw error;
  }
}
