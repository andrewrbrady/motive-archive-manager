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

    console.log("Successfully created indexes for research_files collection");
  } catch (error) {
    console.error("Error creating indexes:", error);
    throw error;
  }
}
