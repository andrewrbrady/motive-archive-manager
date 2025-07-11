import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/llmService";
import { findModelById } from "@/lib/llmProviders";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import AIImageAnalysisPrompt from "@/models/AIImageAnalysisPrompt";

export async function POST(request: NextRequest) {
  try {
    const {
      imageUrl,
      imageId,
      metadata,
      carId,
      projectId,
      customContext,
      analysisType = "both", // 'alt', 'caption', or 'both'
      aiModel = "gpt-4o-mini",
      temperature = 0.7,
    } = await request.json();

    // Debug: Log what we received
    console.log("AI Analysis API received:", {
      imageUrl: imageUrl ? "provided" : "missing",
      imageId: imageId ? "provided" : "missing",
      metadata: metadata ? Object.keys(metadata) : "missing",
      metadataValues: metadata ? JSON.stringify(metadata, null, 2) : "missing",
      customContext: customContext ? "provided" : "missing",
      analysisType,
    });

    // Validate required parameters
    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Validate model exists
    const modelInfo = findModelById(aiModel);
    if (!modelInfo) {
      return NextResponse.json(
        { error: `Model '${aiModel}' not found or not supported` },
        { status: 400 }
      );
    }

    // Gather image metadata only - no database lookups
    let contextInfo = {
      imageMetadata: metadata || {},
    };

    console.log(
      "Initial metadata from request:",
      JSON.stringify(contextInfo.imageMetadata, null, 2)
    );

    try {
      const db = await getDatabase();

      // Fetch additional image metadata if imageId is provided
      if (imageId) {
        console.log("Looking up image by ID:", imageId);
        const image = await db
          .collection("images")
          .findOne({ _id: new ObjectId(imageId) });
        if (image) {
          console.log(
            "Found image by ID, merging metadata:",
            JSON.stringify(image.metadata, null, 2)
          );
          contextInfo.imageMetadata = {
            ...contextInfo.imageMetadata,
            ...image.metadata,
            filename: image.filename,
          };
        } else {
          console.log("No image found by ID");
        }
      } else if (imageUrl) {
        console.log("Looking up image by URL:", imageUrl);

        // Try multiple URL matching strategies
        let image = null;

        // 1. Exact URL match
        image = await db.collection("images").findOne({ url: imageUrl });
        if (image) {
          console.log("Found image by exact URL match");
        } else {
          // 2. Try matching by Cloudflare ID extracted from URL
          const cloudflareIdMatch = imageUrl.match(
            /\/([a-f0-9-]{36})\/[^\/]*$/
          );
          if (cloudflareIdMatch) {
            const cloudflareId = cloudflareIdMatch[1];
            console.log("Extracted Cloudflare ID:", cloudflareId);
            image = await db
              .collection("images")
              .findOne({ cloudflareId: cloudflareId });
            if (image) {
              console.log("Found image by Cloudflare ID");
            }
          }

          // 3. Try partial URL matching (in case of different domains)
          if (!image) {
            const urlPath = imageUrl.split("/").slice(-2).join("/"); // Get last two parts
            console.log("Trying partial URL match with path:", urlPath);
            image = await db.collection("images").findOne({
              url: {
                $regex: urlPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                $options: "i",
              },
            });
            if (image) {
              console.log("Found image by partial URL match");
            }
          }
        }

        if (image) {
          console.log(
            "Found image by URL, merging metadata:",
            JSON.stringify(image.metadata, null, 2)
          );
          contextInfo.imageMetadata = {
            ...contextInfo.imageMetadata,
            ...image.metadata,
            filename: image.filename,
          };
        } else {
          console.log("No image found by URL after trying all strategies");
          // Log some sample URLs from the database for debugging
          const sampleImages = await db
            .collection("images")
            .find({})
            .limit(3)
            .toArray();
          console.log(
            "Sample image URLs from database:",
            sampleImages.map((img) => ({
              url: img.url,
              cloudflareId: img.cloudflareId,
            }))
          );
        }
      }
    } catch (dbError) {
      console.warn("Failed to fetch image metadata from database:", dbError);
      // Continue with provided metadata only
    }

    console.log(
      "Final merged metadata:",
      JSON.stringify(contextInfo.imageMetadata, null, 2)
    );

    // Build context string for the AI from image metadata only
    const contextParts = [];

    if (contextInfo.imageMetadata) {
      const meta = contextInfo.imageMetadata;
      const metaParts = [];

      // First check for standard image metadata fields
      if (meta.filename) metaParts.push(`Filename: ${meta.filename}`);
      if (meta.angle) metaParts.push(`Angle: ${meta.angle}`);
      if (meta.view) metaParts.push(`View: ${meta.view}`);
      if (meta.movement) metaParts.push(`Movement: ${meta.movement}`);
      if (meta.tod) metaParts.push(`Time of Day: ${meta.tod}`);
      if (meta.side) metaParts.push(`Side: ${meta.side}`);
      if (meta.description) metaParts.push(`Description: ${meta.description}`);
      if (meta.category) metaParts.push(`Category: ${meta.category}`);

      // Include vehicle info if present in metadata
      if (meta.vehicleInfo) {
        const vehicle = meta.vehicleInfo;
        const vehicleParts = [];
        if (vehicle.make) vehicleParts.push(`Make: ${vehicle.make}`);
        if (vehicle.model) vehicleParts.push(`Model: ${vehicle.model}`);
        if (vehicle.year) vehicleParts.push(`Year: ${vehicle.year}`);
        if (vehicleParts.length > 0) {
          metaParts.push(`Vehicle: ${vehicleParts.join(", ")}`);
        }
      }

      // Include any additional metadata fields that might be useful
      if (meta.source) metaParts.push(`Source: ${meta.source}`);
      if (meta.gallerySource)
        metaParts.push(`Gallery Source: ${meta.gallerySource}`);
      if (meta.createdAt) metaParts.push(`Created: ${meta.createdAt}`);
      if (meta.location) metaParts.push(`Location: ${meta.location}`);
      if (meta.tags && Array.isArray(meta.tags)) {
        metaParts.push(`Tags: ${meta.tags.join(", ")}`);
      }

      // Include any other metadata fields that might be present
      const standardFields = new Set([
        "filename",
        "angle",
        "view",
        "movement",
        "tod",
        "side",
        "description",
        "category",
        "vehicleInfo",
        "source",
        "gallerySource",
        "createdAt",
        "location",
        "tags",
        "projectId",
        "_id",
        "updatedAt",
      ]);

      Object.entries(meta).forEach(([key, value]) => {
        if (!standardFields.has(key) && value && typeof value === "string") {
          metaParts.push(`${key}: ${value}`);
        }
      });

      if (metaParts.length > 0) {
        contextParts.push(`Image Metadata: ${metaParts.join(", ")}`);
      }
    }

    // Add project context if projectId is available
    if (projectId) {
      contextParts.push(
        `Project Context: This image is associated with project ${projectId}`
      );
    }

    // Add car context if carId is available
    if (carId) {
      contextParts.push(
        `Car Context: This image is associated with car ${carId}`
      );
    }

    // Add custom context if provided
    if (customContext && customContext.trim()) {
      contextParts.push(`User Context: ${customContext.trim()}`);
    }

    const contextString =
      contextParts.length > 0 ? contextParts.join("\n") : "";

    // Debug: Log context gathered
    console.log("Context gathered:", {
      contextParts: contextParts.length,
      contextString: contextString || "No context available",
      imageMetadata: Object.keys(contextInfo.imageMetadata),
      customContext: customContext ? "provided" : "missing",
    });

    // If we have no context, try to extract info from image URL
    let fallbackContext = "";
    if (!contextString && imageUrl) {
      // Try to extract filename and any patterns from the URL
      const urlParts = imageUrl.split("/");
      const filename = urlParts[urlParts.length - 1];
      fallbackContext = `Image: ${filename}`;
    }

    // Get the appropriate prompt from the database
    let promptConfig = null;
    try {
      promptConfig = await AIImageAnalysisPrompt.findOne({
        analysisType: analysisType,
        isActive: true,
        isDefault: true,
      });

      // If no default found, get any active prompt for this type
      if (!promptConfig) {
        promptConfig = await AIImageAnalysisPrompt.findOne({
          analysisType: analysisType,
          isActive: true,
        });
      }
    } catch (error) {
      console.warn("Failed to fetch prompt config:", error);
    }

    // Build the system prompt based on analysis type
    let systemPrompt = "";
    let userPrompt = "";

    if (analysisType === "alt" || analysisType === "both") {
      if (promptConfig && promptConfig.analysisType === "alt") {
        systemPrompt = promptConfig.systemPrompt;
        userPrompt = promptConfig.userPromptTemplate.replace(
          "{contextString}",
          contextString || fallbackContext
        );
      } else {
        // Fallback to hardcoded prompts
        systemPrompt = `You are an expert at writing accessible alt text for automotive images. Your task is to generate concise alt text (under 125 characters) that:

1. Uses ONLY the provided vehicle and image metadata - do not make up details
2. Describes the specific view/angle from the metadata (front, side, rear, interior, etc.)
3. Includes make, model, year from the context if available
4. Is factual and descriptive, not promotional
5. Avoids redundant phrases like "image of" or "picture of"
6. Focuses on accessibility - what would help someone understand the image content

Format: "[Year] [Make] [Model] [view/angle]" or similar factual description.

Return only the alt text, no additional formatting or explanation.`;

        userPrompt = `Generate concise alt text using ONLY this provided context:

${contextString || fallbackContext}

Write factual alt text (under 125 characters) based only on the information provided above. Focus on accessibility and be specific about the view/angle.`;
      }
    }

    if (analysisType === "caption") {
      if (promptConfig && promptConfig.analysisType === "caption") {
        systemPrompt = promptConfig.systemPrompt;
        userPrompt = promptConfig.userPromptTemplate.replace(
          "{contextString}",
          contextString || fallbackContext
        );
      } else {
        // Fallback to hardcoded prompts
        systemPrompt = `You are an expert at writing concise, specific captions for automotive images. Your task is to generate a SHORT caption (maximum 1-2 sentences, under 150 characters) that:

1. Uses ONLY the provided vehicle and image metadata - do not make up details
2. Focuses on the specific view/angle described in the metadata
3. Mentions the exact make, model, year from the context
4. Is factual and specific, not generic or promotional
5. Avoids generic phrases like "stunning" or "beautiful"

If insufficient context is provided, write a brief, factual caption based only on what is known.

Return only the caption text, no additional formatting or explanation.`;

        userPrompt = `Generate a SHORT, specific caption using ONLY this provided context:

${contextString || fallbackContext}

Write a factual caption (under 150 characters) based only on the information provided above. Do not add generic descriptions or make assumptions.`;
      }
    }

    if (analysisType === "both") {
      if (promptConfig && promptConfig.analysisType === "both") {
        systemPrompt = promptConfig.systemPrompt;
        userPrompt = promptConfig.userPromptTemplate.replace(
          "{contextString}",
          contextString || fallbackContext
        );
      } else {
        // Fallback to hardcoded prompts
        systemPrompt = `You are an expert at writing both accessible alt text and concise captions for automotive images. Use ONLY the provided metadata - do not make up details.

1. ALT TEXT - Factual, descriptive text for accessibility (under 125 characters)
   - Include make, model, year from context if available
   - Describe the specific view/angle from metadata
   - Be factual and specific, not promotional
   - Avoid redundant phrases like "image of"

2. CAPTION - Short, factual caption (under 150 characters)
   - Use only the provided vehicle and image metadata
   - Focus on the specific view/angle described
   - Be factual and specific, not generic
   - Avoid promotional language like "stunning" or "beautiful"

Return your response in this exact format:
ALT: [alt text here]
CAPTION: [caption text here]`;

        userPrompt = `Generate both alt text and caption using ONLY this provided context:

${contextString || fallbackContext}

Write factual alt text (under 125 characters) and caption (under 150 characters) based only on the information provided above. Do not add generic descriptions or make assumptions.`;
      }
    }

    // Generate the content using the LLM service
    const response = await generateText({
      modelId: aiModel,
      prompt: userPrompt,
      systemPrompt,
      params: {
        temperature,
        maxTokens: 100, // Reduced for concise responses
      },
    });

    const generatedText = response.text.trim();

    // Parse the response based on analysis type
    let result: any = {};

    if (analysisType === "both") {
      // Parse the structured response
      const altMatch = generatedText.match(/ALT:\s*(.+?)(?=\nCAPTION:|$)/);
      const captionMatch = generatedText.match(/CAPTION:\s*(.+?)$/);

      result = {
        altText: altMatch ? altMatch[1].trim() : "",
        caption: captionMatch ? captionMatch[1].trim() : "",
      };
    } else if (analysisType === "alt") {
      result = {
        altText: generatedText,
      };
    } else if (analysisType === "caption") {
      result = {
        caption: generatedText,
      };
    }

    return NextResponse.json({
      success: true,
      ...result,
      model: aiModel,
      analysisType,
      contextUsed: contextParts.length > 0,
    });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
