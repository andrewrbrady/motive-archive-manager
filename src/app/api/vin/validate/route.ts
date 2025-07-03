import { OpenAI } from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { nhtsaData } = await request.json();

    const prompt = `You are a vehicle data analysis expert. Your task is to extract and normalize all vehicle specifications from the NHTSA data, including information that might be embedded in notes or unexpected fields.

SPECIFIC REQUIREMENTS:
1. Search through ALL fields, including notes and descriptions, for valuable information
2. Look for and extract numerical specifications like:
   - GVWR (Gross Vehicle Weight Rating)
   - Dimensions
   - Capacities
   - Performance figures
3. Convert any found measurements to standard units
4. Parse numerical values from text descriptions

Return ONLY a JSON object with this exact structure:
{
  "additionalFields": {
    "fieldName": {
      "value": "extracted value",
      "confidence": "confirmed|inferred|suggested",
      "source": "description of where this came from"
    }
  },
  "suggestedCategories": ["category1", "category2"],
  "marketingHighlights": ["highlight1", "highlight2"]
}

EXAMPLE EXTRACTION:
If you find "GVWR: 3,721 lbs" in any field, create an entry like:
{
  "grossVehicleWeightRating": {
    "value": "3,721 lbs",
    "confidence": "confirmed",
    "source": "Found in Note field"
  }
}

For confidence levels:
- "confirmed": directly stated in data (e.g., "GVWR: 3,721 lbs")
- "inferred": logically derived from data (e.g., calculating power-to-weight ratio)
- "suggested": based on model/year/market knowledge

NHTSA Data to analyze:
${JSON.stringify(nhtsaData, null, 2)}

Remember: Return ONLY the JSON object with no additional text.`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "o3-mini",
    });

    try {
      const content = completion.choices[0].message.content;
      if (!content) {
        return NextResponse.json(
          { error: "No content in AI response" },
          { status: 500 }
        );
      }
      const analysis = JSON.parse(content);
      return NextResponse.json(analysis);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Raw AI response:", completion.choices[0].message.content);
      return NextResponse.json(
        { error: "Failed to parse AI analysis" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error analyzing NHTSA data:", error);
    return NextResponse.json(
      { error: "Failed to analyze vehicle data" },
      { status: 500 }
    );
  }
}
