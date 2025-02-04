import { MongoClient } from "mongodb";
import { OpenAIEmbeddings } from "@langchain/openai";
import * as dotenv from "dotenv";
dotenv.config();

const COLLECTION_NAME = "research_vectors";
const INDEX_NAME = "vector_search";
const TEST_CAR_ID = "6784b0e37a85711f907ba1ca";

async function debugSearch() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-small",
    stripNewLines: true,
  });

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();

    // 1. Check document structure
    console.log("\nChecking document structure:");
    const sampleDoc = await db.collection(COLLECTION_NAME).findOne({
      "metadata.carId": TEST_CAR_ID,
    });
    console.log("Sample document structure:");
    console.log(
      JSON.stringify(
        {
          metadata: sampleDoc?.metadata,
          hasEmbedding: !!sampleDoc?.embedding,
          embeddingLength: sampleDoc?.embedding?.length,
          contentPreview: sampleDoc?.pageContent?.substring(0, 200),
        },
        null,
        2
      )
    );

    // 2. Test basic search without vector similarity
    console.log("\nTesting basic search for car ID:");
    const basicResults = await db
      .collection(COLLECTION_NAME)
      .find({ "metadata.carId": TEST_CAR_ID })
      .limit(1)
      .toArray();
    console.log(`Found ${basicResults.length} documents with basic search`);

    // 3. Test vector search pipeline
    console.log("\nTesting vector search:");
    const queryEmbedding = await embeddings.embedQuery(
      "what type of engine does the ford gt have?"
    );

    const pipeline = [
      {
        $search: {
          index: INDEX_NAME,
          knnBeta: {
            vector: queryEmbedding,
            path: "embedding",
            k: 10,
            filter: {
              equals: {
                path: "metadata.carId",
                value: TEST_CAR_ID,
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          score: { $meta: "searchScore" },
          pageContent: 1,
          metadata: 1,
        },
      },
    ];

    console.log("Search pipeline:", JSON.stringify(pipeline, null, 2));
    const searchResults = await db
      .collection(COLLECTION_NAME)
      .aggregate(pipeline)
      .toArray();

    console.log(`\nFound ${searchResults.length} results with vector search`);
    if (searchResults.length > 0) {
      console.log("First result:", {
        score: searchResults[0].score,
        content: searchResults[0].pageContent.substring(0, 200),
      });
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

debugSearch();
