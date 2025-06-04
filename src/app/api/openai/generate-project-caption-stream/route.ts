import { NextRequest, NextResponse } from "next/server";
import { generateTextStream } from "@/lib/llmService";
import { findModelById } from "@/lib/llmProviders";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Helper functions from the regular API (should be shared)
function formatCarSpecifications(
  carDetails: any,
  useMinimalCarData: boolean = false
): string {
  if (!carDetails || !carDetails.cars || carDetails.cars.length === 0) {
    return "";
  }

  const cars = carDetails.cars;
  let specsText = "";

  if (cars.length === 1) {
    // Single car format
    const car = cars[0];
    specsText += `Car: ${car.year} ${car.make} ${car.model}`;
    if (car.color) specsText += ` (${car.color})`;
    specsText += "\n";

    // Add detailed specs for single car
    if (car.engine) {
      if (car.engine.type) specsText += `Engine: ${car.engine.type}\n`;
      if (car.engine.displacement) {
        specsText += `Displacement: ${car.engine.displacement.value} ${car.engine.displacement.unit}\n`;
      }
      if (car.engine.power?.hp) {
        specsText += `Power: ${car.engine.power.hp} HP`;
        if (car.engine.power.kW) specsText += ` (${car.engine.power.kW} kW)`;
        specsText += "\n";
      }
    }
    if (car.transmission?.type) {
      specsText += `Transmission: ${car.transmission.type}`;
      if (car.transmission.speeds)
        specsText += ` (${car.transmission.speeds}-speed)`;
      specsText += "\n";
    }
    if (car.mileage) {
      specsText += `Mileage: ${car.mileage.value} ${car.mileage.unit || "mi"}\n`;
    }
    if (!useMinimalCarData && car.description) {
      specsText += `Description: ${car.description}\n`;
    }
  } else {
    // Multiple cars format
    specsText += `Cars (${cars.length}):\n`;
    cars.forEach((car: any, index: number) => {
      specsText += `${index + 1}. ${car.year} ${car.make} ${car.model}`;
      if (car.color) specsText += ` (${car.color})`;
      if (car.engine?.type) specsText += ` - ${car.engine.type}`;
      if (car.transmission?.type) specsText += ` - ${car.transmission.type}`;
      specsText += "\n";
    });
  }

  return specsText;
}

function formatEventSpecifications(eventDetails: any): string {
  if (
    !eventDetails ||
    !eventDetails.events ||
    eventDetails.events.length === 0
  ) {
    return "";
  }

  let eventText = "";
  const events = eventDetails.events;

  eventText += `Events (${events.length}):\n`;

  events.forEach((event: any, index: number) => {
    const eventDate = new Date(event.start);
    const isUpcoming = eventDate > new Date();

    eventText += `${index + 1}. ${event.title}`;
    eventText += ` - ${event.type}`;
    eventText += ` - ${eventDate.toLocaleDateString()}`;
    eventText += ` (${isUpcoming ? "Upcoming" : "Past"})`;
    if (event.description) eventText += ` - ${event.description}`;
    eventText += "\n";
  });

  return eventText;
}

function getMaxTokensForLength(length: string): number {
  // Remove hard token limits - let the AI generate appropriate length based on instructions
  // Return a generous limit that won't cut off content (same as regular API)
  return 1000;
}

export async function POST(request: NextRequest) {
  try {
    const {
      projectId,
      selectedCarIds = [],
      selectedEventIds = [],
      selectedSystemPromptId,
      customLLMText,
      context,
      clientInfo,
      carDetails,
      eventDetails,
      platform = "instagram",
      tone = "professional",
      style = "engaging",
      length = "standard",
      template,
      temperature = 0.7,
      aiModel = "gpt-4",
      useMinimalCarData = false,
    } = await request.json();

    console.log("=== STREAMING PROJECT CAPTION REQUEST ===");
    console.log("Project ID:", projectId);
    console.log("Model:", aiModel);
    console.log("Car Details Count:", carDetails?.count || 0);
    console.log("Event Details Count:", eventDetails?.count || 0);
    console.log("Template:", template);
    console.log("Custom LLM Text:", !!customLLMText);

    // Validate required parameters
    if (!platform || !carDetails || !aiModel) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Validate model
    const modelInfo = findModelById(aiModel);
    if (!modelInfo) {
      return NextResponse.json(
        { error: `Model ${aiModel} not found` },
        { status: 400 }
      );
    }

    // Get database connection
    const { db } = await connectToDatabase();

    // Fetch system prompt
    let systemPrompt = "";
    if (selectedSystemPromptId) {
      const systemPromptDoc = await db.collection("systemPrompts").findOne({
        _id: new ObjectId(selectedSystemPromptId),
      });
      systemPrompt = systemPromptDoc?.prompt || "";
    }

    // Fallback to active system prompt if needed
    if (!systemPrompt) {
      const activeSystemPromptDoc = await db
        .collection("systemPrompts")
        .findOne({
          isActive: true,
        });
      systemPrompt = activeSystemPromptDoc?.prompt || "";
    }

    // Format car and event specifications like the regular API
    const specsText = formatCarSpecifications(carDetails, useMinimalCarData);
    const eventSpecsText = formatEventSpecifications(eventDetails);

    // Use custom LLM text if provided, otherwise build prompt (EXACTLY like regular API)
    let userPrompt = "";
    if (customLLMText && customLLMText.trim()) {
      userPrompt = customLLMText.trim();
    } else {
      // Build standard prompt with ALL the same details as regular API
      const userPromptParts: string[] = [];

      // Add additional context/instructions at the top if provided
      if (context) {
        userPromptParts.push("ADDITIONAL INSTRUCTIONS:", context, "");
      }

      userPromptParts.push("VEHICLE PROJECT SPECIFICATIONS:", specsText);

      // Add event specifications if available
      if (eventSpecsText) {
        userPromptParts.push(
          "",
          "PROJECT EVENT SPECIFICATIONS:",
          eventSpecsText
        );
      }

      userPromptParts.push(
        "",
        "CAPTION REQUIREMENTS:",
        `- Platform: ${platform}`,
        `- Tone: ${tone}`,
        `- Style: ${style}`,
        `- Length: ${length}`
      );

      if (template && template !== "none") {
        userPromptParts.push(`- Template: ${template}`);
      }

      // Add explicit length examples and requirements (SAME AS REGULAR API)
      // Fetch custom length guidelines from database with timeout
      let lengthGuidelines: { [key: string]: string } = {
        concise: "Keep the caption very brief, 1-2 lines maximum.",
        standard: "Write a standard length caption of 2-3 lines.",
        detailed:
          "Create a detailed caption of 3-4 lines, including more specifications.",
        comprehensive:
          "Write a comprehensive caption of 4+ lines with extensive details.",
      };

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Length settings fetch timeout")),
            5000
          )
        );

        const lengthSettingsPromise = fetch(
          `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/length-settings`,
          {
            headers: {
              Cookie: request.headers.get("cookie") || "",
            },
          }
        );

        const lengthSettingsResponse = (await Promise.race([
          lengthSettingsPromise,
          timeoutPromise,
        ])) as Response;

        if (lengthSettingsResponse.ok) {
          const lengthSettings = await lengthSettingsResponse.json();
          // Convert array to object for easy lookup
          lengthGuidelines = lengthSettings.reduce(
            (acc: { [key: string]: string }, setting: any) => {
              acc[setting.key] = setting.instructions;
              return acc;
            },
            {}
          );
        }
      } catch (error) {
        console.error("Error fetching length settings:", error);
        // Continue with default guidelines
      }

      const lengthExamples = {
        concise:
          "EXAMPLE: 'Three generations of Porsche 911 excellence. From air-cooled classics to modern turbocharged precision.'",
        standard:
          "EXAMPLE: 'This curated collection showcases the evolution of German engineering excellence. From the raw, air-cooled 1973 911 Carrera to the refined 2023 992 Turbo S, each vehicle represents a pivotal moment in automotive history.'",
        detailed:
          "EXAMPLE: 'This exceptional collection traces the bloodline of Porsche's most iconic model across five decades. The air-cooled 1973 911 Carrera delivers pure, unfiltered driving dynamics with its 2.7L flat-six. The water-cooled 1999 996 Turbo introduced forced induction to the 911 lineage.'",
        comprehensive:
          "EXAMPLE: 'This meticulously curated collection represents the complete evolution of Porsche's legendary 911 platform spanning five transformative decades. The 1973 911 Carrera showcases the purity of air-cooled engineering with its naturally aspirated 2.7-liter flat-six producing 175 horsepower.'",
      };

      userPromptParts.push(
        "",
        `LENGTH: ${length.toUpperCase()}`,
        lengthGuidelines[length] || lengthGuidelines.standard,
        "",
        lengthExamples[length as keyof typeof lengthExamples] ||
          lengthExamples.standard,
        "",
        "Generate caption following the example length:"
      );

      if (clientInfo?.handle) {
        userPromptParts.push("", `Client: ${clientInfo.handle}`);
      }

      userPromptParts.push("", "Generate caption:");

      userPrompt = userPromptParts.join("\n");
    }

    console.log("=== STREAMING PROMPT DETAILS ===");
    console.log("System Prompt Length:", systemPrompt.length);
    console.log("User Prompt Length:", userPrompt.length);
    console.log("Specs Text Preview:", specsText.substring(0, 200) + "...");
    if (eventSpecsText) {
      console.log(
        "Events Text Preview:",
        eventSpecsText.substring(0, 200) + "..."
      );
    }
    console.log("Template:", template);
    console.log("Length Guidelines Applied:", length);

    // Generate streaming response
    const streamingResponse = await generateTextStream({
      modelId: aiModel,
      prompt: userPrompt,
      systemPrompt,
      params: {
        temperature: temperature || 0.7,
        maxTokens: getMaxTokensForLength(length),
      },
    });

    // Return the stream directly with proper headers (simpler approach)
    return new Response(streamingResponse.stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in streaming caption generation:", error);
    return NextResponse.json(
      { error: "Failed to generate streaming caption" },
      { status: 500 }
    );
  }
}
