import { Db } from "mongodb";

export async function createIndexes(db: Db) {
  try {
    // Create indexes for research_files collection
    await db.collection("research_files").createIndexes([
      {
        key: { carId: 1 },
        name: "research_files_car",
      },
      {
        key: { createdAt: -1 },
        name: "research_files_date",
      },
    ]);

    // Create vector search index for research_vectors collection
    try {
      await db.command({
        createSearchIndexes: "research_vectors",
        indexes: [
          {
            name: "vector_search",
            definition: {
              mappings: {
                dynamic: false,
                fields: {
                  embedding: {
                    dimensions: 1536,
                    similarity: "cosine",
                    type: "knnVector",
                  },
                  pageContent: {
                    type: "string",
                  },
                  "metadata.carId": {
                    type: "token",
                  },
                  "metadata.fileId": {
                    type: "token",
                  },
                  "metadata.fileName": {
                    type: "string",
                  },
                  "metadata.chunk": {
                    type: "number",
                  },
                },
              },
            },
          },
        ],
      });
      console.log("Successfully created vector search index");
    } catch (indexError) {
      // Ignore vector index errors as they might require special handling
      console.warn("Vector index creation skipped:", indexError.message);
    }

    // Create indexes for images collection
    await db.collection("images").createIndexes([
      {
        key: { carId: 1 },
        name: "images_car",
      },
      {
        key: { createdAt: -1 },
        name: "images_date",
      },
    ]);

    console.log("Successfully created/verified indexes for collections");
  } catch (error) {
    console.warn("Some indexes already exist:", error.message);
  }
}
