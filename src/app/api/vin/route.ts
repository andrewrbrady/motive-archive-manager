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
        // Filter out any AI analysis fields that we already have structured data for
        aiAnalysis = Object.fromEntries(
          Object.entries(aiResult.additionalFields || {}).filter(([key]) => {
            // Remove fields we already have structured data for
            return (
              !key.toLowerCase().includes("gvwr") &&
              !key.toLowerCase().includes("weight") &&
              !key.toLowerCase().includes("engine") &&
              !key.toLowerCase().includes("doors") &&
              !key.toLowerCase().includes("displacement") &&
              !key.toLowerCase().includes("horsepower") &&
              !key.toLowerCase().includes("tire")
            );
          })
        );

        // Check if AI found GVWR in the data
        const gvwrField = Object.entries(aiResult.additionalFields || {}).find(
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
