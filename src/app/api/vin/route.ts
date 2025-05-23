import { NextResponse } from "next/server";

interface VINResponse {
  make: string;
  model: string;
  year: number;
  engineType?: string;
  engineDisplacement?: number;
  engineConfiguration?: string;
  engineCylinders?: number;
  error?: {
    code: string;
    text: string;
    additionalInfo?: string;
  };
  validationStatus?: {
    isPartial: boolean;
    suggestedVIN?: string;
    possibleValues?: string[];
  };
  series?: string;
  trim?: string;
  bodyClass?: string;
  horsepower?: number;
  doors?: number;
  plant?: {
    city?: string;
    country?: string;
    company?: string;
  };
  transmission?: {
    style?: string;
    speeds?: number;
  };
  driveType?: string;
  braking?: {
    abs?: boolean;
    systemType?: string;
    description?: string;
  };
  airbags?: {
    front?: boolean;
    side?: boolean;
    knee?: boolean;
    curtain?: boolean;
    locations?: string[];
  };
  safetyFeatures?: {
    pretensioner?: boolean;
    stabilityControl?: boolean;
    tractionControl?: boolean;
    parkingAssist?: boolean;
    backupCamera?: boolean;
    blindSpotWarning?: boolean;
    laneDepartureWarning?: boolean;
    forwardCollisionWarning?: boolean;
    adaptiveCruiseControl?: boolean;
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
    wheelBase?: {
      from?: number;
      to?: number;
      unit: string;
    };
    trackWidth?: number;
    bedLength?: number;
    curbWeight?: number;
  };
  performance?: {
    topSpeed?: number;
    enginePower?: {
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

  // [REMOVED] // [REMOVED] console.log("Received VIN request for:", vin);

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

    // [REMOVED] // [REMOVED] console.log("Raw NHTSA API response:", JSON.stringify(data, null, 2));

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
        // [REMOVED] // [REMOVED] console.log(`Found value for ${item.Variable}:`, item.Value);
      }
      return acc;
    }, {});

    // [REMOVED] // [REMOVED] console.log("Processed NHTSA results:", results);

    // Get AI analysis of the data
    let aiAnalysis;
    let additionalFields: Record<string, AIAnalysisField> = {};
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

        if (aiResult?.additionalFields) {
          additionalFields = aiResult.additionalFields as Record<
            string,
            AIAnalysisField
          >;
          // Check if AI found GVWR in the data
          const gvwrField = Object.entries(additionalFields).find(
            ([key, info]) =>
              key.toLowerCase().includes("gvwr") ||
              key.toLowerCase().includes("weight") ||
              info.value.toLowerCase().includes("gvwr")
          ) as [string, AIAnalysisField] | undefined;

          if (gvwrField) {
            const [_, info] = gvwrField;
            // Extract numeric value and unit from the GVWR string
            const match = info.value.match(
              /(\d+(?:,\d+)?)\s*(lbs?|pounds?|kg)/i
            );
            if (match) {
              const value = parseInt(match[1].replace(",", ""));
              const unit = match[2].toLowerCase().startsWith("lb")
                ? "lbs"
                : "kg";
              results.GVWR = { value, unit };
            }
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
      error: data.Results.some(
        (r: { Variable: string; Value: string }) =>
          r.Variable === "Error Code" && r.Value
      )
        ? {
            code: results["Error Code"],
            text: results["Error Text"],
            additionalInfo: results["Additional Error Text"],
          }
        : undefined,
      validationStatus: {
        isPartial: data.Results.some(
          (r: { Variable: string; Value: string }) =>
            r.Variable === "Error Code" && r.Value === "6"
        ),
        suggestedVIN: results["Suggested VIN"],
        possibleValues: results["Possible Values"]
          ? results["Possible Values"].split(",")
          : undefined,
      },
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
      transmission: {
        style: results["Transmission Style"],
        speeds: parseInt(results["Transmission Speeds"]) || undefined,
      },
      driveType: results["Drive Type"],
      braking: {
        abs: results["Anti-lock Braking System (ABS)"] === "Yes",
        systemType: results["Brake System Type"],
        description: results["Brake System Description"],
      },
      airbags: {
        front: results["Front Air Bag Locations"] ? true : undefined,
        side: results["Side Air Bag Locations"] ? true : undefined,
        knee: results["Knee Air Bag Locations"] ? true : undefined,
        curtain: results["Curtain Air Bag Locations"] ? true : undefined,
        locations: [
          results["Front Air Bag Locations"],
          results["Side Air Bag Locations"],
          results["Knee Air Bag Locations"],
          results["Curtain Air Bag Locations"],
        ].filter(Boolean),
      },
      safetyFeatures: {
        pretensioner: results["Pretensioner"] === "Yes",
        stabilityControl:
          results["Electronic Stability Control (ESC)"] === "Yes",
        tractionControl: results["Traction Control"] === "Yes",
        parkingAssist: results["Parking Assist"] === "Yes",
        backupCamera: results["Backup Camera"] === "Yes",
        blindSpotWarning: results["Blind Spot Warning (BSW)"] === "Yes",
        laneDepartureWarning: results["Lane Departure Warning (LDW)"] === "Yes",
        forwardCollisionWarning:
          results["Forward Collision Warning (FCW)"] === "Yes",
        adaptiveCruiseControl:
          results["Adaptive Cruise Control (ACC)"] === "Yes",
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
        wheelBase: results["Wheel Base (inches) From"]
          ? {
              from: parseFloat(results["Wheel Base (inches) From"]),
              to: parseFloat(results["Wheel Base (inches) To"]) || undefined,
              unit: "inches",
            }
          : undefined,
        trackWidth: parseFloat(results["Track Width (inches)"]) || undefined,
        bedLength: parseFloat(results["Bed Length (inches)"]) || undefined,
        curbWeight: parseFloat(results["Curb Weight (pounds)"]) || undefined,
      },
      performance: {
        topSpeed: parseFloat(results["Top Speed (MPH)"]) || undefined,
        enginePower: results["Engine Power (kW)"]
          ? {
              value: parseFloat(results["Engine Power (kW)"]),
              unit: "kW",
            }
          : undefined,
      },
      aiAnalysis: additionalFields,
    };

    // [REMOVED] // [REMOVED] console.log("Final VIN response:", vinInfo);

    return NextResponse.json(vinInfo);
  } catch (error) {
    console.error("Error decoding VIN:", error);
    return NextResponse.json(
      { error: "Failed to decode VIN" },
      { status: 500 }
    );
  }
}
