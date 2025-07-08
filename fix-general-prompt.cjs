const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;

const updatedPrompt = {
  name: "General Image Analysis",
  description:
    "Analyze general images (marketing, logos, etc.) for metadata and categorization",
  prompt: `Analyze this image and provide the following details in JSON format. This image could be a marketing image, logo, product image, or other general content.

Analyze the image and categorize it using these fields:

- **angle**: For general images, choose the most appropriate: "front" (direct view), "side" (profile view), "overhead" (top-down), or "other" for mixed/artistic angles
- **view**: "exterior" for images showing external/public-facing content, "interior" for internal/detailed views  
- **movement**: "static" for still/stationary subjects, "motion" for dynamic/action content
- **tod**: "day" for bright/well-lit images, "night" for dark images, "sunrise/sunset" for warm lighting
- **side**: "driver" for left-oriented content, "passenger" for right-oriented, "rear" for background focus, "overhead" for top-down perspective
- **description**: Brief description focusing on the main subject and key visual elements (max 250 characters)

Guidelines:
- Focus on objective, observable features
- Keep descriptions concise and professional  
- Choose the most fitting values from the allowed options
- For logos/graphics, consider "front" angle and "exterior" view
- For product images, use appropriate angle based on perspective shown

Provide response in this exact JSON format:
{
  "angle": "front|front 3/4|side|rear 3/4|rear|overhead|under",
  "view": "exterior|interior", 
  "movement": "static|motion",
  "tod": "sunrise|day|sunset|night",
  "side": "driver|passenger|rear|overhead",
  "description": "concise description (max 250 chars)"
}`,
  category: "general",
  isDefault: false,
  isActive: true,
  updatedAt: new Date().toISOString(),
};

async function updateGeneralPrompt() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection("imageAnalysisPrompts");

    const result = await collection.updateOne(
      { name: "General Image Analysis" },
      { $set: updatedPrompt }
    );

    console.log("✅ Updated general image analysis prompt");
    console.log("Modified count:", result.modifiedCount);
  } catch (error) {
    console.error("Error updating prompt:", error);
  } finally {
    await client.close();
  }
}

updateGeneralPrompt().catch(console.error);
