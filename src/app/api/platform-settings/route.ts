import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";

const defaultPlatformSettings = [
  {
    key: "instagram",
    name: "Instagram",
    description: "Photo and video sharing",
    instructions:
      "Create engaging captions for Instagram posts. Focus on visual storytelling, use relevant hashtags, and encourage engagement. Keep it authentic and visually appealing.",
    icon: "Instagram",
  },
  {
    key: "youtube",
    name: "YouTube",
    description: "Video content platform",
    instructions:
      "Write compelling descriptions for YouTube videos. Include key details about the content, encourage viewers to like and subscribe, and optimize for search with relevant keywords.",
    icon: "Youtube",
  },
  {
    key: "twitter",
    name: "Twitter/X",
    description: "Microblogging platform",
    instructions:
      "Create concise, impactful posts for Twitter/X. Keep within character limits, use relevant hashtags sparingly, and encourage retweets and engagement.",
    icon: "Twitter",
  },
  {
    key: "facebook",
    name: "Facebook",
    description: "Social networking",
    instructions:
      "Write engaging Facebook posts that encourage discussion and sharing. Use a conversational tone and include calls-to-action to boost engagement.",
    icon: "Facebook",
  },
  {
    key: "threads",
    name: "Threads",
    description: "Text-based conversations",
    instructions:
      "Create authentic, conversation-starting content for Threads. Focus on community engagement and meaningful discussions around the automotive content.",
    icon: "MessageCircle",
  },
];

// GET - Fetch platform settings for caption generators
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const settings = await db
      .collection("platformSettings")
      .find({})
      .sort({ key: 1 })
      .toArray();

    // If no custom settings exist, return defaults
    if (settings.length === 0) {
      return NextResponse.json(defaultPlatformSettings);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching platform settings:", error);
    // Return defaults on error to ensure the app keeps working
    return NextResponse.json(defaultPlatformSettings);
  }
}
