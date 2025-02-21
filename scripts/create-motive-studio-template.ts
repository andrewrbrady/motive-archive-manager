import { MongoClient } from "mongodb";

// MongoDB connection helper
async function connectToDatabase() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("motive-archive");
  return { client, db };
}

const template = {
  name: "Motive Studio Shoot",
  description:
    "Comprehensive studio photoshoot template covering all standard angles, details, and documentation shots for a vehicle.",
  shots: [
    // Exterior 360 - Primary Angles
    {
      title: "Front 3/4 View (Driver Side)",
      description:
        "Classic front 3/4 view from driver side, showing front and side profile",
      angle: "Eye level, slight elevation",
      lighting: "Main key light with rim light",
      notes: "Ensure wheels are turned slightly towards camera",
    },
    {
      title: "Front Direct",
      description:
        "Straight-on front view capturing full width and face of vehicle",
      angle: "Eye level",
      lighting: "Even lighting with subtle side accents",
      notes: "Wheels straight, ensure perfect symmetry",
    },
    {
      title: "Front 3/4 View (Passenger Side)",
      description: "Front 3/4 view from passenger side",
      angle: "Eye level, slight elevation",
      lighting: "Main key light with rim light",
      notes: "Mirror composition of driver side 3/4",
    },
    {
      title: "Profile (Driver Side)",
      description: "Complete side profile showing full length of vehicle",
      angle: "Eye level",
      lighting: "Even side lighting with top accent",
      notes: "Ensure wheels are perfectly aligned",
    },
    {
      title: "Profile (Passenger Side)",
      description: "Complete side profile from passenger side",
      angle: "Eye level",
      lighting: "Even side lighting with top accent",
      notes: "Match driver side profile composition",
    },
    {
      title: "Rear 3/4 View (Driver Side)",
      description: "Rear 3/4 view showing rear and side profile",
      angle: "Eye level, slight elevation",
      lighting: "Main key light with rim light",
      notes: "Capture full width and stance",
    },
    {
      title: "Rear Direct",
      description: "Straight-on rear view",
      angle: "Eye level",
      lighting: "Even lighting with subtle side accents",
      notes: "Ensure perfect symmetry",
    },
    {
      title: "Rear 3/4 View (Passenger Side)",
      description: "Rear 3/4 view from passenger side",
      angle: "Eye level, slight elevation",
      lighting: "Main key light with rim light",
      notes: "Mirror composition of driver side rear 3/4",
    },

    // Exterior - Dynamic Angles
    {
      title: "Front Low Angle",
      description: "Dramatic upward angle of front end",
      angle: "Low, looking up at front fascia",
      lighting: "Dramatic side lighting",
      notes: "Emphasize grill and front stance",
    },
    {
      title: "Rear Low Angle",
      description: "Dramatic upward angle of rear end",
      angle: "Low, looking up at rear",
      lighting: "Dramatic side lighting",
      notes: "Emphasize width and stance",
    },
    {
      title: "High 3/4 Front",
      description: "Elevated front 3/4 view",
      angle: "Above eye level, looking down",
      lighting: "Even overhead lighting",
      notes: "Capture full body lines and roof",
    },
    {
      title: "High 3/4 Rear",
      description: "Elevated rear 3/4 view",
      angle: "Above eye level, looking down",
      lighting: "Even overhead lighting",
      notes: "Show full rear deck and roof lines",
    },

    // Exterior Details
    {
      title: "Front Grille Detail",
      description: "Close-up of front grille and badge",
      angle: "Straight on or slight angle",
      lighting: "Focused detail lighting",
      notes: "Capture texture and badge detail",
    },
    {
      title: "Headlight Detail",
      description: "Close-up of headlight design",
      angle: "Slight angle to capture depth",
      lighting: "Side lighting to show texture",
      notes: "Focus on light design elements",
    },
    {
      title: "Front Wheel (Driver)",
      description: "Detail of front wheel and brake setup",
      angle: "Straight on at wheel height",
      lighting: "Side lighting for depth",
      notes: "Capture brake caliper and wheel design",
    },
    {
      title: "Rear Wheel (Driver)",
      description: "Detail of rear wheel and brake setup",
      angle: "Straight on at wheel height",
      lighting: "Side lighting for depth",
      notes: "Match front wheel composition",
    },
    {
      title: "Side Mirror Detail",
      description: "Close-up of side mirror design",
      angle: "Profile or slight angle",
      lighting: "Soft lighting to show form",
      notes: "Capture mirror housing design",
    },
    {
      title: "Door Handle Detail",
      description: "Close-up of door handle",
      angle: "Slight angle",
      lighting: "Side lighting for depth",
      notes: "Show mechanism if unique",
    },
    {
      title: "Rear Light Detail",
      description: "Close-up of taillight design",
      angle: "Slight angle to show depth",
      lighting: "Side lighting to show texture",
      notes: "Capture light pattern details",
    },
    {
      title: "Exhaust Detail",
      description: "Close-up of exhaust tips",
      angle: "Low angle or straight on",
      lighting: "Focused lighting to show finish",
      notes: "Capture all tips if multiple",
    },
    {
      title: "Badge Details",
      description: "Close-ups of all exterior badges",
      angle: "Straight on",
      lighting: "Even lighting to show text",
      notes: "Include manufacturer and model badges",
    },
    {
      title: "Fuel Door Detail",
      description: "Close-up of fuel door",
      angle: "Slight angle",
      lighting: "Side lighting for depth",
      notes: "Show opening mechanism if visible",
    },
    {
      title: "Front Splitter/Lip",
      description: "Detail of front aerodynamic elements",
      angle: "Low angle",
      lighting: "Side lighting for texture",
      notes: "Show full width and design",
    },
    {
      title: "Rear Diffuser",
      description: "Detail of rear diffuser/aero",
      angle: "Low angle",
      lighting: "Focused lighting for detail",
      notes: "Capture full width and design",
    },

    // Interior Shots
    {
      title: "Driver Seat (Door Open)",
      description: "Full view of driver's seat area with door open",
      angle: "From outside, showing full seat",
      lighting: "Even interior lighting",
      notes: "Capture dashboard and steering wheel",
    },
    {
      title: "Driver Cockpit",
      description: "Driver's perspective of dashboard and controls",
      angle: "From driver's eye position",
      lighting: "Even interior lighting",
      notes: "Show all primary controls and displays",
    },
    {
      title: "Center Console",
      description: "Detail of center console and controls",
      angle: "Overhead or slight angle",
      lighting: "Even lighting to show details",
      notes: "Include shifter and climate controls",
    },
    {
      title: "Steering Wheel",
      description: "Close-up of steering wheel design",
      angle: "Straight on or slight angle",
      lighting: "Even lighting",
      notes: "Show controls and badge",
    },
    {
      title: "Instrument Cluster",
      description: "Close-up of gauge cluster",
      angle: "Straight on from driver position",
      lighting: "Balanced to show displays",
      notes: "Capture all gauges clearly",
    },
    {
      title: "Rear Seats",
      description: "View of rear seating area",
      angle: "From door opening",
      lighting: "Even interior lighting",
      notes: "Show space and features",
    },
    {
      title: "Trunk/Cargo Area",
      description: "Full view of cargo space",
      angle: "From opening, showing full space",
      lighting: "Even lighting",
      notes: "Include any cargo features",
    },
    {
      title: "Interior Trim Details",
      description: "Close-ups of special interior trim",
      angle: "Various angles",
      lighting: "Focused lighting for texture",
      notes: "Capture unique materials and finishes",
    },

    // Documentation Shots
    {
      title: "VIN Plate",
      description: "Clear shot of VIN plate/tag",
      angle: "Straight on",
      lighting: "Even lighting for legibility",
      notes: "Ensure all numbers are readable",
    },
    {
      title: "Odometer Reading",
      description: "Clear shot of current mileage",
      angle: "Straight on at gauge cluster",
      lighting: "Clean lighting to show numbers",
      notes: "Ensure digits are clearly visible",
    },
    {
      title: "Build Plate",
      description: "Manufacturer build/info plate",
      angle: "Straight on",
      lighting: "Even lighting",
      notes: "Capture all text clearly",
    },
    {
      title: "Engine Bay",
      description: "Overall engine bay shot",
      angle: "Overhead or slight angle",
      lighting: "Even lighting throughout",
      notes: "Show full engine bay layout",
    },
    {
      title: "Engine Details",
      description: "Close-ups of engine features",
      angle: "Various angles",
      lighting: "Focused lighting for details",
      notes: "Include badges and unique components",
    },
  ],
};

async function createMotiveStudioTemplate() {
  try {
    const { db } = await connectToDatabase();

    const result = await db.collection("shotTemplates").insertOne({
      ...template,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("Successfully created Motive Studio Shoot template!");
    console.log("Template ID:", result.insertedId.toString());
  } catch (error) {
    console.error("Error creating template:", error);
  }
}

// Run the script
createMotiveStudioTemplate();
