import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { BatchTemplate } from "@/types/deliverable";

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const templates = await db.collection("batch_templates").find({}).toArray();

    // Convert array to record with name as key, ensuring type safety
    const templatesRecord = templates.reduce((acc, template) => {
      // Convert MongoDB document to BatchTemplate
      const batchTemplate: BatchTemplate = {
        name: template.name,
        templates: template.templates,
      };
      acc[template.name] = batchTemplate;
      return acc;
    }, {} as Record<string, BatchTemplate>);

    return NextResponse.json({ templates: templatesRecord });
  } catch (error) {
    console.error("Error fetching batch templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const template = await request.json();

    // Validate template
    if (
      !template.name ||
      !template.templates ||
      !Array.isArray(template.templates)
    ) {
      return NextResponse.json(
        { error: "Invalid template data" },
        { status: 400 }
      );
    }

    // Check if template with same name exists
    const existing = await db
      .collection("batch_templates")
      .findOne({ name: template.name });

    if (existing) {
      // Update existing template
      await db
        .collection("batch_templates")
        .updateOne({ name: template.name }, { $set: template });
    } else {
      // Create new template
      await db.collection("batch_templates").insertOne(template);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving batch template:", error);
    return NextResponse.json(
      { error: "Failed to save batch template" },
      { status: 500 }
    );
  }
}
