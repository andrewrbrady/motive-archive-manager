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

    // Debug: Log received data
    console.log("AI Analysis API received:", {
      imageUrl: imageUrl ? "provided" : "missing",
      imageId: imageId ? "provided" : "missing",
      metadata: metadata ? Object.keys(metadata) : "empty",
      carId: carId || "missing",
      projectId: projectId || "missing",
      customContext: customContext || "missing",
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

    // Gather additional context from database if IDs are provided
    let contextInfo = {
      carDetails: null as any,
      projectDetails: null as any,
      imageMetadata: metadata || {},
    };

    try {
      const db = await getDatabase();

      // Fetch car details if carId is provided
      if (carId) {
        const car = await db
          .collection("cars")
          .findOne({ _id: new ObjectId(carId) });
        if (car) {
          contextInfo.carDetails = {
            make: car.make,
            model: car.model,
            year: car.year,
            color: car.color,
            description: car.description,
            type: car.type,
          };
        }
      }

      // Fetch project details if projectId is provided
      if (projectId) {
        const project = await db
          .collection("projects")
          .findOne({ _id: new ObjectId(projectId) });
        if (project) {
          contextInfo.projectDetails = {
            name: project.title, // Project model uses 'title' not 'name'
            description: project.description,
            type: project.type,
          };
        }
      }

      // Fetch additional image metadata if imageId is provided
      if (imageId) {
        const image = await db
          .collection("images")
          .findOne({ _id: new ObjectId(imageId) });
        if (image) {
          contextInfo.imageMetadata = {
            ...contextInfo.imageMetadata,
            ...image.metadata,
            filename: image.filename,
          };
        }
      } else if (imageUrl) {
        // Try to find image by URL if no imageId provided
        const image = await db.collection("images").findOne({ url: imageUrl });
        if (image) {
          contextInfo.imageMetadata = {
            ...contextInfo.imageMetadata,
            ...image.metadata,
            filename: image.filename,
          };
          // Also try to get carId/projectId from the image record
          if (image.carId && !carId) {
            const car = await db
              .collection("cars")
              .findOne({ _id: image.carId });
            if (car) {
              contextInfo.carDetails = {
                make: car.make,
                model: car.model,
                year: car.year,
                color: car.color,
                description: car.description,
                type: car.type,
              };
            }
          }
          if (image.projectId && !projectId) {
            const project = await db
              .collection("projects")
              .findOne({ _id: image.projectId });
            if (project) {
              contextInfo.projectDetails = {
                name: project.title, // Project model uses 'title' not 'name'
                description: project.description,
                type: project.type,
              };
            }
          }
        }
      }
    } catch (dbError) {
      console.warn(
        "Failed to fetch additional context from database:",
        dbError
      );
      // Continue without additional context
    }

    // Build context string for the AI
    const contextParts = [];

    if (contextInfo.carDetails) {
      const car = contextInfo.carDetails;
      contextParts.push(
        `Vehicle: ${car.year} ${car.make} ${car.model}${car.color ? ` (${car.color})` : ""}`
      );
      if (car.description) {
        contextParts.push(`Vehicle Description: ${car.description}`);
      }
    }

    if (contextInfo.projectDetails) {
      const project = contextInfo.projectDetails;
      contextParts.push(`Project: ${project.name}`);
      if (project.description) {
        contextParts.push(`Project Description: ${project.description}`);
      }
    }

    if (contextInfo.imageMetadata) {
      const meta = contextInfo.imageMetadata;
      const metaParts = [];

      if (meta.filename) metaParts.push(`Filename: ${meta.filename}`);
      if (meta.angle) metaParts.push(`Angle: ${meta.angle}`);
      if (meta.view) metaParts.push(`View: ${meta.view}`);
      if (meta.movement) metaParts.push(`Movement: ${meta.movement}`);
      if (meta.tod) metaParts.push(`Time of Day: ${meta.tod}`);
      if (meta.side) metaParts.push(`Side: ${meta.side}`);
      if (meta.description) metaParts.push(`Description: ${meta.description}`);
      if (meta.category) metaParts.push(`Category: ${meta.category}`);

      if (metaParts.length > 0) {
        contextParts.push(`Image Metadata: ${metaParts.join(", ")}`);
      }
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
      carDetails: contextInfo.carDetails ? "found" : "missing",
      projectDetails: contextInfo.projectDetails ? "found" : "missing",
      imageMetadata: Object.keys(contextInfo.imageMetadata || {}),
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
