import { NextRequest, NextResponse } from "next/server";
import { searchResearchVectors } from "@/lib/vectorStore";
import { ChatOpenAI } from "@langchain/openai";
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
} from "@langchain/core/messages";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OpenAI API Key");
}

// Initialize chat model
const chatModel = new ChatOpenAI({
  modelName: "gpt-4-turbo-preview",
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { messages, prompt } = await request.json();
    const carId = params.id;

    console.log("Processing chat request:");
    console.log("Car ID:", carId);
    console.log("Prompt:", prompt);

    // Search for relevant research chunks
    const researchChunks = await searchResearchVectors(prompt, carId);
    console.log("Number of research chunks found:", researchChunks.length);

    // Format research context
    const researchContext = researchChunks
      .map(
        (chunk) => `
Content from "${chunk.metadata.fileName}" (part ${chunk.metadata.chunk}):
${chunk.pageContent}
`
      )
      .join("\n\n");

    console.log("Research context:", researchContext || "No context available");

    // Prepare chat messages
    const systemMessage = new SystemMessage(
      `You are a knowledgeable automotive research assistant. Use the provided research documents to answer questions about the vehicle. 
Only use information from the provided research documents. If you cannot find relevant information in the documents, say so.
Always cite your sources by mentioning which document you got the information from.

Research documents:
${researchContext}`
    );

    // Convert previous messages to LangChain format
    const previousMessages = messages.map((msg: any) =>
      msg.role === "user"
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    );

    // Add current prompt
    const currentMessage = new HumanMessage(prompt);

    // Get response from chat model
    const response = await chatModel.call([
      systemMessage,
      ...previousMessages,
      currentMessage,
    ]);

    return NextResponse.json({
      role: "assistant",
      content: response.content,
    });
  } catch (error) {
    console.error("Error in research chat:", error);
    return NextResponse.json(
      { error: "Failed to process research chat" },
      { status: 500 }
    );
  }
}
