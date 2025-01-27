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
      num: 15,
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
  searchResults: SerperResult,
  existingCarData: Car
): Promise<EnrichedCarData> {
  console.log("\n🧹 Cleaning and structuring initial search data...");
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
          content:
            "You are a vehicle data specialist. Extract and clean vehicle information from search results. Focus on technical specifications, engine details, and factual information. DO NOT include price or location. Return a JSON object with cleaned data and confidence scores (0-1) for each field.",
        },
        {
          role: "user",
          content: `Extract information for ${existingCarData.year} ${
            existingCarData.make
          } ${existingCarData.model}${
            existingCarData.type ? ` ${existingCarData.type}` : ""
          }. Search results: ${JSON.stringify(searchResults)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    console.error("❌ OpenAI API error:", response.statusText);
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const cleanedData = JSON.parse(content.match(/\{[\s\S]*\}/)[0]);
  console.log("✅ Initial data cleaned and structured:", cleanedData);
  return cleanedData;
}

async function generateNewSearchTerms(
  initialData: EnrichedCarData,
  existingCarData: Car
): Promise<string[]> {
  console.log(
    "\n🎯 Generating targeted search terms based on initial findings..."
  );
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
          content:
            "Based on the initial vehicle data, generate specific search queries to verify and expand the information. Focus on technical details that need verification or areas where information is missing. Return an array of search queries.",
        },
        {
          role: "user",
          content: `Generate specific search queries for ${
            existingCarData.year
          } ${existingCarData.make} ${
            existingCarData.model
          }. Initial data: ${JSON.stringify(initialData)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    console.error("❌ OpenAI API error:", response.statusText);
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const searchTerms = JSON.parse(content.match(/\[[\s\S]*\]/)[0]);
  console.log("✅ Generated search terms:", searchTerms);
  return searchTerms;
}

async function validateAndCrossReference(
  allSearchResults: SerperResult[],
  initialData: EnrichedCarData,
  existingCarData: Car
): Promise<EnrichedCarData> {
  console.log("\n🔄 Cross-referencing and validating all collected data...");
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
          content: `Cross-reference and validate all collected vehicle information. Only include fields where multiple sources agree or confidence is high. DO NOT include price or location.

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
          content: `Validate information for ${existingCarData.year} ${
            existingCarData.make
          } ${existingCarData.model}. Initial data: ${JSON.stringify(
            initialData
          )}. Additional search results: ${JSON.stringify(allSearchResults)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    console.error("❌ OpenAI API error:", response.statusText);
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const enrichedData = JSON.parse(content.match(/\{[\s\S]*\}/)[0]);

  // Ensure protected fields are preserved
  const protectedFields = {
    year: existingCarData.year,
    make: existingCarData.make,
    model: existingCarData.model,
    color: existingCarData.color,
    mileage: existingCarData.mileage,
    vin: existingCarData.vin,
    location: existingCarData.location,
    client: existingCarData.client,
  };

  // Override any changes to protected fields
  const finalData = {
    ...enrichedData,
    ...protectedFields,
  };

  console.log("✅ Data validated and cross-referenced:", finalData);
  return finalData;
}

// Helper function to convert units if needed
function convertUnits(data: EnrichedCarData): EnrichedCarData {
  if (!data) return data;

  // Deep clone the data
  const converted = JSON.parse(JSON.stringify(data));

  // Convert power if only one unit is provided
  if (converted.engine?.power) {
    const power = converted.engine.power;
    if (power.hp && !power.kW) power.kW = Math.round(power.hp * 0.7457);
    if (power.hp && !power.ps) power.ps = Math.round(power.hp * 1.014);
    if (power.kW && !power.hp) power.hp = Math.round(power.kW / 0.7457);
    if (power.kW && !power.ps) power.ps = Math.round(power.kW * 1.359);
    if (power.ps && !power.hp) power.hp = Math.round(power.ps / 1.014);
    if (power.ps && !power.kW) power.kW = Math.round(power.ps * 0.7355);
  }

  // Convert torque if only one unit is provided
  if (converted.engine?.torque) {
    const torque = converted.engine.torque;
    if (torque["lb-ft"] && !torque.Nm)
      torque.Nm = Math.round(torque["lb-ft"] * 1.356);
    if (torque.Nm && !torque["lb-ft"])
      torque["lb-ft"] = Math.round(torque.Nm / 1.356);
  }

  return converted;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log("\n🚀 Starting vehicle data enrichment process...");
  const client = await getMongoClient();
  try {
    const { id } = await Promise.resolve(params);
    console.log(`📋 Processing vehicle ID: ${id}`);

    if (!ObjectId.isValid(id)) {
      console.error("❌ Invalid car ID format");
      return NextResponse.json(
        {
          error: "Invalid car ID format",
          progress: {
            step: 0,
            currentStep: "",
            status: "error",
            error: "Invalid car ID format",
          },
        },
        { status: 400 }
      );
    }

    const db = client.db(process.env.MONGODB_DB || "motive_archive");
    const carDoc = await db.collection("cars").findOne({
      _id: new ObjectId(id),
    });

    if (!carDoc) {
      console.error("❌ Car not found in database");
      return NextResponse.json(
        {
          error: "Car not found",
          progress: {
            step: 0,
            currentStep: "",
            status: "error",
            error: "Car not found",
          },
        },
        { status: 404 }
      );
    }

    // Cast MongoDB document to Car type
    const car = carDoc as unknown as Car;
    console.log(`📌 Found vehicle: ${car.year} ${car.make} ${car.model}`);

    // Step 1: Initial search
    console.log("\n📍 Step 1: Initial Search");
    let searchQuery = `${car.year} ${car.make} ${car.model} specifications`;
    if (car.type) searchQuery += ` ${car.type}`;
    if (car.vin) searchQuery += ` VIN: ${car.vin}`;
    const initialSearchResults = await searchVehicleInfo(searchQuery);

    // Step 2: Clean and structure initial data
    console.log("\n📍 Step 2: Initial Data Cleaning");
    const initialCleanedData = await cleanAndStructureData(
      initialSearchResults,
      car
    );

    // Step 3: Generate new search terms based on findings
    console.log("\n📍 Step 3: Generating New Search Terms");
    const newSearchTerms = await generateNewSearchTerms(
      initialCleanedData,
      car
    );

    // Step 4: Perform additional searches
    console.log("\n📍 Step 4: Performing Additional Searches");
    console.log(`🔄 Running ${newSearchTerms.length} additional searches...`);
    const additionalSearchResults = await Promise.all(
      newSearchTerms.map((term: string) =>
        searchVehicleInfo(`${car.year} ${car.make} ${car.model} ${term}`)
      )
    );
    console.log(`✅ Completed ${newSearchTerms.length} additional searches`);

    // Step 5: Validate and cross-reference all data
    console.log("\n📍 Step 5: Final Validation");
    let validatedData = await validateAndCrossReference(
      additionalSearchResults,
      initialCleanedData,
      car
    );

    // Convert units and ensure all measurement pairs are present
    validatedData = convertUnits(validatedData);

    // Step 6: Update the database with validated data
    console.log("\n📍 Step 6: Updating Database");
    const updateResult = await db.collection("cars").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          // Only update fields from validatedData if they don't exist in car
          ...(car.color ? {} : { color: validatedData.color }),
          ...(car.mileage ? {} : { mileage: validatedData.mileage }),
          ...(car.interior_color
            ? {}
            : { interior_color: validatedData.interior_color }),
          // Always preserve these fields
          make: car.make,
          model: car.model,
          year: car.year || validatedData.year,
          type: car.type || validatedData.type,
          vin: car.vin || validatedData.vin,
          client: car.client,
          clientInfo: car.clientInfo,
          // Update other enriched data
          engine: validatedData.engine,
          dimensions: validatedData.dimensions,
          fuel_capacity: validatedData.fuel_capacity,
          interior_features: validatedData.interior_features,
          performance: validatedData.performance,
          transmission: validatedData.transmission,
          weight: validatedData.weight,
        },
      }
    );

    if (!updateResult.modifiedCount) {
      console.error("❌ Failed to update car with enriched data");
      throw new Error("Failed to update car with enriched data");
    }
    console.log("✅ Database updated successfully");

    // Fetch the updated car data
    const updatedCar = await db.collection("cars").findOne({
      _id: new ObjectId(id),
    });

    console.log("\n🎉 Enrichment process complete!");
    return NextResponse.json({
      success: true,
      originalData: car,
      enrichedData: validatedData,
      updatedCar,
      progress: {
        step: 6,
        currentStep: "Complete",
        status: "complete",
        details: {
          searchTermsGenerated: newSearchTerms.length,
          additionalSearchesCompleted: additionalSearchResults.length,
          fieldsUpdated: Object.keys(validatedData).length,
          protectedFieldsPreserved: [
            "make",
            "model",
            "year",
            "color",
            "mileage",
            "vin",
            "client",
            "clientInfo",
          ],
        },
      },
    });
  } catch (error) {
    console.error("❌ Error during enrichment process:", error);
    return NextResponse.json(
      {
        error: "Failed to enrich car data",
        progress: {
          step: 0,
          currentStep: "",
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Failed to enrich car data",
        },
      },
      { status: 500 }
    );
  } finally {
    await client.close();
    console.log("👋 MongoDB connection closed");
  }
}
