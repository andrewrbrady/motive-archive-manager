import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

if (!OPENAI_API_KEY) {
  throw new Error("Please add your OpenAI API key to .env.local");
}

interface Make {
  _id: ObjectId;
  name: string;
  country_of_origin: string;
  founded: number;
  type: string[];
  parent_company: string;
  created_at: Date;
  updated_at: Date;
  active: boolean;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function validateMakes() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const makesCollection = db.collection<Make>("makes");
    const carsCollection = db.collection("cars");

    console.log("\nChecking for data inconsistencies in makes collection...");

    // Check for required fields and type mismatches
    const invalidMakes = await makesCollection
      .find({
        $or: [
          // Required string fields
          { name: { $not: { $type: "string" } } },
          { country_of_origin: { $not: { $type: "string" } } },

          // Optional fields with type checks
          { founded: { $exists: true, $not: { $type: "double" } } },
          { type: { $exists: true, $not: { $type: "array" } } },
          { parent_company: { $exists: true, $not: { $type: "string" } } },

          // Required fields existence
          { name: { $exists: false } },
          { country_of_origin: { $exists: false } },
          { active: { $exists: false } },

          // Date fields
          { created_at: { $not: { $type: "date" } } },
          { updated_at: { $not: { $type: "date" } } },
        ],
      })
      .toArray();

    console.log("\nInvalid makes found:", invalidMakes.length);
    if (invalidMakes.length > 0) {
      console.log("Sample of invalid makes:");
      invalidMakes.slice(0, 3).forEach((make) => {
        console.log(`\nID: ${make._id}`);
        console.log("Name:", make.name);
        console.log("Country:", make.country_of_origin);
        console.log("Founded:", make.founded);
        console.log("Type:", make.type);
      });
    }

    // Find makes that appear in cars but not in makes collection
    const distinctCarMakes = await carsCollection.distinct("make");
    const existingMakes = await makesCollection
      .find({ active: true })
      .toArray();
    const existingMakeNames = new Set(
      existingMakes.map((m) => m.name.toLowerCase().trim())
    );

    // Clean up make names and remove duplicates
    const cleanedCarMakes = [
      ...new Set(
        distinctCarMakes
          .filter(Boolean)
          .map((make) => make.trim())
          .map((make) => {
            // Handle special cases
            if (make.toUpperCase() === "PORSCHE" || make === "Porsche ")
              return "Porsche";
            if (make === "McLaren/Mercedes") return "McLaren";
            if (make === "Mouse") return null; // Skip invalid make
            return make;
          })
          .filter(Boolean)
      ),
    ];

    const missingMakes = cleanedCarMakes.filter(
      (make) => !existingMakeNames.has(make.toLowerCase())
    );

    console.log("\nMissing makes found:", missingMakes.length);
    if (missingMakes.length > 0) {
      console.log("Missing makes:", missingMakes);

      // Enrich and add missing makes
      for (const makeName of missingMakes) {
        console.log(`\nEnriching data for ${makeName}...`);

        const makeData = await enrichMakeData(makeName);
        if (makeData) {
          const newMake: Make = {
            _id: new ObjectId(),
            ...makeData,
            active: true,
            created_at: new Date(),
            updated_at: new Date(),
          } as Make;

          await makesCollection.insertOne(newMake);
          console.log(`Added new make: ${makeName}`);
        }
      }
    }

    // Validate existing makes data
    console.log("\nValidating existing makes data...");
    const makesNeedingEnrichment = existingMakes.filter(
      (make) =>
        !make.country_of_origin ||
        !make.founded ||
        !make.type ||
        !make.parent_company
    );

    if (makesNeedingEnrichment.length > 0) {
      console.log(
        `Found ${makesNeedingEnrichment.length} makes needing enrichment`
      );

      for (const make of makesNeedingEnrichment) {
        console.log(`\nEnriching data for ${make.name}...`);

        const enrichedData = await enrichMakeData(make.name);
        if (enrichedData) {
          await makesCollection.updateOne(
            { _id: make._id },
            {
              $set: {
                ...enrichedData,
                updated_at: new Date(),
              },
            }
          );
          console.log(`Updated make: ${make.name}`);
        }
      }
    }

    console.log("\nValidation and enrichment complete!");
  } catch (error) {
    console.error("Error validating makes:", error);
  } finally {
    await client.close();
  }
}

async function enrichMakeData(makeName: string): Promise<Partial<Make> | null> {
  try {
    // Use GPT-4 to enrich make data
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a knowledgeable automotive database expert. Your task is to provide accurate information about car manufacturers in a specific JSON format. Only respond with valid JSON.",
          },
          {
            role: "user",
            content: `Return information about ${makeName} in this exact JSON format (no explanation, just JSON):
{
  "name": "${makeName}",
  "country_of_origin": "country name",
  "founded": 1234,
  "type": ["one or more of: Luxury, Sports, Economy, SUV, Truck, Motorcycle, Commercial, Electric, Hybrid"],
  "parent_company": "parent company name or null"
}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.statusText}. ${errorText}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    const makeData = JSON.parse(data.choices[0].message.content);

    // Validate the response
    if (
      !makeData.name ||
      !makeData.country_of_origin ||
      !makeData.founded ||
      !Array.isArray(makeData.type)
    ) {
      throw new Error("Invalid response format from OpenAI");
    }

    return makeData;
  } catch (error) {
    console.error(`Error enriching data for ${makeName}:`, error);
    return null;
  }
}

validateMakes().catch(console.error);
