import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt, emailType, carId } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing required prompt parameter" },
        { status: 400 }
      );
    }

    // [REMOVED] // [REMOVED] console.log("Email Instructions Generation Input:", prompt);
    // [REMOVED] // [REMOVED] console.log("Email Type:", emailType || "Not specified");
    // [REMOVED] // [REMOVED] console.log("Car ID:", carId || "Not specified");

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert email marketing copywriter. Your task is to analyze a given campaign brief and provide:
1. Clear instructions for creating an engaging email campaign
2. A structured outline for the email's sections
3. A compelling subject line
Your response should be tailored to the specific type of email being created.

${emailTypeGuidance}

${
  carInfo
    ? `Include information about the following vehicle in your response:
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
}
`,
        },
        {
          role: "user",
          content: `Generate email marketing instructions, outline, and subject line for the following brief: "${prompt}".
          
Please respond with JSON in this format:
{
  "instructions": "Detailed instructions for writing the email...",
  "outline": ["Section 1: Purpose", "Section 2: Content", ...],
  "subject": "Compelling subject line"
}

The instructions should be comprehensive and guide the email writing process. The outline should provide a clear structure with 3-6 distinct sections. The subject line should be attention-grabbing and relevant.${
            carInfo
              ? " Make sure to highlight the vehicle's key features and benefits."
              : ""
          }`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");

    return NextResponse.json({
      instructions: data.instructions || "",
      outline: data.outline || [],
      subject: data.subject || "",
    });
  } catch (error) {
    console.error("Error generating email instructions:", error);
    return NextResponse.json(
      { error: "Failed to generate email instructions" },
      { status: 500 }
    );
  }
}

function getEmailTypeGuidance(emailType: string): string {
  switch (emailType) {
    case "newsletter":
      return `For newsletters:
- Prioritize valuable, informative content over sales pitches
- Include a mix of educational content, updates, and light promotional material
- Structure with clear sections for different topics
- Aim for a conversational, friendly tone`;

    case "promotion":
      return `For promotional emails:
- Focus on compelling value propositions and clear CTAs
- Emphasize benefits over features
- Create a sense of urgency or exclusivity when appropriate
- Keep content concise and focused on the offer`;

    case "announcement":
      return `For announcement emails:
- Lead with the news or announcement clearly and directly
- Provide context and why this matters to the recipient
- Include necessary details but avoid overwhelming with information
- Consider what follow-up actions recipients should take`;

    case "follow-up":
      return `For follow-up emails:
- Reference previous interactions to establish context
- Be direct about the purpose of the follow-up
- Provide clear next steps or actions
- Maintain a helpful, non-pushy tone`;

    default:
      return "Tailor your guidance to the specific email campaign requirements.";
  }
}
