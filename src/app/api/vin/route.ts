import { NextResponse } from "next/server";

interface VINResponse {
  make: string;
  model: string;
  year: number;
  engineType?: string;
  engineDisplacement?: number;
  engineConfiguration?: string;
  engineCylinders?: number;
  error?: string;
  series?: string;
  trim?: string;
  bodyClass?: string;
  horsepower?: number;
  colorCode?: string;
  // Additional fields
  doors?: number;
  plant?: {
    city?: string;
    country?: string;
    company?: string;
  };
  safety?: {
    tpms?: {
      type: string;
      present: boolean;
    };
  };
  dimensions?: {
    gvwr?: {
      value: number;
      unit: string;
    };
  };
  aiAnalysis?: {
    [key: string]: {
      value: string;
      confidence: "confirmed" | "inferred" | "suggested";
      source: string;
    };
  };
}

interface AIAnalysisField {
  value: string;
  confidence: "confirmed" | "inferred" | "suggested";
  source: string;
}

// Color code positions by manufacturer
const manufacturerColorPositions: { [key: string]: number[] } = {
  // Position indices are 0-based
  MERCEDES: [4, 5], // Mercedes uses positions 5-6
  BMW: [4], // BMW typically uses position 5
  PORSCHE: [7], // Porsche uses position 8 for exterior color
  AUDI: [4], // Audi typically uses position 5
  VOLKSWAGEN: [4], // VW typically uses position 5
  FERRARI: [4, 5], // Ferrari uses positions 5-6
  LAMBORGHINI: [4, 5], // Lamborghini uses positions 5-6
  MASERATI: [4, 5], // Maserati uses positions 5-6
  "ROLLS-ROYCE": [4, 5], // Rolls-Royce uses positions 5-6
  BENTLEY: [4, 5], // Bentley uses positions 5-6
  "ASTON MARTIN": [4, 5], // Aston Martin uses positions 5-6
  MCLAREN: [4, 5], // McLaren uses positions 5-6
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vin = searchParams.get("vin");

  console.log("Received VIN request for:", vin);

  if (!vin) {
    return NextResponse.json(
      { error: "VIN parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Call NHTSA API
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`
    );
    const data = await response.json();

    console.log("Raw NHTSA API response:", JSON.stringify(data, null, 2));

    if (!data.Results) {
      return NextResponse.json(
        { error: "Failed to decode VIN" },
        { status: 400 }
      );
    }

    // Extract relevant information from NHTSA response
    const results = data.Results.reduce((acc: any, item: any) => {
      if (item.Value && item.Value !== "Not Applicable") {
        acc[item.Variable] = item.Value;
        console.log(`Found value for ${item.Variable}:`, item.Value);
      }
      return acc;
    }, {});

    console.log("Processed NHTSA results:", results);

    // Extract color code from VIN if manufacturer is supported
    let colorCode: string | undefined;
    const make = results["Make"];
    if (make) {
      console.log(`Looking up color position for manufacturer: ${make}`);
      const positions = manufacturerColorPositions[make.toUpperCase()];
      if (positions) {
        // Extract color code from the specified positions
        colorCode = positions.map((pos) => vin[pos]).join("");
        console.log(
          `Found manufacturer ${make} - Extracting color code from positions: ${positions}`
        );
        console.log(`VIN: ${vin}`);
        console.log(`Extracted color code: ${colorCode}`);
      } else {
        console.log(
          `No color position mapping found for manufacturer: ${make}`
        );
      }
    }

    // Get AI analysis of the data
    let aiAnalysis;
    try {
      const aiResponse = await fetch(
        new URL("/api/vin/validate", request.url).toString(),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ nhtsaData: data }), // Send the complete NHTSA response
        }
      );

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json();
        aiAnalysis = aiResult.additionalFields as Record<
          string,
          AIAnalysisField
        >;

        // Check if AI found GVWR in the data
        const gvwrField = Object.entries(aiAnalysis || {}).find(
          ([key, info]: [string, AIAnalysisField]) =>
            key.toLowerCase().includes("gvwr") ||
            key.toLowerCase().includes("weight") ||
            info.value.toLowerCase().includes("gvwr")
        );

        if (gvwrField) {
          const [_, info] = gvwrField as [string, AIAnalysisField];
          // Extract numeric value and unit from the GVWR string
          const match = info.value.match(/(\d+(?:,\d+)?)\s*(lbs?|pounds?|kg)/i);
          if (match) {
            const value = parseInt(match[1].replace(",", ""));
            const unit = match[2].toLowerCase().startsWith("lb") ? "lbs" : "kg";
            results.GVWR = { value, unit };
          }
        }
      }
    } catch (error) {
      console.error("Error getting AI analysis:", error);
      // Continue without AI analysis
    }

    // Prepare basic VIN info
    const vinInfo: VINResponse = {
      make: results["Make"] || "",
      model: results["Model"] || "",
      year: parseInt(results["Model Year"]) || 0,
      engineType: results["Fuel Type - Primary"],
      engineDisplacement: parseFloat(results["Displacement (L)"]) || undefined,
      engineConfiguration: results["Engine Configuration"],
      engineCylinders:
        parseInt(results["Engine Number of Cylinders"]) || undefined,
      series: results["Series"],
      trim: results["Trim"],
      bodyClass: results["Body Class"],
      horsepower: parseInt(results["Engine Brake (hp) From"]) || undefined,
      colorCode,
      doors: parseInt(results["Doors"]) || undefined,
      plant: {
        city: results["Plant City"],
        country: results["Plant Country"],
        company: results["Plant Company Name"],
      },
      safety: {
        tpms: results["Tire Pressure Monitoring System (TPMS) Type"]
          ? {
              type: results["Tire Pressure Monitoring System (TPMS) Type"],
              present: true,
            }
          : undefined,
      },
      dimensions: {
        gvwr: results.GVWR,
      },
      aiAnalysis,
    };

    console.log("Final VIN response:", vinInfo);

    return NextResponse.json(vinInfo);
  } catch (error) {
    console.error("Error decoding VIN:", error);
    return NextResponse.json(
      { error: "Failed to decode VIN" },
      { status: 500 }
    );
  }
}
