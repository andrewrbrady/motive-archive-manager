import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { instructions, emailType, carId, currentOutline, modifications } =
      await request.json();

    if (!currentOutline || !modifications) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // [REMOVED] // [REMOVED] console.log("Email Outline Modification Input:");
    // [REMOVED] // [REMOVED] console.log("Current Outline:", currentOutline);
    // [REMOVED] // [REMOVED] console.log("Email Type:", emailType || "Not specified");
    // [REMOVED] // [REMOVED] console.log("Car ID:", carId || "Not specified");
    // [REMOVED] // [REMOVED] console.log("Modification Request:", modifications);

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
          content: `You are an expert email marketing copywriter. Your task is to modify an existing email outline based on specific requests.
You should maintain the overall structure while implementing the requested changes.
Your modifications should be appropriate for the specific type of email being created.

${emailTypeGuidance}

${
  carInfo
    ? `Include information about the following vehicle in your email outline:
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

Respond only with the updated outline in the specified JSON format.`,
        },
        {
          role: "user",
          content: `Here is the original email outline:
${currentOutline
  .map((item: string, index: number) => `${index + 1}. ${item}`)
  .join("\n")}

Here are the original instructions for the email:
${instructions || "No specific instructions provided."}

Please modify this outline based on the following request: "${modifications}"

Respond with JSON in this format:
{
  "outline": ["Section 1: Purpose", "Section 2: Content", ...]
}

The outline should have 3-6 distinct sections that flow logically.${
            carInfo
              ? " Make sure to highlight key vehicle features and selling points where appropriate."
              : ""
          }`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");

    return NextResponse.json({
      outline: data.outline || [],
    });
  } catch (error) {
    console.error("Error modifying email outline:", error);
    return NextResponse.json(
      { error: "Failed to modify email outline" },
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
