import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/llmService";
import { findModelById } from "@/lib/llmProviders";

interface MessageContent {
  type: "text";
  text: string;
}

// Helper function to format car specifications
function formatCarSpecifications(carDetails: any): string {
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
      addSpec("Description", car.description);

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
      temperature,
      tone,
      style,
      length,
      template,
      aiModel,
      projectId,
      selectedCarIds,
    } = await request.json();

    console.log("Project Caption API received:", {
      platform,
      context,
      clientInfo,
      aiModel,
      projectId,
      selectedCarIds,
      carCount: carDetails?.count || 0,
      template,
      tone,
      style,
      length,
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
    const specsText = formatCarSpecifications(carDetails);

    // Fetch the active system prompt from database
    let systemPrompt = "";
    try {
      const systemPromptResponse = await fetch(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/system-prompts/active?type=project_caption`
      );
      if (systemPromptResponse.ok) {
        const systemPromptData = await systemPromptResponse.json();
        systemPrompt = systemPromptData.prompt;
      } else {
        throw new Error("No active system prompt found");
      }
    } catch (error) {
      console.error("Error fetching system prompt:", error);
      return NextResponse.json(
        { error: "Failed to fetch system prompt configuration" },
        { status: 500 }
      );
    }

    // Build a clean, focused user prompt with explicit length guidance
    const userPromptParts = [
      "VEHICLE PROJECT SPECIFICATIONS:",
      specsText,
      "",
      "CAPTION REQUIREMENTS:",
      `- Platform: ${platform}`,
      `- Tone: ${tone}`,
      `- Style: ${style}`,
      `- Length: ${length}`,
    ];

    if (template && template !== "none") {
      userPromptParts.push(`- Template: ${template}`);
    }

    // Add explicit length examples and requirements
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
      `CRITICAL LENGTH REQUIREMENT FOR ${length.toUpperCase()}:`,
      lengthExamples[length as keyof typeof lengthExamples] ||
        lengthExamples.standard,
      "",
      "YOUR CAPTION MUST MATCH THIS EXACT LENGTH REQUIREMENT. DO NOT EXCEED THE SPECIFIED LENGTH."
    );

    if (context) {
      userPromptParts.push("", "ADDITIONAL CONTEXT:", context);
    }

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
