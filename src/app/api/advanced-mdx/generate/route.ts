import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { uploadMDXFile } from "@/lib/s3";
import { AdvancedMDXFile } from "@/models/AdvancedMDXFile";
import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { title, filename, carId } = await request.json();

    if (!title || !filename) {
      return NextResponse.json(
        { error: "Title and filename are required" },
        { status: 400 }
      );
    }

    // Check if file with same name already exists
    const existingFile = await AdvancedMDXFile.findOne({
      filename: `${filename}.mdx`,
    });
    if (existingFile) {
      return NextResponse.json(
        { error: "File with this name already exists" },
        { status: 400 }
      );
    }

    // Generate article content using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a professional automotive writer creating an article in MDX format. 
          Write an engaging, informative article about the given car.
          Include proper MDX frontmatter with title, subtitle, tags, and car specifications.
          Use markdown formatting for headers, lists, and emphasis where appropriate.
          Structure the article with sections for:
          - Introduction
          - Specifications
          - Exterior & Design
          - Interior & Features
          - Performance & Handling
          - History & Market Position
          - Conclusion`,
        },
        {
          role: "user",
          content: `Write an article with the title: "${title}"${
            carId ? " about a specific car" : ""
          }. Include detailed specifications and use proper MDX formatting with frontmatter.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("Failed to generate article content");
    }

    // Upload to S3
    const s3Key = await uploadMDXFile(`${filename}.mdx`, content);

    // Create MongoDB record
    const mdxFile = await AdvancedMDXFile.create({
      filename: `${filename}.mdx`,
      s3Key,
    });

    // Return the file with content
    return NextResponse.json({
      file: {
        ...mdxFile.toObject(),
        content,
      },
    });
  } catch (error: any) {
    console.error("Error generating advanced MDX article:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate article" },
      { status: 500 }
    );
  }
}
