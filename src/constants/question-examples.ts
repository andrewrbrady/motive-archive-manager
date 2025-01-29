// Helper function to get a casual name for the car
function getCasualName(carDetails: {
  year: number;
  make: string;
  model: string;
}): string {
  // Common shorthand mappings
  const shorthandMakes: { [key: string]: string } = {
    Porsche: "", // Porsche people just say the model
    Ferrari: "", // Ferrari people just say the model
    BMW: "", // BMW people just say the model
    "Mercedes-Benz": "", // People just say the model
    Lamborghini: "", // People just say the model
    McLaren: "", // People just say the model
    Audi: "", // Audi people just say the model
    Chevrolet: "Chevy", // Nobody says Chevrolet
    Nissan: "", // GTR people just say GTR
  };

  // Special model cases (add more as needed)
  const specialModels: { [key: string]: string } = {
    // Porsche
    "911": "911",
    "911 GT3": "GT3",
    "911 GT3 RS": "GT3 RS",
    "911 Turbo S": "Turbo S",
    "Carrera GT": "CGT",
    "918 Spyder": "918",
    // Ferrari
    F40: "F40",
    F50: "F50",
    "250 GTO": "250",
    LaFerrari: "LaF",
    "488 Pista": "Pista",
    // BMW
    M3: "M3",
    M4: "M4",
    M5: "M5",
    "M5 CS": "M5 CS",
    "E30 M3": "E30",
    "E46 M3": "E46",
    // Mercedes
    "SLS AMG": "SLS",
    "AMG GT": "AMG GT",
    "G63 AMG": "G63",
    // Lamborghini
    "Aventador SVJ": "SVJ",
    "Huracan STO": "STO",
    // McLaren
    P1: "P1",
    Senna: "Senna",
    "765LT": "765",
    // Audi
    R8: "R8",
    RS6: "RS6",
    RS7: "RS7",
    // Nissan
    "GT-R": "GTR",
    "GT-R NISMO": "NISMO",
    // Chevy
    "Corvette Z06": "Z06",
    "Corvette ZR1": "ZR1",
  };

  // Try to find a special case first
  if (specialModels[carDetails.model]) {
    return specialModels[carDetails.model];
  }

  // If it's a well-known make that often gets dropped, just use the model
  if (shorthandMakes.hasOwnProperty(carDetails.make)) {
    const prefix = shorthandMakes[carDetails.make];
    return prefix ? `${prefix} ${carDetails.model}` : carDetails.model;
  }

  // For other cases, use make + model
  return `${carDetails.make} ${carDetails.model}`;
}

// Question examples with more natural, casual phrasing
export const QUESTION_EXAMPLES = [
  // Engagement Questions
  "Tag a friend who needs this {casual} in their life 👀",
  "Who's taking this {casual} home? 🔥",
  "Dream garage material? 👇",
  "Need it? 🤔",
  "Thoughts on this spec? 💭",

  // Location/Adventure
  "First destination in this {casual}?",
  "Canyon runs or track days?",
  "Perfect Sunday drive in this looks like _____ 🗺",

  // Preferences
  "How would you spec yours?",
  "Modern or classic?",
  "Stock or modified?",
  "Manual or auto in this one? 👇",

  // Color/Design
  "Rate the spec 🎨",
  "This color combo... 👌",
  "Best angle?",

  // Experience
  "Add to the collection? 🎯",

  // Specific Features
  "That {feature} though... 🔥",

  // Special Cases (for rare/significant cars)
  "Top 3 {make}s ever?",
  "Modern classic status? 🏆",

  // Fun/Playful
  "Daily it? 😈",
  "Weekend warrior or track weapon?",
  "Perfect weather for this = _____",
];

interface CarDetails {
  year: number;
  make: string;
  model: string;
  feature?: string; // Optional feature to highlight
}

// Updated format function to handle more natural car naming
export function formatQuestion(
  question: string,
  carDetails: CarDetails
): string {
  const casualName = getCasualName(carDetails);

  return (
    question
      .replace("{casual}", casualName)
      .replace("{make}", carDetails.make)
      .replace("{feature}", carDetails.feature || "spec")
      // Keep these for backward compatibility or when we need the full formal name
      .replace("{year}", carDetails.year.toString())
      .replace("{model}", carDetails.model)
  );
}

// Helper function to get a random question
export function getRandomQuestion(): string {
  return QUESTION_EXAMPLES[
    Math.floor(Math.random() * QUESTION_EXAMPLES.length)
  ];
}
