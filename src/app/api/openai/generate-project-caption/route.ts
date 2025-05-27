import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/llmService";
import { findModelById } from "@/lib/llmProviders";

interface MessageContent {
  type: "text";
  text: string;
}

// Helper function to format car specifications
function formatCarSpecifications(
  carDetails: any,
  useMinimalCarData: boolean = false
): string {
  const projectSpecs: string[] = [];

  // Project overview
  projectSpecs.push(
    `Project contains ${carDetails.count} vehicle${carDetails.count !== 1 ? "s" : ""}`
  );

  if (carDetails.makes && carDetails.makes.length > 0) {
    projectSpecs.push(`Makes: ${carDetails.makes.join(", ")}`);
  }

  if (carDetails.years && carDetails.years.length > 0) {
    const yearRange =
      carDetails.years.length === 1
        ? carDetails.years[0]
        : `${carDetails.years[0]} - ${carDetails.years[carDetails.years.length - 1]}`;
    projectSpecs.push(`Year Range: ${yearRange}`);
  }

  if (carDetails.colors && carDetails.colors.length > 0) {
    projectSpecs.push(`Colors: ${carDetails.colors.join(", ")}`);
  }

  // Individual car details - limit to essential info to reduce prompt size
  if (carDetails.cars && carDetails.cars.length > 0) {
    projectSpecs.push("\nVehicle Details:");

    carDetails.cars.forEach((car: any, index: number) => {
      const carSpecs: string[] = [];

      // Essential car info only
      if (car.year) carSpecs.push(`${car.year}`);
      if (car.make) carSpecs.push(`${car.make}`);
      if (car.model) carSpecs.push(`${car.model}`);
      if (car.color) carSpecs.push(`${car.color}`);

      // Only include description if not using minimal data and it's short
      if (
        !useMinimalCarData &&
        car.description &&
        car.description.length < 200
      ) {
        carSpecs.push(`${car.description}`);
      }

      // Essential specs only
      if (car.mileage?.value) {
        carSpecs.push(`${car.mileage.value}${car.mileage.unit || "mi"}`);
      }

      if (car.engine?.power?.hp) {
        carSpecs.push(`${car.engine.power.hp}hp`);
      }

      if (car.transmission) {
        carSpecs.push(`${car.transmission}`);
      }

      if (carSpecs.length > 0) {
        projectSpecs.push(`${index + 1}. ${carSpecs.join(" ")}`);
      }
    });
  }

  return projectSpecs.join("\n");
}

// Helper function to format event specifications
function formatEventSpecifications(eventDetails: any): string {
  if (!eventDetails || eventDetails.count === 0) {
    return "";
  }

  const eventSpecs: string[] = [];

  // Event overview
  eventSpecs.push(
    `Project includes ${eventDetails.count} event${eventDetails.count !== 1 ? "s" : ""}`
  );

  if (eventDetails.types && eventDetails.types.length > 0) {
    eventSpecs.push(`Types: ${eventDetails.types.join(", ")}`);
  }

  // Simplified event details - only essential info
  if (eventDetails.events && eventDetails.events.length > 0) {
    eventSpecs.push("\nEvent Details:");

    eventDetails.events.forEach((event: any, index: number) => {
      const specs: string[] = [];

      // Essential event info only
      if (event.title) specs.push(event.title);
      if (event.type) specs.push(`(${event.type})`);

      if (event.start) {
        const startDate = new Date(event.start);
        const isUpcoming = startDate > new Date();
        specs.push(isUpcoming ? "Upcoming" : "Past");
      }

      if (specs.length > 0) {
        eventSpecs.push(`${index + 1}. ${specs.join(" ")}`);
      }
    });
  }

  return eventSpecs.join("\n");
}

// Helper function to get max tokens based on length
function getMaxTokensForLength(length: string): number {
  // Remove hard token limits - let the AI generate appropriate length based on instructions
  // Return a generous limit that won't cut off content
  return 1000;
}

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    console.log("Project Caption API started at:", new Date().toISOString());

    const {
      platform,
      context = "",
      clientInfo,
      carDetails,
      eventDetails,
      temperature,
      tone,
      style,
      length,
      template,
      aiModel,
      projectId,
      selectedCarIds,
      selectedEventIds,
      systemPromptId,
      customLLMText,
      useMinimalCarData = false,
    } = await request.json();

    console.log("Project Caption API received:", {
      platform,
      context,
      clientInfo,
      aiModel,
      projectId,
      selectedCarIds,
      selectedEventIds,
      carCount: carDetails?.count || 0,
      eventCount: eventDetails?.count || 0,
      template,
      tone,
      style,
      length,
      systemPromptId,
      hasCustomLLMText: !!customLLMText,
      useMinimalCarData,
    });

    if (!platform || !carDetails || !aiModel) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Validate model exists in our registry
    const modelInfo = findModelById(aiModel);
    if (!modelInfo) {
      return NextResponse.json(
        { error: `Model '${aiModel}' not found or not supported` },
        { status: 400 }
      );
    }

    // Format car specifications
    const specsText = formatCarSpecifications(carDetails, useMinimalCarData);

    // Format event specifications
    const eventSpecsText = formatEventSpecifications(eventDetails);

    // Fetch the selected system prompt from database with timeout
    let systemPrompt = "";
    try {
      if (systemPromptId) {
        // Create timeout promise for system prompt fetch
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("System prompt fetch timeout")),
            10000
          )
        );

        // Fetch specific system prompt by ID
        const systemPromptPromise = fetch(
          `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/system-prompts/${systemPromptId}`,
          {
            headers: {
              Cookie: request.headers.get("cookie") || "",
            },
          }
        );

        const systemPromptResponse = (await Promise.race([
          systemPromptPromise,
          timeoutPromise,
        ])) as Response;

        if (systemPromptResponse.ok) {
          const systemPromptData = await systemPromptResponse.json();
          systemPrompt = systemPromptData.prompt;
        }
      }

      // Fallback to active system prompt if no specific prompt selected or found
      if (!systemPrompt) {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Active system prompt fetch timeout")),
            10000
          )
        );

        const systemPromptPromise = fetch(
          `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/system-prompts/active?type=project_caption`
        );

        const systemPromptResponse = (await Promise.race([
          systemPromptPromise,
          timeoutPromise,
        ])) as Response;

        if (systemPromptResponse.ok) {
          const systemPromptData = await systemPromptResponse.json();
          systemPrompt = systemPromptData.prompt;
        } else {
          throw new Error("No system prompt found");
        }
      }
    } catch (error) {
      console.error("Error fetching system prompt:", error);
      return NextResponse.json(
        { error: "Failed to fetch system prompt configuration" },
        { status: 500 }
      );
    }

    // Check elapsed time before proceeding to LLM generation
    const elapsedTime = Date.now() - startTime;
    console.log(`Time elapsed before LLM generation: ${elapsedTime}ms`);

    if (elapsedTime > 45000) {
      // If we're already at 45 seconds, abort
      return NextResponse.json(
        { error: "Request timeout - too much time spent on setup" },
        { status: 408 }
      );
    }

    // Build a clean, focused user prompt with explicit length guidance
    const userPromptParts = [];

    // If custom LLM text is provided, use it directly
    if (customLLMText && customLLMText.trim()) {
      console.log("Using custom LLM text provided by user");
      const userPrompt = customLLMText.trim();

      console.log("=== PROJECT CAPTION GENERATION REQUEST (CUSTOM) ===");
      console.log("System Prompt:", systemPrompt);
      console.log("User Prompt (Custom):", userPrompt);
      console.log("Model:", aiModel);
      console.log("Temperature:", temperature);
      console.log("Length:", length);
      console.log("=== END REQUEST DETAILS ===");

      // Generate the caption with custom text and timeout
      const maxTokens = getMaxTokensForLength(length);

      // Create timeout promise for LLM generation
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("LLM generation timeout")), 50000)
      );

      const generationPromise = generateText({
        modelId: aiModel,
        prompt: userPrompt,
        systemPrompt,
        params: {
          temperature: temperature || 0.7,
          maxTokens: maxTokens,
        },
      });

      const response = (await Promise.race([
        generationPromise,
        timeoutPromise,
      ])) as any;

      console.log("AI response received:", {
        responseLength: response?.text?.length || 0,
        success: !!response,
        totalTime: Date.now() - startTime,
      });

      if (!response || !response.text) {
        throw new Error("No response from AI model");
      }

      return NextResponse.json({
        caption: response.text.trim(),
        model: aiModel,
        projectId,
        carCount: carDetails.count,
        eventCount: eventDetails?.count || 0,
        usedCustomText: true,
        processingTime: Date.now() - startTime,
      });
    }

    // Otherwise, build the standard auto-generated user prompt
    console.log("Building auto-generated user prompt");

    // Add additional context/instructions at the top if provided
    if (context) {
      userPromptParts.push("ADDITIONAL INSTRUCTIONS:", context, "");
    }

    userPromptParts.push("VEHICLE PROJECT SPECIFICATIONS:", specsText);

    // Add event specifications if available
    if (eventSpecsText) {
      userPromptParts.push("", "PROJECT EVENT SPECIFICATIONS:", eventSpecsText);
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

    // Add explicit length examples and requirements
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

    const userPrompt = userPromptParts.join("\n");

    console.log("=== PROJECT CAPTION GENERATION REQUEST ===");
    console.log("System Prompt:", systemPrompt);
    console.log("User Prompt:", userPrompt);
    console.log("Model:", aiModel);
    console.log("Temperature:", temperature);
    console.log("Length:", length);
    console.log("=== END REQUEST DETAILS ===");

    // Generate the caption with timeout
    const maxTokens = getMaxTokensForLength(length);

    // Create timeout promise for LLM generation
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("LLM generation timeout")), 50000)
    );

    const generationPromise = generateText({
      modelId: aiModel,
      prompt: userPrompt,
      systemPrompt,
      params: {
        temperature: temperature || 0.7,
        maxTokens: maxTokens,
      },
    });

    const response = (await Promise.race([
      generationPromise,
      timeoutPromise,
    ])) as any;

    console.log("AI response received:", {
      responseLength: response?.text?.length || 0,
      success: !!response,
      totalTime: Date.now() - startTime,
    });

    if (!response || !response.text) {
      throw new Error("No response from AI model");
    }

    return NextResponse.json({
      caption: response.text.trim(),
      model: aiModel,
      projectId,
      carCount: carDetails.count,
      eventCount: eventDetails?.count || 0,
      processingTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error("Error generating project caption:", error);

    // Check if this is a timeout error
    if (
      error instanceof Error &&
      (error.message.includes("timeout") || error.message.includes("Timeout"))
    ) {
      return NextResponse.json(
        {
          error: "Request timeout - the caption generation took too long",
          details: "Please try again with a simpler prompt or fewer details",
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to generate caption",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
