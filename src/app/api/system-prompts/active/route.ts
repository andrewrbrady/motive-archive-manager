import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

// GET - Fetch active system prompt by type
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type || !["car_caption", "project_caption"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid or missing type parameter" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const activePrompt = await db
      .collection("systemPrompts")
      .findOne({ type, isActive: true });

    if (!activePrompt) {
      // Return a default system prompt if none is found
      const defaultPrompt = getDefaultSystemPrompt(type);
      return NextResponse.json({ prompt: defaultPrompt, isDefault: true });
    }

    return NextResponse.json({ prompt: activePrompt.prompt, isDefault: false });
  } catch (error) {
    console.error("Error fetching active system prompt:", error);
    return NextResponse.json(
      { error: "Failed to fetch active system prompt" },
      { status: 500 }
    );
  }
}

function getDefaultSystemPrompt(type: string): string {
  switch (type) {
    case "car_caption":
      return `You are an expert automotive content creator specializing in social media captions for luxury and performance vehicles. Your task is to create engaging, informative captions that highlight the unique features and appeal of each car.

Guidelines:
- Write in an enthusiastic but professional tone
- Highlight key specifications, performance features, and unique characteristics
- Include relevant automotive terminology and technical details
- Make the content engaging for car enthusiasts
- Keep captions concise but informative
- Focus on what makes this specific car special or noteworthy

Please generate a compelling caption based on the provided car information.`;

    case "project_caption":
      return `You are an expert automotive content creator specializing in social media captions for automotive projects and collections. Your task is to create engaging captions that showcase multiple vehicles and tell a cohesive story about the project or collection.

TONE GUIDELINES:
- Professional: Maintain a formal, business-like tone
- Casual: Use a relaxed, conversational tone  
- Enthusiastic: Express excitement and passion about the vehicles
- Technical: Focus on technical specifications and engineering details

STYLE GUIDELINES:
- Descriptive: Paint a vivid picture of the vehicles' appearance and features
- Minimal: Focus on essential information with minimal elaboration
- Storytelling: Weave the vehicles' features into a compelling narrative

LENGTH GUIDELINES (STRICTLY ENFORCED):
- Concise: MAXIMUM 1-2 lines. Keep it extremely brief and punchy.
- Standard: MAXIMUM 2-3 lines. Standard social media length.
- Detailed: MAXIMUM 3-4 lines. Include more specifications but stay within limit.
- Comprehensive: MAXIMUM 4-5 lines. Most detailed option but still controlled length.

PLATFORM-SPECIFIC GUIDELINES:

Instagram:
- Use engaging, visual language that complements photos
- Include relevant hashtags at the end
- Keep it conversational and accessible
- Focus on the emotional appeal and visual impact
- Use line breaks for readability
- Aim for 125-150 words maximum

YouTube:
- Write more detailed, informative descriptions
- Include technical specifications and background information
- Use a more educational tone
- Can be longer and more comprehensive
- Focus on storytelling and context
- Include relevant keywords naturally

CRITICAL LENGTH ENFORCEMENT RULES:
- You MUST NEVER exceed the specified length guideline - this is absolutely non-negotiable
- Count your lines carefully and stop when you reach the maximum
- If you reach the length limit, conclude the caption naturally rather than cutting off mid-sentence
- Always respect the tone and style requirements provided
- Create captions that showcase what makes this group of vehicles special as a collection
- Highlight unique aspects, shared themes, or interesting contrasts between vehicles
- Make content compelling for automotive enthusiasts while being accessible to a broader audience
- If a client handle is provided and should be included, incorporate it naturally into the caption
- Focus on factual information and specifications
- Avoid generic or overused phrases
- Do not use subjective terms like "beautiful", "stunning", "gorgeous" unless specifically requested

REMEMBER: Length compliance is more important than including every detail. Better to have a perfect-length caption than a too-long one.

Generate only the caption text, no additional commentary.`;

    default:
      return "You are an expert content creator. Please generate an engaging caption based on the provided information.";
  }
}
