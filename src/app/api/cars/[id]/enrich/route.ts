import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { Car } from "@/types/car";

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

async function cleanAndStructureData(searchResults: any, existingCarData: Car) {
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

async function generateNewSearchTerms(initialData: any, existingCarData: Car) {
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
  allSearchResults: any[],
  initialData: any,
  existingCarData: Car
) {
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
          content:
            "Cross-reference and validate all collected vehicle information. Only include fields where multiple sources agree or confidence is high. DO NOT include price or location. Return a final JSON object with validated data that matches the following structure: { model, year, mileage, color, engine: { type, displacement, power, torque }, horsepower, condition, description, interior_color, vin, dimensions: { length, width, height, wheelbase }, fuel_capacity, interior_features: { seats, upholstery }, performance: { 0_to_60_mph, top_speed }, transmission: { type }, weight: { curb_weight } }",
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
  const validatedData = JSON.parse(content.match(/\{[\s\S]*\}/)[0]);
  console.log("✅ Data validation complete:", validatedData);
  return validatedData;
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
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    const db = client.db(process.env.MONGODB_DB || "motive_archive");
    const carDoc = await db.collection("cars").findOne({
      _id: new ObjectId(id),
    });

    if (!carDoc) {
      console.error("❌ Car not found in database");
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
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
    const validatedData = await validateAndCrossReference(
      additionalSearchResults,
      initialCleanedData,
      car
    );

    // Step 6: Update the database with validated data
    console.log("\n📍 Step 6: Updating Database");
    const updateResult = await db.collection("cars").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...validatedData,
          // Preserve existing fields if they exist and are not empty
          make: car.make,
          model: car.model,
          year: car.year || validatedData.year,
          mileage: car.mileage || validatedData.mileage,
          color: car.color || validatedData.color,
          type: car.type || validatedData.type,
          vin: car.vin || validatedData.vin,
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
    });
  } catch (error) {
    console.error("❌ Error during enrichment process:", error);
    return NextResponse.json(
      { error: "Failed to enrich car data" },
      { status: 500 }
    );
  } finally {
    await client.close();
    console.log("👋 MongoDB connection closed");
  }
}
