// app/api/documents/[id]/route.ts
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import clientPromise from "@/lib/mongodb";
import { ObjectId, UpdateFilter } from "mongodb";

interface CarDocument {
  _id: ObjectId;
  documents: ObjectId[];
}

// Helper function to safely get ID
const getDocumentId = (url: URL): string => {
  const segments = url.pathname.split("/");
  const id = segments[segments.length - 1];
  if (!id) throw new Error("Document ID is required");
  return id;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const documentId = getDocumentId(url);

    if (!ObjectId.isValid(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID format" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const db = client.db("motive_archive");
    const document = await db
      .collection("documents")
      .findOne({ _id: new ObjectId(documentId) });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const documentId = getDocumentId(url);

    if (!ObjectId.isValid(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID format" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const data = await request.json();
    const db = client.db("motive_archive");

    const updateData = {
      $set: {
        ...data,
        updatedAt: new Date(),
      },
    };

    const result = await db
      .collection("documents")
      .updateOne({ _id: new ObjectId(documentId) }, updateData);

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const documentId = getDocumentId(url);

    if (!ObjectId.isValid(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID format" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const db = client.db("motive_archive");
    const result = await db
      .collection("documents")
      .deleteOne({ _id: new ObjectId(documentId) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
