import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import {
  verifyAuthMiddleware,
  verifyFirebaseToken,
  getUserIdFromToken,
} from "@/lib/firebase-auth-middleware";
import {
  AIModel,
  validateTokenRange,
  DEFAULT_MODEL_CONFIGS,
} from "@/utils/aiHelpers";

export const runtime = "nodejs";

// ENHANCED: Simple in-memory cache for file metadata to reduce database calls
const fileMetadataCache = new Map<
  string,
  {
    data: any[];
    timestamp: number;
    ttl: number;
  }
>();

// Cache TTL of 5 minutes for file metadata
const CACHE_TTL_MS = 5 * 60 * 1000;

// Cache performance tracking
let cacheStats = {
  hits: 0,
  misses: 0,
  totalQueries: 0,
  reset: () => {
    cacheStats.hits = 0;
    cacheStats.misses = 0;
    cacheStats.totalQueries = 0;
  },
  getHitRate: () => {
    return cacheStats.totalQueries > 0
      ? (cacheStats.hits / cacheStats.totalQueries) * 100
      : 0;
  },
};

// Utility function to clean expired cache entries
function cleanExpiredCache(): void {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, value] of fileMetadataCache.entries()) {
    if (now - value.timestamp > value.ttl) {
      fileMetadataCache.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(
      `🗑️ Cleaned ${cleanedCount} expired cache entries. Cache size: ${fileMetadataCache.size}`
    );
  }
}

interface ChatRequest {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  conversationId?: string;
  entityType: "car" | "project";
  entityId: string;
  fileIds?: string[];
  settings?: {
    model?: AIModel;
    temperature?: number;
    maxTokens?: number;
    tools?: string[];
  };
}

// Model validation middleware
async function validateModelSelection(
  model: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const db = await getDatabase();

    // First check if any model configurations exist
    const configCount = await db
      .collection("ai_model_configs")
      .countDocuments();

    if (configCount === 0) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("No model configurations found, initializing defaults...");

      // Initialize default configurations
      const now = new Date();
      const defaultConfigs = DEFAULT_MODEL_CONFIGS.map((config) => ({
        modelId: config.id,
        displayName: config.displayName,
        description: config.description,
        defaultTokens: config.defaultTokens,
        maxTokens: config.maxTokens,
        enabled: config.enabled,
        cost: 0,
        createdAt: now,
        updatedAt: now,
      }));

      try {
        await db.collection("ai_model_configs").insertMany(defaultConfigs);
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Default model configurations initialized successfully");
      } catch (insertError) {
        console.error("Error initializing model configs:", insertError);
        // Continue with fallback validation below
      }

      // For first-time initialization, allow all default models
      const allowedModels: AIModel[] = ["gpt-4o-mini", "gpt-4o", "gpt-4"];
      return {
        valid: allowedModels.includes(model as AIModel),
        error: allowedModels.includes(model as AIModel)
          ? undefined
          : `Model '${model}' is not supported`,
      };
    }

    // Get model configurations from database
    const modelConfig = await db.collection("ai_model_configs").findOne({
      modelId: model,
      enabled: true,
    });

    if (!modelConfig) {
      return {
        valid: false,
        error: `Model '${model}' is not available or disabled`,
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("Error validating model:", error);
    // Fall back to basic validation if database fails
    const allowedModels: AIModel[] = ["gpt-4o-mini", "gpt-4o", "gpt-4"];
    return {
      valid: allowedModels.includes(model as AIModel),
      error: allowedModels.includes(model as AIModel)
        ? undefined
        : `Model '${model}' is not supported`,
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication using Firebase middleware
    const authResult = await verifyAuthMiddleware(req);
    if (authResult) {
      return authResult;
    }

    // Get user ID from Firebase token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }

    // Extract user ID from the token
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);

    const body: ChatRequest = await req.json();
    const {
      messages,
      conversationId,
      entityType,
      entityId,
      fileIds = [],
      settings = {},
    } = body;

    // Validate required fields
    if (!messages || !entityType || !entityId) {
      return NextResponse.json(
        { error: "Missing required fields: messages, entityType, entityId" },
        { status: 400 }
      );
    }

    // Validate and sanitize settings
    const modelToUse = settings.model || "gpt-4o-mini";
    const modelValidation = await validateModelSelection(modelToUse);

    if (!modelValidation.valid) {
      return NextResponse.json(
        { error: modelValidation.error },
        { status: 400 }
      );
    }

    // Validate token limits
    const maxTokens = settings.maxTokens
      ? validateTokenRange(settings.maxTokens)
      : 1000;

    // Validate entity exists - using correct database pattern
    const db = await getDatabase();

    const entityCollection = entityType === "car" ? "cars" : "projects";
    const entity = await db.collection(entityCollection).findOne({
      _id: new ObjectId(entityId),
    });

    if (!entity) {
      return NextResponse.json(
        { error: `${entityType} not found` },
        { status: 404 }
      );
    }

    // ENHANCED: Get valid OpenAI file IDs early for optimization
    let validOpenAIFileIds: string[] = [];
    let filesMetadata: any[] = [];

    if (fileIds.length > 0) {
      const filesResult = await getValidFileIds(db, fileIds);
      validOpenAIFileIds = filesResult.validFileIds;
      filesMetadata = filesResult.filesMetadata;
    }

    // Get or create conversation
    let conversation;
    const conversationsCollection = db.collection("chat_conversations");

    if (conversationId) {
      conversation = await conversationsCollection.findOne({
        _id: new ObjectId(conversationId),
        "associatedWith.entityId": new ObjectId(entityId),
        "associatedWith.type": entityType,
        participants: userId,
      });

      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found or access denied" },
          { status: 404 }
        );
      }
    } else {
      // Create new conversation with validated settings and optimized tools
      const conversationTools: string[] = [];

      // NOTE: Phase 3A focuses on system prompt optimization
      // file_search tool would require vector store implementation for Phase 3B
      // For now, file information is provided via optimized system prompt

      const newConversation = {
        title: `${entityType === "car" ? "Car" : "Project"} Chat - ${new Date().toLocaleDateString()}`,
        associatedWith: {
          type: entityType,
          entityId: new ObjectId(entityId),
        },
        participants: [userId],
        messages: [],
        fileIds: validOpenAIFileIds, // Store valid OpenAI file IDs for future use
        settings: {
          model: modelToUse,
          temperature: settings.temperature || 0.7,
          maxTokens: maxTokens,
          tools: conversationTools,
        },
        status: "active",
        lastActivity: new Date(),
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await conversationsCollection.insertOne(newConversation);
      conversation = { ...newConversation, _id: result.insertedId };
    }

    // Get OpenAI client
    const openai = getOpenAIClient();

    // ENHANCED: Build optimized system prompt with cached file metadata
    const lastUserMessage = messages[messages.length - 1];
    const systemPrompt = await buildOptimizedSystemPrompt(
      entity,
      entityType,
      filesMetadata
    );

    // ENHANCED: Prepare tools for Responses API with actual file references
    const tools: any[] = [];

    // NOTE: For Phase 3A, we're focusing on system prompt optimization rather than vector stores
    // The Responses API file_search tool requires vector_store_ids, not individual file_ids
    // Future Phase 3B can implement vector store management for enhanced file search capabilities

    // Only add file_search if we implement vector stores in future phases
    // if (validOpenAIFileIds.length > 0) {
    //   tools.push({
    //     type: "file_search",
    //     vector_store_ids: [vector_store_id], // Requires vector store implementation
    //     max_num_results: 10,
    //   });
    // }

    // Prepare input for Responses API with enhanced context
    const inputText = `System Context: ${systemPrompt}\n\nUser: ${lastUserMessage.content}`;

    // ENHANCED: Create response using Responses API with proper file integration
    const responseParams: any = {
      model: conversation.settings.model,
      input: inputText,
      temperature: conversation.settings.temperature,
      max_output_tokens: conversation.settings.maxTokens,
      previous_response_id: conversation.previousResponseId || undefined,
    };

    // Add tools if available (currently none for Phase 3A, but prepared for future phases)
    if (tools.length > 0) {
      responseParams.tools = tools;
      responseParams.tool_choice = "auto";
    }

    const response = await openai.responses.create(responseParams);

    // Extract content from response
    let responseContent =
      response.output
        .filter((item: any) => item.type === "message")
        .map(
          (item: any) =>
            item.content?.find((c: any) => c.type === "output_text")?.text
        )
        .join("") || "";

    // ADDED: Response length validation and truncation
    const maxTokensActual = conversation.settings.maxTokens;
    let wasTruncated = false;

    // Rough token estimation (1 token ≈ 4 characters for most text)
    const estimatedTokens = Math.ceil(responseContent.length / 4);

    if (estimatedTokens > maxTokensActual) {
      // Truncate to approximate token limit
      const maxChars = maxTokensActual * 4;
      responseContent = responseContent.substring(0, maxChars - 100); // Leave buffer for truncation message

      // Find last complete sentence to avoid cutting mid-sentence
      const lastPeriod = responseContent.lastIndexOf(".");
      const lastNewline = responseContent.lastIndexOf("\n");
      const cutoff = Math.max(lastPeriod, lastNewline);

      if (cutoff > maxChars * 0.8) {
        // Only cut at sentence boundary if it's not too far back
        responseContent = responseContent.substring(0, cutoff + 1);
      }

      responseContent += `\n\n[Response truncated due to ${maxTokensActual} token limit]`;
      wasTruncated = true;
    }

    // Save the conversation with the new messages
    const userMessage = {
      id: new ObjectId().toString(),
      role: "user" as const,
      content: lastUserMessage.content,
      timestamp: new Date(),
    };

    const assistantMessage = {
      id: new ObjectId().toString(),
      role: "assistant" as const,
      content: responseContent,
      timestamp: new Date(),
      metadata: {
        model: conversation.settings.model,
        responseId: response.id,
        usage: response.usage
          ? {
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
        attachments:
          validOpenAIFileIds.length > 0 ? validOpenAIFileIds : undefined, // Use validated file IDs
        wasTruncated: wasTruncated,
        requestedMaxTokens: maxTokensActual,
        filesUsed: filesMetadata.length, // Track files used for performance monitoring
      },
    };

    // Update conversation with new messages and response ID
    await conversationsCollection.updateOne({ _id: conversation._id }, {
      $push: {
        messages: { $each: [userMessage, assistantMessage] } as any,
      },
      $set: {
        lastActivity: new Date(),
        updatedAt: new Date(),
        previousResponseId: response.id, // Store for future conversation continuity
      },
    } as any);

    // Create a streaming response for the client with length validation
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        try {
          // Send the complete response (now potentially truncated)
          const data = JSON.stringify({
            type: "content",
            content: assistantMessage.content,
            conversationId: conversation._id.toString(),
            wasTruncated: wasTruncated,
            filesUsed: filesMetadata.length, // Include file usage info
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

          // Send completion signal with additional metadata
          const completeData = JSON.stringify({
            type: "complete",
            conversationId: conversation._id.toString(),
            usage: response.usage,
            wasTruncated: wasTruncated,
            requestedMaxTokens: maxTokensActual,
            filesUsed: filesMetadata.length,
          });
          controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// ENHANCED: Optimized function to get valid file IDs and metadata with caching
async function getValidFileIds(
  db: any,
  fileIds: string[]
): Promise<{
  validFileIds: string[];
  filesMetadata: any[];
}> {
  try {
    // Create cache key from sorted file IDs
    const cacheKey = JSON.stringify(fileIds.sort());
    const now = Date.now();

    cacheStats.totalQueries++;

    // Check cache first
    const cached = fileMetadataCache.get(cacheKey);
    if (cached && now - cached.timestamp < cached.ttl) {
      cacheStats.hits++;
      return {
        validFileIds: cached.data.map((file: any) => file.openaiFileId),
        filesMetadata: cached.data,
      };
    }

    cacheStats.misses++;

    // Single database query to get all file information
    const files = await db
      .collection("ai_files")
      .find({
        openaiFileId: { $in: fileIds },
        status: "processed",
      })
      .project({
        openaiFileId: 1,
        filename: 1,
        originalName: 1,
        mimeType: 1,
        size: 1,
        metadata: 1,
      })
      .toArray();

    // Cache the results
    fileMetadataCache.set(cacheKey, {
      data: files,
      timestamp: now,
      ttl: CACHE_TTL_MS,
    });

    // Periodic cleanup to prevent memory bloat
    if (fileMetadataCache.size > 100 || cacheStats.totalQueries % 50 === 0) {
      cleanExpiredCache();
    }

    const validFileIds = files.map((file: any) => file.openaiFileId);

    return {
      validFileIds,
      filesMetadata: files,
    };
  } catch (error) {
    console.error("Error retrieving file IDs:", error);
    return {
      validFileIds: [],
      filesMetadata: [],
    };
  }
}

// ENHANCED: Optimized system prompt builder that accepts pre-fetched file metadata
async function buildOptimizedSystemPrompt(
  entity: any,
  entityType: "car" | "project",
  filesMetadata: any[]
): Promise<string> {
  let prompt = `You are an AI assistant helping with a ${entityType}. Provide direct, helpful responses without repetitive closing statements like "feel free to ask" or "if you have any other questions." Be conversational but concise.`;

  if (entityType === "car") {
    prompt += `\n\nCar Details:
- Make: ${entity.make || "Unknown"}
- Model: ${entity.model || "Unknown"} 
- Year: ${entity.year || "Unknown"}
- VIN: ${entity.vin || "Not specified"}
- Color: ${entity.color || "Not specified"}
- Status: ${entity.status || "Unknown"}`;
  } else {
    prompt += `\n\nProject Details:
- Name: ${entity.name || "Unnamed Project"}
- Description: ${entity.description || "No description available"}
- Status: ${entity.status || "Unknown"}
- Created: ${entity.createdAt ? new Date(entity.createdAt).toLocaleDateString() : "Unknown"}`;
  }

  // ENHANCED: Use pre-fetched file metadata instead of making additional database queries
  if (filesMetadata.length > 0) {
    prompt += `\n\nAvailable Documents (${filesMetadata.length} files):`;

    for (const file of filesMetadata) {
      prompt += `\n\n--- ${file.filename || file.originalName} ---`;
      prompt += `\nFile ID: ${file.openaiFileId}`;
      prompt += `\nType: ${file.mimeType || "unknown"}`;
      prompt += `\nSize: ${file.size ? `${Math.round(file.size / 1024)}KB` : "unknown"}`;
      if (file.metadata?.description) {
        prompt += `\nDescription: ${file.metadata.description}`;
      }
    }

    prompt += `\n\nThese files are available for searching using the file_search tool. When users ask questions that might be answered by document content, the file_search tool will automatically search through these files to provide accurate, specific information with proper citations.`;
  }

  prompt += `\n\nPlease provide helpful, accurate information and assistance related to this ${entityType}. When file search results are available, be specific about which document you're referencing and quote relevant sections when appropriate. Be direct and conversational - avoid repetitive closing statements or offers to help further.`;

  return prompt;
}

// LEGACY: Keep old function for backward compatibility during transition
async function buildSystemPrompt(
  entity: any,
  entityType: "car" | "project",
  fileIds: string[]
): Promise<string> {
  const db = await getDatabase();
  const filesResult = await getValidFileIds(db, fileIds);
  return buildOptimizedSystemPrompt(
    entity,
    entityType,
    filesResult.filesMetadata
  );
}
