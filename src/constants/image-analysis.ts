export const IMAGE_ANALYSIS_CONFIG = {
  // Base prompt for image analysis
  basePrompt:
    "Analyze this car image and provide the following details in JSON format. Keep descriptions concise, under 250 characters:",

  // Style guide for descriptions
  styleGuide: `
    When describing the vehicle:
    - Keep descriptions brief and focused
    - Use concise, technical language
    - Focus on key visible features only
    - Avoid subjective adjectives like "sporty", "sleek", "aggressive"
    - Describe primary design elements only
    - Note significant modifications if present
    - Include critical condition details only
    - Limit description to 250 characters
  `.trim(),

  // Required fields with their allowed values
  requiredFields: {
    angle: [
      "front",
      "front 3/4",
      "side",
      "rear 3/4",
      "rear",
      "overhead",
      "under",
    ],
    view: ["exterior", "interior"],
    movement: ["static", "motion"],
    tod: ["sunrise", "day", "sunset", "night"],
    side: ["driver", "passenger", "rear", "overhead"],
  },

  // Format for the description field
  descriptionFormat:
    "concise description (max 250 chars) focusing on key visible features and technical details",

  // Metadata size limits
  limits: {
    descriptionMaxLength: 250,
    totalMetadataBytes: 1024,
  },
} as const;
