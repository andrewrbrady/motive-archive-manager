import { NextRequest, NextResponse } from "next/server";
import { CAPTION_GUIDELINES } from "@/constants/caption-examples";
import { generateText } from "@/lib/llmService";
import { findModelById } from "@/lib/llmProviders";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface MessageContent {
  type: "text";
  text: string;
}

export async function POST(request: NextRequest) {
  try {
    const {
      platform,
      context = "", // Provide default empty string if missing
      clientInfo,
      carDetails,
      temperature,
      tone,
      style,
      length,
      template,
      aiModel,
      systemPromptId,
    } = await request.json();

    // Log received data for debugging
    console.log("Caption API received:", {
      platform,
      context,
      clientInfo,
      aiModel,
      carDetails: carDetails
        ? {
            year: carDetails.year,
            make: carDetails.make,
            model: carDetails.model,
          }
        : null,
      template,
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

    // Format car specifications for generation only
    const specsArray: string[] = [];

    // Helper to add spec if value is valid
    const addSpec = (label: string, value: any, unit?: string) => {
      if (value !== null && value !== undefined && value !== "") {
        specsArray.push(`${label}: ${value}${unit ? unit : ""}`);
      }
    };

    // Top-level simple fields
    addSpec("Make", carDetails.make);
    addSpec("Model", carDetails.model);
    addSpec("Year", carDetails.year);
    addSpec("Color", carDetails.color);
    addSpec("Horsepower", carDetails.horsepower);
    addSpec("Condition", carDetails.condition);
    addSpec("Location", carDetails.location);
    addSpec("Description", carDetails.description);
    addSpec("Type", carDetails.type);
    addSpec("VIN", carDetails.vin);
    addSpec("Interior Color", carDetails.interior_color);
    addSpec("Status", carDetails.status);

    // Price
    if (carDetails.price) {
      addSpec("List Price", carDetails.price.listPrice);
      addSpec("Sold Price", carDetails.price.soldPrice);
    }

    // Mileage
    if (carDetails.mileage) {
      addSpec(
        "Mileage",
        carDetails.mileage.value,
        carDetails.mileage.unit ? ` ${carDetails.mileage.unit}` : " mi"
      );
    }

    // Engine
    if (carDetails.engine) {
      let engineSpecs = "";
      if (carDetails.engine.type)
        engineSpecs += `Type: ${carDetails.engine.type}`;
      if (carDetails.engine.displacement) {
        engineSpecs += `${engineSpecs ? ", " : ""}Displacement: ${carDetails.engine.displacement.value || ""}${carDetails.engine.displacement.unit || ""}`;
      }
      if (carDetails.engine.power) {
        engineSpecs += `${engineSpecs ? ", " : ""}Power: ${carDetails.engine.power.hp || ""}hp`;
        if (carDetails.engine.power.kW)
          engineSpecs += ` / ${carDetails.engine.power.kW}kW`;
        if (carDetails.engine.power.ps)
          engineSpecs += ` / ${carDetails.engine.power.ps}ps`;
      }
      if (carDetails.engine.torque) {
        engineSpecs += `${engineSpecs ? ", " : ""}Torque: ${carDetails.engine.torque["lb-ft"] || ""}lb-ft`;
        if (carDetails.engine.torque.Nm)
          engineSpecs += ` / ${carDetails.engine.torque.Nm}Nm`;
      }
      if (engineSpecs) {
        specsArray.push(`Engine: ${engineSpecs}`);
      }
    }

    // Dimensions
    if (carDetails.dimensions) {
      let dimensionSpecs = "";
      if (carDetails.dimensions.weight) {
        dimensionSpecs += `Weight: ${carDetails.dimensions.weight.value || ""}${carDetails.dimensions.weight.unit || ""}`;
      }
      if (carDetails.dimensions.gvwr) {
        dimensionSpecs += `${dimensionSpecs ? ", " : ""}GVWR: ${carDetails.dimensions.gvwr.value || ""}${carDetails.dimensions.gvwr.unit || ""}`;
      }
      if (carDetails.dimensions.wheelbase) {
        dimensionSpecs += `${dimensionSpecs ? ", " : ""}Wheelbase: ${carDetails.dimensions.wheelbase.value || ""}${carDetails.dimensions.wheelbase.unit || ""}`;
      }
      if (carDetails.dimensions.trackWidth) {
        dimensionSpecs += `${dimensionSpecs ? ", " : ""}Track Width: ${carDetails.dimensions.trackWidth.value || ""}${carDetails.dimensions.trackWidth.unit || ""}`;
      }
      if (dimensionSpecs) {
        specsArray.push(`Dimensions: ${dimensionSpecs}`);
      }
    }

    // Manufacturing
    if (carDetails.manufacturing) {
      let manufacturingSpecs = "";
      if (carDetails.manufacturing.series)
        manufacturingSpecs += `Series: ${carDetails.manufacturing.series}`;
      if (carDetails.manufacturing.trim)
        manufacturingSpecs += `${manufacturingSpecs ? ", " : ""}Trim: ${carDetails.manufacturing.trim}`;
      if (carDetails.manufacturing.bodyClass)
        manufacturingSpecs += `${manufacturingSpecs ? ", " : ""}Body Class: ${carDetails.manufacturing.bodyClass}`;
      if (carDetails.manufacturing.plant) {
        let plantInfo = "";
        if (carDetails.manufacturing.plant.city)
          plantInfo += carDetails.manufacturing.plant.city;
        if (carDetails.manufacturing.plant.country)
          plantInfo += `${plantInfo ? ", " : ""}${carDetails.manufacturing.plant.country}`;
        if (carDetails.manufacturing.plant.company)
          plantInfo += `${plantInfo ? " (" : ""}${carDetails.manufacturing.plant.company}${plantInfo ? ")" : ""}`;
        if (plantInfo)
          manufacturingSpecs += `${manufacturingSpecs ? ", " : ""}Plant: ${plantInfo}`;
      }
      if (manufacturingSpecs) {
        specsArray.push(`Manufacturing: ${manufacturingSpecs}`);
      }
    }

    // Adding other potential fields from your previous attempt if they exist in carDetails and are simple
    // This is a safeguard for any fields I might have missed from your example but were in the prior logic
    const otherSimpleFields = [
      "transmission",
      "drivetrain",
      "bodyStyle",
      "exteriorColor",
      "interiorMaterial",
    ];
    otherSimpleFields.forEach((field) => {
      if (
        carDetails[field] !== null &&
        carDetails[field] !== undefined &&
        carDetails[field] !== ""
      ) {
        // Convert camelCase to Title Case for label
        const label = field
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase());
        addSpec(label, carDetails[field]);
      }
    });

    // Complex objects that might contain arbitrary key-value pairs (less structured than engine/dimensions)
    // For these, we'll iterate keys if the object exists
    const otherComplexObjects: { [key: string]: string } = {
      Features: "features", // Assuming 'features' in carDetails is an object or array
      Options: "options",
      History: "history",
      Provenance: "provenance",
      Modifications: "modifications",
      Flaws: "flaws",
      "Known Issues": "known_issues", // maps to carDetails.known_issues
      "Service History": "service_history",
      "Ownership History": "ownership_history",
      Performance: "performance",
      "Auction Details": "auction_details", // maps to carDetails.auction_details
    };

    for (const [label, carDetailKey] of Object.entries(otherComplexObjects)) {
      const objValue = carDetails[carDetailKey];
      if (
        objValue &&
        typeof objValue === "object" &&
        Object.keys(objValue).length > 0
      ) {
        const nestedSpecs: string[] = [];
        if (Array.isArray(objValue)) {
          // If it's an array of strings/numbers
          if (objValue.length > 0) {
            nestedSpecs.push(
              objValue
                .filter(
                  (item) => item !== null && item !== undefined && item !== ""
                )
                .join(", ")
            );
          }
        } else {
          // If it's an object
          for (const [key, value] of Object.entries(objValue)) {
            if (value !== null && value !== undefined && value !== "") {
              if (typeof value === "object" && !Array.isArray(value)) {
                const subNested = Object.entries(value)
                  .filter(
                    ([_, sv]) => sv !== null && sv !== undefined && sv !== ""
                  )
                  .map(([sk, sv]) => `${sk}: ${sv}`)
                  .join(", ");
                if (subNested) nestedSpecs.push(`${key}: (${subNested})`);
              } else if (Array.isArray(value) && value.length > 0) {
                nestedSpecs.push(`${key}: ${value.join(", ")}`);
              } else {
                nestedSpecs.push(`${key}: ${value}`);
              }
            }
          }
        }
        if (
          nestedSpecs.length > 0 &&
          nestedSpecs.some((s) => s.trim() !== "")
        ) {
          specsArray.push(`${label}:\\n  ${nestedSpecs.join("\\n  ")}`);
        }
      } else if (typeof objValue === "string" && objValue !== "") {
        // Handle if it's a direct string
        addSpec(label, objValue);
      }
    }

    const specs = specsArray.join("\\n");

    // Get platform-specific guidelines
    const guidelines =
      CAPTION_GUIDELINES[platform as keyof typeof CAPTION_GUIDELINES];

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

    // Define tone guidelines
    const toneGuidelines = {
      professional: "Maintain a formal, business-like tone",
      casual: "Use a relaxed, conversational tone",
      enthusiastic: "Express excitement and passion about the vehicle",
      technical: "Focus on technical specifications and engineering details",
    };

    // Define style guidelines
    const styleGuidelines = {
      descriptive:
        "Paint a vivid picture of the vehicle's appearance and features",
      minimal: "Focus on essential information with minimal elaboration",
      storytelling: "Weave the car's features into a compelling narrative",
    };

    // Add client handle instruction if provided
    let clientHandleInstruction = "";
    if (clientInfo && clientInfo.includeInCaption && clientInfo.handle) {
      clientHandleInstruction = `
- Be sure to mention the client/dealer handle in the caption: ${clientInfo.handle}`;
      // [REMOVED] // [REMOVED] console.log("Adding client handle instruction:", clientHandleInstruction);
    }

    // Add description to the prompt instructions
    const promptInstructions = `
- Start with the title line in the specified format
- Create a caption that stands out and differs from previous ones
- Incorporate key details from the car's description when available
- Avoid generic or overused phrases
- Do not use subjective terms like "beautiful", "stunning", "gorgeous"
- Focus on factual information and specifications
- Maintain the specified tone and style
- Do not mention price unless specifically provided
- Do not make assumptions about the car's history or modifications
${template === "dealer" ? "- Do not include the dealer reference - it will be added separately" : ""}
- Use proper formatting based on the platform
- Make the title descriptive and impactful, focusing on a key feature or characteristic${clientHandleInstruction}
- Each caption must say "Motive Archive is The Collector's Resource. We provide discerning enthusiasts with comprehensive representation and a curated experience." Place this between the caption and the hashtags.
- End with relevant hashtags on a new line
- Each hashtag cloud must include the #make and #model of the car 
- Do not get too creative or clever with the hashtags
- Each caption needs to include the hashtags #motivearchive and #thecollectorsresrouce at the very end, without exception`;

    // Build system prompt that works across providers
    // Fetch the selected system prompt from database
    let systemPrompt = "";
    console.log(
      "🔍 Starting system prompt fetch. systemPromptId:",
      systemPromptId
    );

    try {
      if (systemPromptId) {
        // Fetch specific system prompt by ID directly from database
        console.log(
          "🔍 Fetching specific system prompt by ID:",
          systemPromptId
        );
        try {
          const { db } = await connectToDatabase();
          console.log("🔍 Database connected successfully");

          const systemPromptData = await db
            .collection("systemPrompts")
            .findOne({ _id: new ObjectId(systemPromptId) });

          console.log("🔍 System prompt data fetched:", {
            found: !!systemPromptData,
            hasPromptField: systemPromptData
              ? "prompt" in systemPromptData
              : false,
            promptLength: systemPromptData?.prompt?.length || 0,
            allFields: systemPromptData ? Object.keys(systemPromptData) : [],
          });

          if (systemPromptData) {
            systemPrompt = systemPromptData.prompt;
            console.log(
              "🔍 System prompt extracted, length:",
              systemPrompt?.length || 0
            );
          }
        } catch (error) {
          console.error("Error fetching specific system prompt:", error);
        }
      }

      // Fallback to active system prompt if no specific prompt selected or found
      if (!systemPrompt) {
        console.log(
          "🔍 No specific prompt found, fetching active system prompt"
        );
        try {
          const { db } = await connectToDatabase();
          const systemPromptData = await db
            .collection("systemPrompts")
            .findOne({ isActive: true });

          console.log("🔍 Active system prompt data fetched:", {
            found: !!systemPromptData,
            hasPromptField: systemPromptData
              ? "prompt" in systemPromptData
              : false,
            promptLength: systemPromptData?.prompt?.length || 0,
            allFields: systemPromptData ? Object.keys(systemPromptData) : [],
          });

          if (systemPromptData) {
            systemPrompt = systemPromptData.prompt;
            console.log(
              "🔍 Active system prompt extracted, length:",
              systemPrompt?.length || 0
            );
          } else {
            throw new Error("No active system prompt found");
          }
        } catch (error) {
          console.error("Error fetching active system prompt:", error);
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

    console.log(
      "🔍 Final system prompt before appending guidelines, length:",
      systemPrompt?.length || 0
    );

    // Append platform-specific guidelines and formatting to the system prompt
    systemPrompt += `

Platform-specific guidelines:
${guidelines.map((g) => `- ${g}`).join("\n")}

Length Guideline: ${
      lengthGuidelines[length as keyof typeof lengthGuidelines] ||
      lengthGuidelines.standard
    }
Tone Guideline: ${
      toneGuidelines[tone as keyof typeof toneGuidelines] ||
      toneGuidelines.professional
    }
Style Guideline: ${
      styleGuidelines[style as keyof typeof styleGuidelines] ||
      styleGuidelines.descriptive
    }

${context ? `USER'S SPECIFIC INSTRUCTIONS: ${context}` : ""}

The first line of every caption must follow this format:
[YEAR] [MAKE] [MODEL] ⚡️ | [DESCRIPTIVE TITLE IN ALL CAPS]
Example: 1967 Ferrari 275 GTB/4 ⚡️ | PININFARINA PERFECTION

${
  clientInfo && clientInfo.includeInCaption && clientInfo.handle
    ? `IMPORTANT: You MUST include the client/dealer handle ${clientInfo.handle} in the caption.`
    : ""
}

Important: End the caption with relevant hashtags on a new line.`;

    // User prompt construction
    const userPromptParts = [];

    // Add additional context/instructions at the top if provided
    if (context) {
      userPromptParts.push("ADDITIONAL INSTRUCTIONS:");
      userPromptParts.push(context);
      userPromptParts.push("");
    }

    userPromptParts.push(
      `Create a caption for this car${
        template === "dealer" ? " that will lead into a dealer reference" : ""
      }:`
    );
    userPromptParts.push("");
    userPromptParts.push("Car Specifications:");
    userPromptParts.push(specs);
    userPromptParts.push("");
    userPromptParts.push("Follow these rules:");
    userPromptParts.push(promptInstructions);

    let userPrompt = userPromptParts.join("\n");

    // Add client handle instruction to the user prompt as well for emphasis
    if (clientInfo && clientInfo.includeInCaption && clientInfo.handle) {
      userPrompt += `\n\nIMPORTANT: You MUST include the client/dealer handle ${clientInfo.handle} in the caption.`;
    }

    // If this is a question template, adapt the prompt accordingly
    if (template === "question") {
      const questionPromptParts = [];

      // Add additional context/instructions at the top if provided
      if (context) {
        questionPromptParts.push("ADDITIONAL INSTRUCTIONS:");
        questionPromptParts.push(context);
        questionPromptParts.push("");
      }

      questionPromptParts.push(
        `Create a caption for this car that will lead into this specific question: ${context}`
      );
      questionPromptParts.push("");
      questionPromptParts.push("Car Specifications:");
      questionPromptParts.push(specs);
      questionPromptParts.push("");
      questionPromptParts.push("Follow these rules:");
      questionPromptParts.push(promptInstructions);

      userPrompt = questionPromptParts.join("\n");
    }

    // Log the final prompt
    console.log("=== CAR CAPTION GENERATION REQUEST ===");
    console.log("System Prompt:", systemPrompt);
    console.log("User Prompt:", userPrompt);
    console.log("Model:", aiModel);
    console.log("Temperature:", temperature);
    console.log("Platform:", platform);
    console.log("Template:", template);
    console.log("=== END REQUEST DETAILS ===");

    console.log("FINAL PROMPT BEING SENT:", {
      userPrompt: userPrompt.substring(0, 300) + "...",
      systemPrompt: systemPrompt.substring(0, 300) + "...",
      context,
    });

    // Generate the caption using our provider-agnostic service
    const generationResponse = await generateText({
      modelId: aiModel,
      prompt: userPrompt,
      systemPrompt,
      params: {
        temperature: temperature || modelInfo.model.defaultTemperature,
        maxTokens: template === "question" ? 500 : 1000,
      },
    });

    // Process the output in a standardized way regardless of provider
    const captionText = generationResponse.text.trim();
    const hashtagIndex = captionText.lastIndexOf("\n#");

    // Split content and hashtags
    const mainContent =
      hashtagIndex !== -1
        ? captionText.slice(0, hashtagIndex).trim()
        : captionText;
    const hashtags =
      hashtagIndex !== -1 ? captionText.slice(hashtagIndex).trim() : "";

    // Regular caption with possible client handle - REMOVE forcing the handle
    let finalContent = mainContent;

    // No longer force-adding client handle - it should be included by the LLM in an appropriate way
    // based on its instructions, not artificially injected

    // Add hashtags
    let lowerHashtags = hashtags
      ? hashtags
          .split(/\n/)
          .map((line) => (line.startsWith("#") ? line.toLowerCase() : line))
          .join("\n")
      : "";

    const finalCaption = `${finalContent}${lowerHashtags ? `\n\n${lowerHashtags}` : ""}`;
    return NextResponse.json({ caption: finalCaption });
  } catch (error) {
    console.error("Error generating caption:", error);
    return NextResponse.json(
      { error: "Failed to generate caption" },
      { status: 500 }
    );
  }
}
