import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Collection } from "mongodb";

interface EventTemplate {
  type: string;
  description: string;
  daysFromStart: number;
  hasEndDate?: boolean;
  daysUntilEnd?: number;
  isAllDay?: boolean;
}

interface BatchTemplate {
  name: string;
  events: EventTemplate[];
}

let templateCollection: Collection;

async function getTemplateCollection() {
  if (!templateCollection) {
    const db = await getDatabase();
    templateCollection = db.collection("event_templates");
  }
  return templateCollection;
}

export async function GET() {
  try {
    const collection = await getTemplateCollection();
    const templates = await collection.find({}).toArray();

    // Transform array of documents into a record object
    const templatesRecord: Record<string, BatchTemplate> = {};
    templates.forEach((template) => {
      const { name, events } = template;
      templatesRecord[name] = { name, events };
    });

    return NextResponse.json({ templates: templatesRecord });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const collection = await getTemplateCollection();
    const template: BatchTemplate = await request.json();

    // Validate template
    if (!template.name || !template.events || template.events.length === 0) {
      return NextResponse.json(
        { error: "Invalid template data" },
        { status: 400 }
      );
    }

    // Check if template with this name already exists
    const existingTemplate = await collection.findOne({ name: template.name });
    if (existingTemplate) {
      // Update existing template
      await collection.updateOne(
        { name: template.name },
        { $set: { events: template.events } }
      );
    } else {
      // Create new template
      await collection.insertOne(template);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving template:", error);
    return NextResponse.json(
      { error: "Failed to save template" },
      { status: 500 }
    );
  }
}
