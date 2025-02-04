import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { Car } from "@/types/car";

interface SerperResult {
  organic: Array<{
    title: string;
    link: string;
    snippet: string;
    position: number;
  }>;
  searchParameters: {
    q: string;
    num: number;
  };
}

interface EnrichedCarData {
  model?: string;
  year?: number;
  mileage?: { value: number | null; unit: string };
  color?: string;
  type?: string;
  engine?: {
    type: string;
    displacement?: { value: number | null; unit: string };
    power?: { hp: number; kW: number; ps: number };
    torque?: { "lb-ft": number; Nm: number };
  };
  horsepower?: number;
  condition?: string;
  description?: string;
  interior_color?: string;
  vin?: string;
  dimensions?: {
    length: { value: number | null; unit: string };
    width: { value: number | null; unit: string };
    height: { value: number | null; unit: string };
    wheelbase: { value: number | null; unit: string };
  };
  fuel_capacity?: { value: number | null; unit: string };
  interior_features?: {
    seats: number;
    upholstery?: string;
  };
  performance?: {
    "0_to_60_mph": { value: number | null; unit: string };
    top_speed: { value: number | null; unit: string };
  };
  transmission?: { type: string };
  weight?: {
    curb_weight: { value: number | null; unit: string };
  };
}

// Helper function to get MongoDB client
async function getMongoClient() {
  console.log("🔄 Connecting to MongoDB...");
  const client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://localhost:27017"
  );
  await client.connect();
  console.log("✅ MongoDB connected");
  return client;
}

async function searchVehicleInfo(query: string) {
  console.log(`\n🔍 Searching Serper for: "${query}"`);
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY || "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      num: 10,
    }),
  });

  if (!response.ok) {
    console.error("❌ Serper API error:", response.statusText);
    throw new Error(`Serper API error: ${response.statusText}`);
  }

  const results = await response.json();
  console.log(`✅ Found ${results.organic?.length || 0} organic results`);
  return results;
}

async function cleanAndStructureData(
  searchResults: SerperResult[],
  existingCarData: Car
): Promise<EnrichedCarData> {
  console.log("\n🧹 Cleaning and structuring search data...");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Cross-reference and validate vehicle information from search results. Only include fields where confidence is high. DO NOT include price or location.

IMPORTANT: The following fields from the existing car data MUST NOT be modified or overridden. Use these values exactly as provided:
- Year
- Make
- Model
- Color
- Mileage
- VIN
- Client
- Location

Return a final JSON object with validated data that matches the following structure:
{
  model: string,
  year: number,
  mileage: { value: number, unit: "mi" | "km" },
  color: string,
  engine: {
    type: string,
    displacement: { value: number, unit: "L" | "cc" },
    power: { hp: number, kW: number, ps: number },
    torque: { "lb-ft": number, Nm: number }
  },
  horsepower: number,
  condition: string,
  description: string,
  interior_color: string,
  vin: string,
  dimensions: {
    length: { value: number, unit: "inches" | "mm" },
    width: { value: number, unit: "inches" | "mm" },
    height: { value: number, unit: "inches" | "mm" },
    wheelbase: { value: number, unit: "inches" | "mm" }
  },
  fuel_capacity: { value: number, unit: "gallons" | "L" },
  interior_features: {
    seats: number,
    upholstery: string
  },
  performance: {
    "0_to_60_mph": { value: number, unit: "seconds" },
    top_speed: { value: number, unit: "mph" | "km/h" }
  },
  transmission: { type: string },
  weight: {
    curb_weight: { value: number, unit: "lbs" | "kg" }
  }
}`,
        },
        {
          role: "user",
          content: `Extract and validate information for ${
            existingCarData.year
          } ${existingCarData.make} ${
            existingCarData.model
          }. Search results: ${JSON.stringify(searchResults)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    console.error("❌ OpenAI API error:", response.statusText);
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const cleanedData = JSON.parse(data.choices[0].message.content);
  console.log("✅ Data cleaned and structured:", cleanedData);
  return cleanedData;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log("\n🚀 Starting car data enrichment process...");
  const client = await getMongoClient();

  try {
    const db = client.db(process.env.MONGODB_DB || "motive_archive");
    const collection = db.collection("cars");
    const carId = new ObjectId(params.id);

    // Get existing car data
    const existingCarData = await collection.findOne<Car>({ _id: carId });
    if (!existingCarData) {
      throw new Error("Car not found");
    }

    // Perform initial search
    const baseQuery = `${existingCarData.year} ${existingCarData.make} ${existingCarData.model} specs technical details`;
    const additionalQueries = [
      `${existingCarData.year} ${existingCarData.make} ${existingCarData.model} engine specifications`,
      `${existingCarData.year} ${existingCarData.make} ${existingCarData.model} dimensions weight`,
    ];

    // Perform searches concurrently
    const searchPromises = [baseQuery, ...additionalQueries].map((query) =>
      searchVehicleInfo(query)
    );
    const searchResults = await Promise.all(searchPromises);

    // Clean and structure the data
    const enrichedData = await cleanAndStructureData(
      searchResults,
      existingCarData
    );

    // Preserve protected fields
    const updatedCarData = {
      ...enrichedData,
      _id: existingCarData._id,
      year: existingCarData.year,
      make: existingCarData.make,
      model: existingCarData.model,
      color: existingCarData.color,
      mileage: existingCarData.mileage,
      vin: existingCarData.vin,
      client: existingCarData.client,
      location: existingCarData.location,
    };

    // Update the car in the database
    await collection.updateOne({ _id: carId }, { $set: updatedCarData });

    return NextResponse.json({
      success: true,
      message: "Car data enriched successfully",
      data: updatedCarData,
      progress: {
        step: 6,
        currentStep: "Complete",
        status: "complete",
        details: {
          searchTermsGenerated: additionalQueries.length + 1,
          additionalSearchesCompleted: additionalQueries.length,
          fieldsUpdated: Object.keys(enrichedData).length,
          protectedFieldsPreserved: [
            "year",
            "make",
            "model",
            "color",
            "mileage",
            "vin",
            "client",
            "location",
          ],
        },
      },
    });
  } catch (error) {
    console.error("❌ Error enriching car data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to enrich car data",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        progress: {
          step: 0,
          currentStep: "",
          status: "error",
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}
