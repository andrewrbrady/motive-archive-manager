import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const {
      instructions,
      emailType,
      subject,
      carId,
      currentOutline,
      currentStep,
      currentContent,
    } = await request.json();

    if (currentOutline === undefined || currentStep === undefined) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    if (currentStep >= currentOutline.length) {
      return NextResponse.json(
        { error: "Current step exceeds outline length" },
        { status: 400 }
      );
    }

    const currentSection = currentOutline[currentStep];

    console.log("Email Content Generation Input:");
    console.log("Generating content for section:", currentSection);
    console.log("Email Type:", emailType || "Not specified");
    console.log("Car ID:", carId || "Not specified");
    console.log("Current step:", currentStep, "of", currentOutline.length);

    // Get car information if carId is provided
    let carInfo = null;
    if (carId) {
      try {
        const client = await clientPromise;
        if (!client) {
          console.error("Failed to connect to MongoDB");
          // Continue without car info
        } else {
          const db = client.db();
          const carsCollection = db.collection("cars");

          const car = await carsCollection.findOne({
            _id: new ObjectId(carId),
          });

          if (car) {
            // Extract important car details
            carInfo = {
              year: car.year,
              make: car.make,
              model: car.model,
              color: car.color,
              price: car.price?.listPrice || null,
              mileage: car.mileage?.value
                ? `${car.mileage.value} ${car.mileage.unit || "miles"}`
                : null,
              description: car.description,
              engine: car.engine?.type,
              transmission: car.transmission?.type,
              status: car.status,
              vin: car.vin,
              features: car.features || [],
            };
          }
        }
      } catch (error) {
        console.error("Error fetching car details:", error);
        // Continue without car info if there's an error
      }
    }

    const emailTypeGuidance = getEmailTypeGuidance(emailType);

    // Format the outline for better context
    const formattedOutline = currentOutline
      .map((item: string, index: number) => {
        if (index < currentStep) {
          return `${index + 1}. [COMPLETED] ${item}`;
        } else if (index === currentStep) {
          return `${index + 1}. [CURRENT SECTION] ${item}`;
        } else {
          return `${index + 1}. [UPCOMING] ${item}`;
        }
      })
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert email marketing copywriter. Your task is to generate a SINGLE PARAGRAPH of content for an email.

CRITICAL INSTRUCTIONS:
- Generate ONLY ONE PARAGRAPH (approximately 3-5 sentences)
- Respond with JUST THE CONTENT - no explanations, headers, or additional text
- Use proper HTML formatting with <p> tags for the paragraph
- Focus only on the specific aspect described in the current section
- The content must be concise, specific, and to the point
- Do not introduce new sections or transition to other topics

Content format requirements:
- Start with <p> and end with </p>
- Use appropriate formatting like <strong> or <em> for emphasis if needed
- Do not include section headings or titles
- Make sure all HTML tags are properly closed

${emailTypeGuidance}

${
  carInfo
    ? `Include relevant information about the following vehicle in your paragraph:
Year: ${carInfo.year}
Make: ${carInfo.make}
Model: ${carInfo.model}
${carInfo.color ? `Color: ${carInfo.color}` : ""}
${carInfo.price ? `Price: $${carInfo.price.toLocaleString()}` : ""}
${carInfo.mileage ? `Mileage: ${carInfo.mileage}` : ""}
${carInfo.engine ? `Engine: ${carInfo.engine}` : ""}
${carInfo.transmission ? `Transmission: ${carInfo.transmission}` : ""}
${carInfo.description ? `Description: ${carInfo.description}` : ""}
${carInfo.vin ? `VIN: ${carInfo.vin}` : ""}
${
  carInfo.features && carInfo.features.length > 0
    ? `Features: ${carInfo.features.join(", ")}`
    : ""
}
`
    : ""
}`,
        },
        {
          role: "user",
          content: `I'm creating an email with the following structure:
${formattedOutline}

Subject line: ${subject || "Not specified"}

${
  currentContent
    ? `Current email draft:
------------------
${currentContent}
------------------`
    : "The email hasn't been started yet."
}

I need you to generate ONLY ONE PARAGRAPH for the following section: "${currentSection}"

${
  currentStep === 0
    ? `This is the introduction of the email. The paragraph should set the tone and introduce the main topic.
Instructions for this email:
${instructions || "No specific instructions provided."}`
    : `This paragraph should focus specifically on "${currentSection}" and connect naturally with the existing content.`
}

${
  carInfo && currentStep === 0
    ? `This email features a ${carInfo.year} ${carInfo.make} ${carInfo.model}. Be sure to briefly mention it in this paragraph if appropriate.`
    : ""
}

REQUIREMENTS:
1. Write EXACTLY ONE PARAGRAPH wrapped in <p> tags
2. Keep it brief (3-5 sentences)
3. Focus only on the current section topic
4. Make it flow naturally with any existing content
5. Do not include any additional text, explanations, or notes
6. Do not use phrases like "In this section" or "To conclude this section"`,
        },
      ],
      temperature: 0.4, // Lower temperature for more controlled outputs
      max_tokens: 250, // Limit the output length to keep it brief
    });

    const content = response.choices[0].message.content || "";

    return NextResponse.json({
      content: content,
    });
  } catch (error) {
    console.error("Error generating email content:", error);
    return NextResponse.json(
      { error: "Failed to generate email content" },
      { status: 500 }
    );
  }
}

function getEmailTypeGuidance(emailType: string): string {
  switch (emailType) {
    case "newsletter":
      return `For newsletters:
- Write in a conversational, informative tone
- Balance educational content with promotional elements
- Keep the paragraph focused on a single main point
- Use clear, direct language`;

    case "promotion":
      return `For promotional emails:
- Focus on one specific benefit that matters to the recipient
- Use compelling, action-oriented language
- Create a sense of urgency or exclusivity if appropriate
- Keep the message focused and direct`;

    case "announcement":
      return `For announcement emails:
- Present information clearly and directly
- Focus on the single most important aspect of the announcement
- Emphasize why this matters to the recipient
- Keep the message concise and impactful`;

    case "follow-up":
      return `For follow-up emails:
- Reference previous interactions naturally
- Focus on one specific next step or action
- Be direct about the purpose
- Keep the tone helpful and concise`;

    default:
      return "Write a single, focused paragraph with clear, concise language appropriate for email communication.";
  }
}
