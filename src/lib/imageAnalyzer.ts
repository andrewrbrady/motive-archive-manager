import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the allowed values for each field
const allowedValues = {
  angle: [
    "front",
    "front 3/4",
    "side",
    "rear 3/4",
    "rear",
    "overhead",
    "under",
  ],
  view: ["exterior", "interior"],
  movement: ["static", "motion"],
  tod: ["sunrise", "day", "sunset", "night"],
  side: ["driver", "passenger", "rear", "overhead"],
} as const;

export interface ImageAnalysis {
  angle?: string;
  view?: string;
  movement?: string;
  tod?: string;
  side?: string;
  description?: string;
}

export async function analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert car photographer analyzing images of vehicles. 
          For each image, categorize it according to these specific values:
          
          Angle: ${allowedValues.angle.join(", ")}
          View: ${allowedValues.view.join(", ")}
          Movement: ${allowedValues.movement.join(", ")}
          Time of Day: ${allowedValues.tod.join(", ")}
          Side: ${allowedValues.side.join(", ")}
          
          Also provide a brief, professional description of the image.
          
          Respond in JSON format with these fields:
          {
            "angle": "one of the allowed angles",
            "view": "one of the allowed views",
            "movement": "one of the allowed movements",
            "tod": "one of the allowed times of day",
            "side": "one of the allowed sides",
            "description": "brief professional description"
          }
          
          Only use the exact values provided in the lists above. If you can't determine a value, omit that field.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this car image:",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No analysis result received");
    }

    try {
      const analysis = JSON.parse(result) as ImageAnalysis;

      // Validate that the values match our allowed values
      if (
        analysis.angle &&
        !allowedValues.angle.includes(analysis.angle as any)
      ) {
        delete analysis.angle;
      }
      if (analysis.view && !allowedValues.view.includes(analysis.view as any)) {
        delete analysis.view;
      }
      if (
        analysis.movement &&
        !allowedValues.movement.includes(analysis.movement as any)
      ) {
        delete analysis.movement;
      }
      if (analysis.tod && !allowedValues.tod.includes(analysis.tod as any)) {
        delete analysis.tod;
      }
      if (analysis.side && !allowedValues.side.includes(analysis.side as any)) {
        delete analysis.side;
      }

      return analysis;
    } catch (error) {
      console.error("Failed to parse analysis result:", result);
      throw new Error("Failed to parse analysis result");
    }
  } catch (error) {
    console.error("Image analysis failed:", error);
    throw error;
  }
}
