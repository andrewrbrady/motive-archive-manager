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
}

// Helper function to safely parse numeric values
function safeParseFloat(value: string | undefined): number | undefined {
  if (!value || value === "Not Applicable") return undefined;
  const parsed = parseFloat(value.replace(/,/g, ""));
  return isNaN(parsed) ? undefined : parsed;
}

// Helper function to safely parse integer values
function safeParseInt(value: string | undefined): number | undefined {
  if (!value || value === "Not Applicable") return undefined;
  const parsed = parseInt(value.replace(/,/g, ""));
  return isNaN(parsed) ? undefined : parsed;
}

// Helper function to extract GVWR from various NHTSA fields
function extractGVWR(
  results: Record<string, string>
): { value: number; unit: string } | undefined {
  // Check for direct GVWR fields
  const gvwrFields = [
    "Gross Vehicle Weight Rating From",
    "GVWR",
    "Gross Vehicle Weight Rating",
    "GVWR From",
    "GVWR To",
  ];

  for (const field of gvwrFields) {
    const value = results[field];
    if (value && value !== "Not Applicable") {
      const numericValue = safeParseFloat(value);
      if (numericValue) {
        // NHTSA typically provides GVWR in pounds
        return { value: numericValue, unit: "lbs" };
      }
    }
  }

  return undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vin = searchParams.get("vin");

  if (!vin) {
    return NextResponse.json(
      { error: "VIN parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Call NHTSA API - our most reliable data source
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`
    );
    const data = await response.json();

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
      }
      return acc;
    }, {});

    // Prepare optimized VIN info using only NHTSA data
    const vinInfo: VINResponse = {
      make: results["Make"] || "",
      model: results["Model"] || "",
      year: safeParseInt(results["Model Year"]) || 0,
      engineType: results["Fuel Type - Primary"],
      engineDisplacement: safeParseFloat(results["Displacement (L)"]),
      engineConfiguration: results["Engine Configuration"],
      engineCylinders: safeParseInt(results["Engine Number of Cylinders"]),
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
      horsepower: safeParseInt(results["Engine Brake (hp) From"]),
      doors: safeParseInt(results["Doors"]),
      plant: {
        city: results["Plant City"],
        country: results["Plant Country"],
        company: results["Plant Company Name"],
      },
      transmission: {
        style: results["Transmission Style"],
        speeds: safeParseInt(results["Transmission Speeds"]),
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
        gvwr: extractGVWR(results),
        wheelBase: results["Wheel Base (inches) From"]
          ? {
              from: safeParseFloat(results["Wheel Base (inches) From"]),
              to: safeParseFloat(results["Wheel Base (inches) To"]),
              unit: "inches",
            }
          : undefined,
        trackWidth: safeParseFloat(results["Track Width (inches)"]),
        bedLength: safeParseFloat(results["Bed Length (inches)"]),
        curbWeight: safeParseFloat(results["Curb Weight (pounds)"]),
      },
      performance: {
        topSpeed: safeParseFloat(results["Top Speed (MPH)"]),
        enginePower: results["Engine Power (kW)"]
          ? {
              value: safeParseFloat(results["Engine Power (kW)"]) || 0,
              unit: "kW",
            }
          : undefined,
      },
    };

    return NextResponse.json(vinInfo);
  } catch (error) {
    console.error("Error decoding VIN:", error);
    return NextResponse.json(
      { error: "Failed to decode VIN" },
      { status: 500 }
    );
  }
}
