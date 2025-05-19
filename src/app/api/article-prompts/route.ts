import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import ArticlePrompt, { IArticlePrompt } from "@/models/ArticlePrompt";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  await dbConnect();
  try {
    const searchParams = request.nextUrl.searchParams;
    const defaultOnly = searchParams.get("defaultOnly") === "true";

    let query: any = {};

    if (defaultOnly) {
      query.isDefault = true;
    }

    const prompts = await ArticlePrompt.find(query).sort({ createdAt: -1 });

    if (defaultOnly && prompts.length > 0) {
      // If requesting default, return the most recently updated one
      return NextResponse.json(prompts[0]);
    }
    if (defaultOnly && prompts.length === 0) {
      // No default found, return 404
      return NextResponse.json(
        {
          error: "No default article prompt found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(prompts);
  } catch (e) {
    const error = e as Error;
    console.error("Failed to fetch article prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch article prompts", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const data = await request.json();

    if (data.isDefault) {
      // When setting a prompt as default, ensure no other prompt is default
      await ArticlePrompt.updateMany({}, { $set: { isDefault: false } });
    }

    const newPrompt = new ArticlePrompt(data);
    await newPrompt.save();
    return NextResponse.json(newPrompt, { status: 201 });
  } catch (e) {
    const error = e as Error;
    console.error("Failed to create article prompt:", error);
    if (e instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        { error: "Validation failed", details: e.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create article prompt", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  await dbConnect();
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const updateData = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Article prompt ID is required" },
        { status: 400 }
      );
    }

    if (updateData.isDefault) {
      // When setting a prompt as default, ensure no other prompt is default
      await ArticlePrompt.updateMany(
        { _id: { $ne: id } },
        { $set: { isDefault: false } }
      );
    }

    const updatedPrompt = await ArticlePrompt.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedPrompt) {
      return NextResponse.json(
        { error: "Article prompt not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(updatedPrompt);
  } catch (e) {
    const error = e as Error;
    console.error("Failed to update article prompt:", error);
    if (e instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        { error: "Validation failed", details: e.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update article prompt", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  await dbConnect();
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Article prompt ID is required" },
        { status: 400 }
      );
    }

    const deletedPrompt = await ArticlePrompt.findByIdAndDelete(id);

    if (!deletedPrompt) {
      return NextResponse.json(
        { error: "Article prompt not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(deletedPrompt);
  } catch (e) {
    const error = e as Error;
    console.error("Failed to delete article prompt:", error);
    return NextResponse.json(
      { error: "Failed to delete article prompt", details: error.message },
      { status: 500 }
    );
  }
}
