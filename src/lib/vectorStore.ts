import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { connectToDatabase } from "./mongodb";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OpenAI API Key");
}

const COLLECTION_NAME = "research_vectors";
const INDEX_NAME = "vector_search";

// Initialize embeddings instance
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small",
  stripNewLines: true,
});

// Text splitter configuration
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

interface ResearchChunk {
  pageContent: string;
  metadata: {
    carId: string;
    fileId: string;
    fileName: string;
    chunk: number;
  };
}

export async function vectorizeResearchFile(
  content: string,
  carId: string,
  fileId: string,
  fileName: string
): Promise<void> {
  try {
    console.log(`\nVectorizing file: ${fileName}`);
    console.log(`Car ID: ${carId}`);
    console.log(`Content length: ${content.length} chars`);

    if (!content) {
      throw new Error("No content provided for vectorization");
    }

    // Split the content into chunks
    const textChunks = await textSplitter.splitText(content);
    console.log(`Split into ${textChunks.length} chunks`);

    if (textChunks.length === 0) {
      throw new Error("No text chunks generated from content");
    }

    // Create documents with metadata
    const documents = textChunks
      .map((text, index) => {
        if (!text) {
          console.warn(`Empty text chunk at index ${index}`);
          return null;
        }

        return new Document({
          pageContent: text,
          metadata: {
            carId,
            fileId,
            fileName,
            chunk: index + 1,
          },
        });
      })
      .filter(Boolean);

    if (documents.length === 0) {
      throw new Error("No valid documents created from text chunks");
    }

    // Get database connection
    const { db } = await connectToDatabase();

    // Generate embeddings
    console.log("Generating embeddings...");
    const embeddingResults = await embeddings.embedDocuments(
      documents.map((doc) => doc.pageContent)
    );
    console.log(`Generated ${embeddingResults.length} embeddings`);

    // Insert documents with embeddings directly
    console.log("Adding documents to vector store...");
    const documentsToInsert = documents.map((doc, i) => ({
      embedding: embeddingResults[i],
      metadata: doc.metadata,
      pageContent: doc.pageContent,
    }));

    await db.collection(COLLECTION_NAME).insertMany(documentsToInsert);

    // Verify documents were added
    const addedCount = await db.collection(COLLECTION_NAME).countDocuments({
      "metadata.fileId": fileId,
    });

    if (addedCount === 0) {
      throw new Error("Documents were not added to the vector store");
    }

    console.log(`✓ Successfully vectorized ${addedCount} chunks`);
  } catch (error) {
    console.error("Error vectorizing research file:", error);
    throw error;
  }
}

export async function searchResearchVectors(
  query: string,
  carId: string,
  limit: number = 5
): Promise<ResearchChunk[]> {
  try {
    console.log(`\nSearching vectors for car ${carId}`);
    console.log(`Query: "${query}"`);

    const { db } = await connectToDatabase();

    // Log collection stats
    const totalDocs = await db.collection(COLLECTION_NAME).countDocuments();
    const carDocs = await db.collection(COLLECTION_NAME).countDocuments({
      "metadata.carId": carId,
    });
    console.log(
      `Collection stats: ${carDocs}/${totalDocs} documents for this car`
    );

    // Generate embedding for the query
    console.log("Generating query embedding...");
    const queryEmbedding = await embeddings.embedQuery(query);

    // Perform vector search using MongoDB Atlas
    const pipeline = [
      {
        $search: {
          index: INDEX_NAME,
          knnBeta: {
            vector: queryEmbedding,
            path: "embedding",
            k: limit * 2,
            filter: {
              equals: {
                path: "metadata.carId",
                value: carId,
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
      {
        $limit: limit,
      },
    ];

    console.log(
      "Executing search pipeline:",
      JSON.stringify(pipeline, null, 2)
    );
    const searchResults = await db
      .collection(COLLECTION_NAME)
      .aggregate(pipeline)
      .toArray();

    console.log(`Found ${searchResults.length} relevant chunks`);

    // Log a preview of the results
    if (searchResults.length > 0) {
      console.log("\nTop result preview:");
      console.log("Score:", searchResults[0].score);
      console.log(
        "Content:",
        searchResults[0].pageContent.substring(0, 200) + "..."
      );
    }

    return searchResults.map(
      (doc) =>
        ({
          pageContent: doc.pageContent,
          metadata: doc.metadata,
        } as ResearchChunk)
    );
  } catch (error) {
    console.error("Error searching research vectors:", error);
    throw error;
  }
}

export async function deleteResearchVectors(fileId: string): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    await db.collection(COLLECTION_NAME).deleteMany({
      "metadata.fileId": fileId,
    });
    console.log(`Deleted vectors for file ${fileId}`);
  } catch (error) {
    console.error("Error deleting research vectors:", error);
    throw error;
  }
}
