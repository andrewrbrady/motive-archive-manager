import { OpenAI } from "openai";
import { ModelType } from "@/components/ModelSelector";
import { RateLimiter } from "limiter";
import { getDatabase } from "./mongodb";
import { ObjectId } from "mongodb";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import clientPromise from "./mongodb";
import Anthropic from "@anthropic-ai/sdk";

interface SearchResult {
  content: string;
  metadata: {
    carId: string;
    fileId: string;
    fileName: string;
    matchType: "keyword" | "semantic" | "both";
    score: number;
  };
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create rate limiters for API calls
// 20 requests per minute for OpenAI (more conservative to stay within free tier limits)
const openAILimiter = new RateLimiter({
  tokensPerInterval: 20,
  interval: "minute",
});

// 3 requests per minute for Claude
const claudeLimiter = new RateLimiter({
  tokensPerInterval: 3,
  interval: "minute",
});

// Initialize embeddings model
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small",
  stripNewLines: true,
});

// Initialize text splitter
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Helper function to handle rate limiting for OpenAI calls
async function callWithRateLimit<T>(
  fn: () => Promise<T>,
  model: ModelType
): Promise<T> {
  const limiter =
    model === "claude-3-5-sonnet-20241022" ? claudeLimiter : openAILimiter;
  try {
    await limiter.removeTokens(1);
    return await fn();
  } catch (error) {
    if (error instanceof Error && error.message.includes("429")) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Rate limit hit, waiting before retry...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return callWithRateLimit(fn, model);
    }
    throw error;
  }
}

// Perform keyword-based search
async function keywordSearch(
  query: string,
  carId: string
): Promise<SearchResult[]> {
  const db = await getDatabase();

  // Create text index if it doesn't exist
  await db.collection("research_files").createIndex({ content: "text" });

  const results = await db
    .collection("research_files")
    .find(
      {
        carId,
        $text: { $search: query },
      },
      {
        projection: {
          score: { $meta: "textScore" },
          content: 1,
          carId: 1,
          _id: 1,
          filename: 1,
        },
      }
    )
    .sort({ score: { $meta: "textScore" } })
    .toArray();

  return results.map((doc) => ({
    content: doc.content,
    metadata: {
      carId: doc.carId,
      fileId: doc._id.toString(),
      fileName: doc.filename,
      matchType: "keyword" as const,
      score: doc.score,
    },
  }));
}

// Perform semantic search using embeddings
async function semanticSearch(
  query: string,
  carId: string
): Promise<SearchResult[]> {
  try {
    const db = await getDatabase();

    // Generate query embedding with rate limiting
    const queryEmbedding = await callWithRateLimit(
      () => embeddings.embedQuery(query),
      "gpt-4o-mini"
    );

    // Get all documents for this car
    const documents = await db
      .collection("research_files")
      .find({ carId })
      .toArray();

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Found ${documents.length} documents for car ${carId}`);

    // Filter out documents without embeddings and calculate similarity scores
    const results = documents
      .filter((doc) => {
        const hasEmbedding =
          Array.isArray(doc.embedding) && doc.embedding.length > 0;
        if (!hasEmbedding) {
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Document ${doc._id} missing embedding, regenerating...`);
          // Regenerate embedding for this document
          regenerateEmbedding(doc).catch(console.error);
        }
        return hasEmbedding;
      })
      .map((doc) => {
        // Calculate dot product manually
        const similarity = doc.embedding.reduce(
          (sum: number, val: number, i: number) =>
            sum + val * queryEmbedding[i],
          0
        );

        return {
          content: doc.content,
          metadata: {
            carId: doc.carId,
            fileId: doc._id.toString(),
            fileName: doc.filename,
            matchType: "semantic" as const,
            score: similarity,
          },
        };
      });

    // Sort by similarity score
    return results
      .sort((a, b) => b.metadata.score - a.metadata.score)
      .slice(0, 5);
  } catch (error) {
    console.error("Error in semantic search:", error);
    return [];
  }
}

// Helper function to estimate tokens (rough approximation)
function estimateTokens(text: string): number {
  // OpenAI's tokenizer typically splits on spaces and punctuation
  // A rough estimate is 4 characters per token
  return Math.ceil(text.length / 4);
}

// Helper function to chunk content into smaller pieces
function chunkContent(content: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  let currentChunk = "";

  const sentences = content.split(/[.!?]+\s+/);
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Helper function to generate embedding for a chunk with retries
async function generateEmbeddingForChunk(chunk: string): Promise<number[]> {
  try {
    // Add safety check for chunk size
    const estimatedTokens = estimateTokens(chunk);
    if (estimatedTokens > 8000) {
      console.warn(
        `Chunk too large (${estimatedTokens} estimated tokens), splitting further`
      );
      const subChunks = chunkContent(chunk, 6000);
      const embeddingResults = await Promise.all(
        subChunks.map((subChunk) =>
          callWithRateLimit(
            () => embeddings.embedQuery(subChunk),
            "gpt-4o-mini"
          )
        )
      );

      // Average the embeddings of sub-chunks
      const embeddingLength = embeddingResults[0].length;
      const averageEmbedding = new Array(embeddingLength).fill(0);
      for (const embedding of embeddingResults) {
        for (let i = 0; i < embeddingLength; i++) {
          averageEmbedding[i] += embedding[i] / embeddingResults.length;
        }
      }
      return averageEmbedding;
    }

    return await callWithRateLimit(
      () => embeddings.embedQuery(chunk),
      "gpt-4o-mini"
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error generating embedding for chunk:", error.message);
      if (error.message.includes("maximum context length")) {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Splitting chunk further due to token limit...");
        const smallerChunks = chunkContent(
          chunk,
          Math.floor(chunk.length * 0.75)
        );
        const embeddings = await Promise.all(
          smallerChunks.map((chunk) => generateEmbeddingForChunk(chunk))
        );
        // Average the embeddings
        const embeddingLength = embeddings[0].length;
        const averageEmbedding = new Array(embeddingLength).fill(0);
        for (const embedding of embeddings) {
          for (let i = 0; i < embeddingLength; i++) {
            averageEmbedding[i] += embedding[i] / embeddings.length;
          }
        }
        return averageEmbedding;
      }
    }
    throw error;
  }
}

// Helper function to regenerate embedding for a document
async function regenerateEmbedding(doc: any): Promise<void> {
  try {
    const db = await getDatabase();

    // Check if document has content
    if (!doc.content) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Document ${doc._id} missing content, fetching from API...`);
      try {
        // Construct proper URL with origin for server-side fetch
        const origin =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
        const url = new URL(`/api/research/content`, origin);
        url.searchParams.append("fileId", doc._id.toString());

        const response = await fetch(url.toString());
        const contentData = await response.text();

        if (!response.ok) {
          console.error(`API Error for document ${doc._id}:`, contentData);
          return;
        }

        doc.content = contentData;
      } catch (error) {
        console.error(
          `Failed to fetch content for document ${doc._id}:`,
          error
        );
        return;
      }
    }

    if (!doc.content) {
      console.error(`Document ${doc._id} has no content after fetch attempt`);
      return;
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Generating embedding for document ${doc._id}...`);

    // Split content into chunks if it's large
    const chunks = chunkContent(doc.content, 6000);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Split document into ${chunks.length} chunks`);

    // Generate embeddings for each chunk
    const chunkEmbeddings = await Promise.all(
      chunks.map(generateEmbeddingForChunk)
    );

    // Average the embeddings to get a single embedding for the document
    const embeddingLength = chunkEmbeddings[0].length;
    const averageEmbedding = new Array(embeddingLength).fill(0);

    for (const embedding of chunkEmbeddings) {
      for (let i = 0; i < embeddingLength; i++) {
        averageEmbedding[i] += embedding[i] / chunkEmbeddings.length;
      }
    }

    // Update document with new embedding and content
    await db.collection("research_files").updateOne(
      { _id: new ObjectId(doc._id) },
      {
        $set: {
          embedding: averageEmbedding,
          content: doc.content,
          chunks, // Store the chunks for potential future use
          chunkEmbeddings, // Store individual chunk embeddings
        },
      }
    );

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Successfully regenerated embedding for document ${doc._id}`);
  } catch (error) {
    console.error(
      `Failed to regenerate embedding for document ${doc._id}:`,
      error
    );
  }
}

// Merge and rank results from both search methods
function mergeAndRankResults(
  keywordResults: SearchResult[],
  semanticResults: SearchResult[]
): SearchResult[] {
  const mergedMap = new Map<string, SearchResult>();

  // Process keyword results
  keywordResults.forEach((result) => {
    mergedMap.set(result.metadata.fileId, result);
  });

  // Process semantic results and merge with keyword results
  semanticResults.forEach((result) => {
    if (mergedMap.has(result.metadata.fileId)) {
      // If document exists in both searches, mark it as 'both' and combine scores
      const existing = mergedMap.get(result.metadata.fileId)!;
      mergedMap.set(result.metadata.fileId, {
        ...existing,
        metadata: {
          ...existing.metadata,
          matchType: "both",
          score: (existing.metadata.score + result.metadata.score) / 2,
        },
      });
    } else {
      mergedMap.set(result.metadata.fileId, result);
    }
  });

  // Convert map back to array and sort by score
  return Array.from(mergedMap.values()).sort(
    (a, b) => b.metadata.score - a.metadata.score
  );
}

// Function to generate an answer using either OpenAI or DeepSeek
export async function generateAnswer(
  query: string,
  searchResults: SearchResult[],
  model: ModelType = "gpt-4o-mini"
): Promise<string> {
  try {
    // Limit the number of results to use for context to avoid token limits
    const maxResultsToUse = 5;
    const limitedResults = searchResults.slice(0, maxResultsToUse);

    // Prepare context from search results with length limits
    const context = limitedResults
      .map((result) => {
        // Limit each result to ~1000 words to keep context manageable
        const words = result.content.split(" ");
        const limitedWords = words.slice(0, 1000);
        const limitedContent = limitedWords.join(" ");
        return `Source: ${result.metadata.fileName}\n${limitedContent}\n---`;
      })
      .join("\n\n");

    // Construct the prompt
    const prompt = `You are a helpful research assistant. Based on the following research documents, please answer this question: "${query}"

Research Documents:
${context}

Please provide a clear and concise answer based only on the information provided in these documents. If the documents don't contain enough information to answer the question, please say so.

Answer:`;

    // Call API with rate limiting
    return await callWithRateLimit(async () => {
      if (model === "claude-3-5-sonnet-20241022") {
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1000,
          temperature: 0.7,
          system:
            "You are a helpful research assistant that provides clear, accurate answers based on the provided documents.",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        if (
          !response.content ||
          !response.content[0] ||
          response.content[0].type !== "text"
        ) {
          throw new Error("Invalid response format from Claude");
        }

        return response.content[0].text;
      } else {
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful research assistant that provides clear, accurate answers based on the provided documents.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          });

          return (
            completion.choices[0].message.content || "No response generated"
          );
        } catch (error) {
          console.error("OpenAI API Error:", error);
          throw error;
        }
      }
    }, model);
  } catch (error) {
    console.error("Error generating answer:", error);
    if (error instanceof Error && error.message === "Rate limit exceeded") {
      return "I apologize, but I'm currently experiencing high demand. Please try your search again in a moment.";
    }
    return "I apologize, but I encountered an error while generating an answer. Please try rephrasing your question or try again later.";
  }
}

// Update the hybridSearch function signature to include model selection
export async function hybridSearch(
  query: string,
  carId: string,
  model: ModelType = "gpt-4o-mini"
): Promise<{ results: SearchResult[]; answer?: string }> {
  const db = await getDatabase();

  try {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Performing hybrid search for car ${carId}`);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Query: "${query}"`);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Using model: ${model}`);

    // Process searches in parallel but with a smaller batch size
    const BATCH_SIZE = 10; // Process 10 documents at a time

    // Get all documents first
    const documents = await db
      .collection("research_files")
      .find({ carId })
      .toArray();

    // Process keyword search in batches
    const keywordResults: SearchResult[] = [];
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (doc) => {
          try {
            const result = await db
              .collection("research_files")
              .aggregate([
                { $match: { _id: doc._id, $text: { $search: query } } },
                { $addFields: { score: { $meta: "textScore" } } },
              ])
              .toArray();

            if (result.length > 0) {
              return {
                content: result[0].content,
                metadata: {
                  carId: doc.carId,
                  fileId: doc._id.toString(),
                  fileName: doc.filename,
                  matchType: "keyword" as const,
                  score: result[0].score,
                },
              };
            }
          } catch (error) {
            console.error(`Error processing document ${doc._id}:`, error);
          }
          return null;
        })
      );

      keywordResults.push(...(batchResults.filter(Boolean) as SearchResult[]));
    }

    // Process semantic search in batches
    const queryEmbedding = await callWithRateLimit(
      () => embeddings.embedQuery(query),
      "gpt-4o-mini"
    );

    const semanticResults: SearchResult[] = [];
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE);
      const batchResults = batch
        .filter(
          (doc) => Array.isArray(doc.embedding) && doc.embedding.length > 0
        )
        .map((doc) => {
          const similarity = doc.embedding.reduce(
            (sum: number, val: number, i: number) =>
              sum + val * queryEmbedding[i],
            0
          );

          return {
            content: doc.content,
            metadata: {
              carId: doc.carId,
              fileId: doc._id.toString(),
              fileName: doc.filename,
              matchType: "semantic" as const,
              score: similarity,
            },
          };
        });

      semanticResults.push(...batchResults);
    }

    // Sort and limit semantic results
    const topSemanticResults = semanticResults
      .sort((a, b) => b.metadata.score - a.metadata.score)
      .slice(0, 5);

    console.log(
      `Found ${keywordResults.length} keyword matches and ${topSemanticResults.length} semantic matches`
    );

    // Merge and rank the results
    const mergedResults = mergeAndRankResults(
      keywordResults,
      topSemanticResults
    );
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Found ${mergedResults.length} total results`);

    // Generate answer if we have results, but limit the context size
    let answer: string | undefined;
    if (mergedResults.length > 0) {
      try {
        // Only use top 3 results for answer generation to reduce processing time
        const limitedResults = mergedResults.slice(0, 3);
        answer = await generateAnswer(query, limitedResults, model);
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Successfully generated answer");
      } catch (error) {
        console.error("Failed to generate answer:", error);
      }
    }

    // Return only the top results to reduce response size
    return {
      results: mergedResults.slice(0, 20),
      answer,
    };
  } catch (error) {
    console.error("Error in hybrid search:", error);
    throw error;
  }
}

// Function to prepare research content for searching
export async function prepareResearchContent(
  content: string,
  carId: string,
  fileId: string,
  fileName: string
): Promise<void> {
  try {
    const db = await getDatabase();

    // Split content into chunks if it's large
    const chunks = chunkContent(content, 6000);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Split document into ${chunks.length} chunks`);

    // Generate embeddings for each chunk
    const chunkEmbeddings = await Promise.all(
      chunks.map(generateEmbeddingForChunk)
    );

    // Average the embeddings to get a single embedding for the document
    const embeddingLength = chunkEmbeddings[0].length;
    const averageEmbedding = new Array(embeddingLength).fill(0);

    for (const embedding of chunkEmbeddings) {
      for (let i = 0; i < embeddingLength; i++) {
        averageEmbedding[i] += embedding[i] / chunkEmbeddings.length;
      }
    }

    // Store the content with its embedding
    await db.collection("research_files").updateOne(
      { _id: new ObjectId(fileId) },
      {
        $set: {
          carId,
          filename: fileName,
          content,
          embedding: averageEmbedding,
          chunks,
          chunkEmbeddings,
          updatedAt: new Date(),
        },
      }
    );

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Successfully prepared research content for ${fileName}`);
  } catch (error) {
    console.error("Error preparing research content:", error);
    throw error;
  }
}

// Helper function to join chunks while preserving structure
function joinChunks(chunks: string[]): string {
  return chunks.join("\n\n");
}

async function makeAPIRequest(
  prompt: string,
  model: ModelType,
  systemPrompt: string
) {
  const isClaude = model === "claude-3-5-sonnet-20241022";

  // Estimate tokens and chunk if necessary
  const estimatedPromptTokens = estimateTokens(prompt);
  const maxPromptTokens = isClaude ? 12000 : 20000;
  const maxResponseTokens = isClaude ? 4096 : 12000;

  let processedPrompt = prompt;
  if (estimatedPromptTokens > maxPromptTokens) {
    console.log(
      `Chunking content: ${estimatedPromptTokens} tokens -> ${maxPromptTokens} max`
    );
    const chunks = chunkContent(prompt, maxPromptTokens);
    processedPrompt = joinChunks(chunks);
  }

  if (isClaude) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: maxResponseTokens,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: processedPrompt,
          },
        ],
      });

      if (
        !response.content ||
        !response.content[0] ||
        response.content[0].type !== "text"
      ) {
        throw new Error("Invalid response format from Claude");
      }

      return response.content[0].text;
    } catch (error) {
      console.error("Claude API Error:", error);
      throw error;
    }
  } else {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          { role: "user", content: processedPrompt },
        ],
        temperature: 0.7,
        max_tokens: maxResponseTokens,
      });

      return completion.choices[0].message.content || "No response generated";
    } catch (error) {
      console.error("OpenAI API Error:", error);
      throw error;
    }
  }
}

async function getEmbeddings(text: string) {
  try {
    const db = await getDatabase();
    // ... existing code ...
  } catch (error) {
    console.error("Error getting embeddings:", error);
    throw error;
  }
}

async function searchByEmbeddings(embedding: number[], limit: number = 5) {
  try {
    const db = await getDatabase();
    // ... existing code ...
  } catch (error) {
    console.error("Error searching by embeddings:", error);
    throw error;
  }
}

async function searchByKeywords(keywords: string[], limit: number = 5) {
  try {
    const db = await getDatabase();
    // ... existing code ...
  } catch (error) {
    console.error("Error searching by keywords:", error);
    throw error;
  }
}

async function searchByHybrid(query: string, limit: number = 5) {
  try {
    const db = await getDatabase();
    // ... existing code ...
  } catch (error) {
    console.error("Error searching by hybrid:", error);
    throw error;
  }
}

export async function searchByContent(
  content: string,
  carId: string
): Promise<SearchResult[]> {
  const db = await getDatabase();
  // ... existing code ...
  return [];
}

export async function updateEmbeddings(
  fileId: string,
  content: string
): Promise<void> {
  try {
    const db = await getDatabase();
    // ... existing code ...
  } catch (error) {
    console.error("Error updating embeddings:", error);
    throw error;
  }
}
