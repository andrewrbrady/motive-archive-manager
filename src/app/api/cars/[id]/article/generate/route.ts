import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { ModelType } from "@/components/ModelSelector";

interface OutlinePoint {
  id: string;
  title: string;
  subpoints: string[];
  content: string;
  status: "pending" | "in_progress" | "completed";
  parentId?: string;
  order: number;
  depth: number;
}

interface ArticleState {
  _id?: ObjectId;
  carId: string;
  outline: OutlinePoint[];
  workingDraft: string;
  currentPoint: string; // ID of current outline point
  stage: "outlining" | "expanding" | "revising";
  detailLevel: string;
  focus?: string;
  lastUpdated: Date;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { model, focus, stage, pointId } = body;
    const carId = params.id;

    if (!carId) {
      return NextResponse.json(
        { error: "Car ID is required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const db = await getDatabase();

    // Get car details
    const car = await db
      .collection("cars")
      .findOne({ _id: new ObjectId(carId) });
    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Get all research files for this car
    const researchFiles = await db
      .collection("research_files")
      .find({ carId })
      .toArray();

    // Extract content from research files
    const researchContent = researchFiles
      .map((file) => file.content)
      .filter(Boolean)
      .join("\n\n");

    // Calculate appropriate detail level based on research content
    const contentLength = researchContent.length;
    const detailLevel =
      contentLength > 10000
        ? "very detailed"
        : contentLength > 5000
        ? "detailed"
        : "standard";

    // Get or create article state
    const articleStates = db.collection<ArticleState>("article_states");
    let articleState = await articleStates.findOne({ carId });

    if (!articleState) {
      // Start with outline generation
      const outlinePrompt = `Create a detailed, hierarchical outline for an in-depth article about the ${
        car.year
      } ${car.make} ${car.model}.
      
IMPORTANT INSTRUCTIONS:
- Create a comprehensive outline that will support a very detailed article
- Include specific technical aspects, historical details, and performance characteristics
- Break down each major section into detailed subsections
- Include specific points about measurements, specifications, and technical details
- Create outline points that will each expand into multiple paragraphs
${
  focus
    ? `\n- Ensure the outline thoroughly covers ${focus} while maintaining overall vehicle context`
    : ""
}

Car Details:
${JSON.stringify(car, null, 2)}

Research Content:
${researchContent}

The outline should be extremely detailed and support an article of ${detailLevel} depth.`;

      const outlineResponse = await generateContent(outlinePrompt, model, 8000);
      const outline = parseOutlineToStructure(outlineResponse);

      const newArticleState: Omit<ArticleState, "_id"> = {
        carId,
        outline,
        workingDraft: "",
        currentPoint: outline[0].id,
        stage: "outlining",
        detailLevel,
        focus,
        lastUpdated: new Date(),
      };

      const result = await articleStates.insertOne(newArticleState);
      articleState = {
        _id: result.insertedId,
        ...newArticleState,
      };
    }

    // Handle different stages of article generation
    switch (stage || articleState.stage) {
      case "outlining":
        return handleOutlineStage(articleState, db, carId);

      case "expanding": {
        const targetPoint = pointId || articleState.currentPoint;
        const point = articleState.outline.find((p) => p.id === targetPoint);

        if (!point) {
          return NextResponse.json(
            { error: "Invalid outline point" },
            { status: 400 }
          );
        }

        // Get context from parent points if they exist
        const contextPoints = getContextPoints(articleState.outline, point);
        const existingContent = contextPoints
          .map((p) => p.content)
          .join("\n\n");

        const expansionPrompt = `Expand the following outline point into detailed, in-depth content for our article about the ${
          car.year
        } ${car.make} ${car.model}.

Current outline point to expand: ${point.title}
Subpoints to cover:
${point.subpoints.map((sp) => `- ${sp}`).join("\n")}

IMPORTANT CONTEXT:
${existingContent ? `Previous relevant content:\n${existingContent}\n\n` : ""}

IMPORTANT INSTRUCTIONS:
- Write multiple detailed paragraphs expanding this outline point
- Include specific technical details, measurements, and specifications
- Use direct quotes from research material where relevant
- Maintain ${detailLevel} depth throughout
- Do not summarize - provide full, in-depth coverage
- Write at least 1000 words for this section
${focus ? `- Thoroughly explore how ${focus} relates to this aspect` : ""}

Research Content:
${researchContent}

Car Details:
${JSON.stringify(car, null, 2)}`;

        const expandedContent = await generateContent(
          expansionPrompt,
          model,
          16000
        );

        // Update the point's content and status
        point.content = expandedContent;
        point.status = "completed";

        // Update working draft
        articleState.workingDraft = updateWorkingDraft(articleState.outline);

        // Find next pending point
        const nextPoint = findNextPendingPoint(articleState.outline, point.id);
        articleState.currentPoint = nextPoint?.id || point.id;

        // Check if all points are completed
        if (!nextPoint) {
          articleState.stage = "revising";
        }

        await articleStates.updateOne({ carId }, { $set: articleState });

        return NextResponse.json({
          point: {
            id: point.id,
            title: point.title,
            content: point.content,
            status: point.status,
          },
          nextPoint: nextPoint
            ? {
                id: nextPoint.id,
                title: nextPoint.title,
              }
            : null,
          workingDraft: articleState.workingDraft,
          stage: articleState.stage,
        });
      }

      case "revising": {
        const revisionPrompt = `Review and revise the following article draft for the ${
          car.year
        } ${car.make} ${car.model} to ensure cohesion, flow, and depth.

IMPORTANT INSTRUCTIONS:
- Maintain all technical details and specifications
- Ensure smooth transitions between sections
- Identify and resolve any content overlap
- Maintain consistent tone and style
- Preserve the ${detailLevel} depth throughout
${focus ? `- Ensure comprehensive coverage of ${focus} is maintained` : ""}

Current Draft:
${articleState.workingDraft}

Research Content:
${researchContent}`;

        const revisedContent = await generateContent(
          revisionPrompt,
          model,
          32000
        );

        // Save final version
        await db.collection("car_articles").updateOne(
          { carId },
          {
            $set: {
              content: revisedContent,
              model,
              generatedAt: new Date(),
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );

        // Clean up article state
        await articleStates.deleteOne({ carId });

        return NextResponse.json({
          article: revisedContent,
          isComplete: true,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error generating article:", error);
    return NextResponse.json(
      { error: "Failed to generate article" },
      { status: 500 }
    );
  }
}

async function generateContent(
  prompt: string,
  model: ModelType,
  maxTokens: number
) {
  const isDeepSeek = model.startsWith("deepseek");
  const isClaude = model.startsWith("claude");

  const apiConfig = {
    url: isDeepSeek
      ? process.env.DEEPSEEK_API_URL || "https://api.deepseek.com"
      : isClaude
      ? process.env.CLAUDE_API_URL || "https://api.anthropic.com"
      : "https://api.openai.com/v1/chat/completions",
    key: isDeepSeek
      ? process.env.DEEPSEEK_API_KEY
      : isClaude
      ? process.env.ANTHROPIC_API_KEY
      : process.env.OPENAI_API_KEY,
  };

  const endpoint = isClaude ? "/v1/messages" : "/v1/chat/completions";

  const requestBody = isClaude
    ? {
        model: "claude-3-5-sonnet-20241022",
        max_tokens: maxTokens,
        system:
          "You are a professional automotive journalist writing comprehensive, detailed articles about vehicles. Your articles should maintain the full depth and detail level of the source material, avoiding unnecessary summarization.",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }
    : {
        model: model,
        messages: [
          {
            role: "system",
            content:
              "You are a professional automotive journalist writing in-depth articles about vehicles.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      };

  const response = await fetch(apiConfig.url + endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(isClaude
        ? {
            "x-api-key": apiConfig.key,
            "anthropic-version": "2023-06-01",
          }
        : {
            Authorization: `Bearer ${apiConfig.key}`,
          }),
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate content: ${response.statusText}`);
  }

  const data = await response.json();
  return isClaude ? data.content[0].text : data.choices[0].message.content;
}

function parseOutlineToStructure(outlineText: string): OutlinePoint[] {
  // Implementation to parse outline text into structured format
  // This would parse the LLM's outline response into our OutlinePoint structure
  // You'll need to implement the actual parsing logic based on the outline format
  const outline: OutlinePoint[] = [];
  // ... parsing logic ...
  return outline;
}

function getContextPoints(
  outline: OutlinePoint[],
  currentPoint: OutlinePoint
): OutlinePoint[] {
  const context: OutlinePoint[] = [];
  if (currentPoint.parentId) {
    const parent = outline.find((p) => p.id === currentPoint.parentId);
    if (parent) {
      context.push(parent);
      context.push(...getContextPoints(outline, parent));
    }
  }
  return context;
}

function updateWorkingDraft(outline: OutlinePoint[]): string {
  return outline
    .filter((point) => point.status === "completed")
    .sort((a, b) => a.order - b.order)
    .map((point) => point.content)
    .join("\n\n");
}

function findNextPendingPoint(
  outline: OutlinePoint[],
  currentId: string
): OutlinePoint | null {
  const current = outline.find((p) => p.id === currentId);
  if (!current) return null;

  // First try to find next point at same depth
  const nextAtSameDepth = outline
    .filter(
      (p) =>
        p.depth === current.depth &&
        p.order > current.order &&
        p.status === "pending"
    )
    .sort((a, b) => a.order - b.order)[0];

  if (nextAtSameDepth) return nextAtSameDepth;

  // Then try to find next point at any depth
  return (
    outline
      .filter((p) => p.order > current.order && p.status === "pending")
      .sort((a, b) => a.order - b.order)[0] || null
  );
}

async function handleOutlineStage(
  articleState: ArticleState,
  db: any,
  carId: string
) {
  // Validate outline and move to expansion stage
  articleState.stage = "expanding";
  articleState.currentPoint = articleState.outline[0].id;

  await db
    .collection("article_states")
    .updateOne({ carId }, { $set: articleState });

  return NextResponse.json({
    outline: articleState.outline,
    nextStage: "expanding",
    firstPoint: {
      id: articleState.outline[0].id,
      title: articleState.outline[0].title,
    },
  });
}
