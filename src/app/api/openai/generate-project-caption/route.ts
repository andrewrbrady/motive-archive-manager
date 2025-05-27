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

  // Individual car details
  if (carDetails.cars && carDetails.cars.length > 0) {
    projectSpecs.push("\nIndividual Vehicle Details:");

    carDetails.cars.forEach((car: any, index: number) => {
      const carSpecs: string[] = [];

      // Helper to add spec if value is valid
      const addSpec = (label: string, value: any, unit?: string) => {
        if (value !== null && value !== undefined && value !== "") {
          carSpecs.push(`${label}: ${value}${unit ? unit : ""}`);
        }
      };

      // Basic car info
      addSpec("Make", car.make);
      addSpec("Model", car.model);
      addSpec("Year", car.year);
      addSpec("Color", car.color);
      addSpec("Condition", car.condition);
      if (!useMinimalCarData) {
        addSpec("Description", car.description);
      }

      // Price
      if (car.price) {
        addSpec("List Price", car.price.listPrice);
        addSpec("Sold Price", car.price.soldPrice);
      }

      // Mileage
      if (car.mileage) {
        addSpec(
          "Mileage",
          car.mileage.value,
          car.mileage.unit ? ` ${car.mileage.unit}` : " mi"
        );
      }

      // Engine
      if (car.engine) {
        let engineSpecs = "";
        if (car.engine.type) engineSpecs += `Type: ${car.engine.type}`;
        if (car.engine.displacement) {
          engineSpecs += `${engineSpecs ? ", " : ""}Displacement: ${car.engine.displacement.value || ""}${car.engine.displacement.unit || ""}`;
        }
        if (car.engine.power) {
          engineSpecs += `${engineSpecs ? ", " : ""}Power: ${car.engine.power.hp || ""}hp`;
          if (car.engine.power.kW) engineSpecs += ` / ${car.engine.power.kW}kW`;
          if (car.engine.power.ps) engineSpecs += ` / ${car.engine.power.ps}ps`;
        }
        if (car.engine.torque) {
          engineSpecs += `${engineSpecs ? ", " : ""}Torque: ${car.engine.torque["lb-ft"] || ""}lb-ft`;
          if (car.engine.torque.Nm)
            engineSpecs += ` / ${car.engine.torque.Nm}Nm`;
        }
        if (engineSpecs) {
          carSpecs.push(`Engine: ${engineSpecs}`);
        }
      }

      // Add other simple fields
      const otherFields = [
        "transmission",
        "drivetrain",
        "bodyStyle",
        "exteriorColor",
        "interiorMaterial",
        "horsepower",
        "location",
        "type",
        "vin",
        "interior_color",
        "status",
      ];

      otherFields.forEach((field) => {
        if (
          car[field] !== null &&
          car[field] !== undefined &&
          car[field] !== ""
        ) {
          const label = field
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase());
          addSpec(label, car[field]);
        }
      });

      if (carSpecs.length > 0) {
        projectSpecs.push(`\nVehicle ${index + 1}: ${carSpecs.join(", ")}`);
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
    eventSpecs.push(`Event Types: ${eventDetails.types.join(", ")}`);
  }

  if (eventDetails.upcomingEvents && eventDetails.upcomingEvents.length > 0) {
    eventSpecs.push(`Upcoming Events: ${eventDetails.upcomingEvents.length}`);
  }

  if (eventDetails.pastEvents && eventDetails.pastEvents.length > 0) {
    eventSpecs.push(`Past Events: ${eventDetails.pastEvents.length}`);
  }

  // Individual event details
  if (eventDetails.events && eventDetails.events.length > 0) {
    eventSpecs.push("\nIndividual Event Details:");

    eventDetails.events.forEach((event: any, index: number) => {
      const specs: string[] = [];

      // Helper to add spec if value is valid
      const addSpec = (label: string, value: any) => {
        if (value !== null && value !== undefined && value !== "") {
          specs.push(`${label}: ${value}`);
        }
      };

      // Basic event info
      addSpec("Title", event.title);
      addSpec("Type", event.type);
      addSpec("Description", event.description);

      // Date information
      if (event.start) {
        const startDate = new Date(event.start);
        const isUpcoming = startDate > new Date();
        addSpec("Date", startDate.toLocaleDateString());
        addSpec("Time", startDate.toLocaleTimeString());
        addSpec("Timing", isUpcoming ? "Upcoming" : "Past");
      }

      if (event.end) {
        const endDate = new Date(event.end);
        addSpec("End Date", endDate.toLocaleDateString());
        addSpec("End Time", endDate.toLocaleTimeString());
      }

      if (event.isAllDay) {
        addSpec("Duration", "All Day");
      }

      // Team and location
      if (event.teamMemberIds && event.teamMemberIds.length > 0) {
        addSpec("Team Members", event.teamMemberIds.length);
      }

      if (event.locationId) {
        addSpec("Location", "Specified");
      }

      if (specs.length > 0) {
        eventSpecs.push(`\nEvent ${index + 1}: ${specs.join(", ")}`);
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

    // Fetch the selected system prompt from database
    let systemPrompt = "";
    try {
      if (systemPromptId) {
        // Fetch specific system prompt by ID
        const systemPromptResponse = await fetch(
          `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/system-prompts/${systemPromptId}`,
          {
            headers: {
              Cookie: request.headers.get("cookie") || "",
            },
          }
        );
        if (systemPromptResponse.ok) {
          const systemPromptData = await systemPromptResponse.json();
          systemPrompt = systemPromptData.prompt;
        }
      }

      // Fallback to active system prompt if no specific prompt selected or found
      if (!systemPrompt) {
        const systemPromptResponse = await fetch(
          `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/system-prompts/active?type=project_caption`
        );
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

      // Generate the caption with custom text
      const maxTokens = getMaxTokensForLength(length);
      const response = await generateText({
        modelId: aiModel,
        prompt: userPrompt,
        systemPrompt,
        params: {
          temperature: temperature || 0.7,
          maxTokens: maxTokens,
        },
      });

      console.log("AI response received:", {
        responseLength: response?.text?.length || 0,
        success: !!response,
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
    // Fetch custom length guidelines from database
    let lengthGuidelines: { [key: string]: string } = {
      concise: "Keep the caption very brief, 1-2 lines maximum.",
      standard: "Write a standard length caption of 2-3 lines.",
      detailed:
        "Create a detailed caption of 3-4 lines, including more specifications.",
      comprehensive:
        "Write a comprehensive caption of 4+ lines with extensive details.",
    };

    try {
      const lengthSettingsResponse = await fetch(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/length-settings`,
        {
          headers: {
            Cookie: request.headers.get("cookie") || "",
          },
        }
      );
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
        "EXAMPLE CONCISE CAPTION (1-2 lines max):\n'Three generations of Porsche 911 excellence. From air-cooled classics to modern turbocharged precision.'",
      standard:
        "EXAMPLE STANDARD CAPTION (2-3 lines):\n'This curated collection showcases the evolution of German engineering excellence. From the raw, air-cooled 1973 911 Carrera to the refined 2023 992 Turbo S, each vehicle represents a pivotal moment in automotive history.'",
      detailed:
        "EXAMPLE DETAILED CAPTION (3-4 lines):\n'This exceptional collection traces the bloodline of Porsche's most iconic model across five decades. The air-cooled 1973 911 Carrera delivers pure, unfiltered driving dynamics with its 2.7L flat-six. The water-cooled 1999 996 Turbo introduced forced induction to the 911 lineage. The modern 992 Turbo S represents the pinnacle of contemporary performance engineering.'",
      comprehensive:
        "EXAMPLE COMPREHENSIVE CAPTION (4+ lines):\n'This meticulously curated collection represents the complete evolution of Porsche's legendary 911 platform spanning five transformative decades. The 1973 911 Carrera showcases the purity of air-cooled engineering with its naturally aspirated 2.7-liter flat-six producing 175 horsepower. The 1999 996 Turbo marked a revolutionary transition to water-cooled architecture, delivering 415 horsepower through twin turbochargers. The contemporary 992 Turbo S epitomizes modern performance with 640 horsepower, advanced PDK transmission, and sophisticated all-wheel-drive systems.'",
    };

    userPromptParts.push(
      "",
      `LENGTH INSTRUCTIONS FOR ${length.toUpperCase()}:`,
      lengthGuidelines[length] || lengthGuidelines.standard,
      "",
      `EXAMPLE ${length.toUpperCase()} CAPTION:`,
      lengthExamples[length as keyof typeof lengthExamples] ||
        lengthExamples.standard,
      "",
      "YOUR CAPTION MUST FOLLOW THE LENGTH INSTRUCTIONS ABOVE."
    );

    if (clientInfo?.handle) {
      userPromptParts.push("", `CLIENT HANDLE: ${clientInfo.handle}`);
      if (clientInfo.includeInCaption) {
        userPromptParts.push("(Include this handle naturally in the caption)");
      }
    }

    userPromptParts.push(
      "",
      `Generate a ${length} caption now that follows the exact length shown in the example above:`
    );

    const userPrompt = userPromptParts.join("\n");

    console.log("=== PROJECT CAPTION GENERATION REQUEST ===");
    console.log("System Prompt:", systemPrompt);
    console.log("User Prompt:", userPrompt);
    console.log("Model:", aiModel);
    console.log("Temperature:", temperature);
    console.log("Length:", length);
    console.log("=== END REQUEST DETAILS ===");

    // Generate the caption
    const maxTokens = getMaxTokensForLength(length);
    const response = await generateText({
      modelId: aiModel,
      prompt: userPrompt,
      systemPrompt,
      params: {
        temperature: temperature || 0.7,
        maxTokens: maxTokens,
      },
    });

    console.log("AI response received:", {
      responseLength: response?.text?.length || 0,
      success: !!response,
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
    });
  } catch (error) {
    console.error("Error generating project caption:", error);
    return NextResponse.json(
      {
        error: "Failed to generate caption",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
