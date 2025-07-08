import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import CaptionPrompt, { ICaptionPrompt } from "@/models/CaptionPrompt";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  await dbConnect();
  try {
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get("platform");
    const defaultOnly = searchParams.get("defaultOnly") === "true";

    let query: any = {};

    if (platform) {
      query.platform = platform;
    }

    if (defaultOnly) {
      query.isDefault = true;
    }

    const prompts = await CaptionPrompt.find(query).sort({ createdAt: -1 });

    if (defaultOnly && platform && prompts.length > 0) {
      // If multiple defaults found for a platform (shouldn't happen with good data hygiene),
      // return the most recently updated one. Or just the first one.
      return NextResponse.json(prompts[0]);
    }
    if (defaultOnly && platform && prompts.length === 0) {
      // No specific default found for this platform, try to find any default prompt
      const anyDefault = await CaptionPrompt.findOne({ isDefault: true }).sort({
        updatedAt: -1,
      });
      if (anyDefault) return NextResponse.json(anyDefault);

      // Instead of returning a 404 error, return null to indicate no default prompt exists
      // This prevents the 500 error in the browser and allows the frontend to handle it gracefully
      return NextResponse.json(null);
    }

    return NextResponse.json(prompts);
  } catch (e) {
    const error = e as Error;
    console.error("Failed to fetch prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompts", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const data = await request.json();

    if (data.isDefault) {
      // When setting a prompt as default, ensure no other prompt for THE SAME PLATFORM is default.
      if (data.platform) {
        await CaptionPrompt.updateMany(
          { platform: data.platform },
          { $set: { isDefault: false } }
        );
      } else {
        // If platform is not specified (should not happen based on schema, but as a fallback)
        await CaptionPrompt.updateMany({}, { $set: { isDefault: false } });
      }
    }

    const newPrompt = new CaptionPrompt(data);
    await newPrompt.save();
    return NextResponse.json(newPrompt, { status: 201 });
  } catch (e) {
    const error = e as Error; // General error
    console.error("Failed to create prompt:", error);
    if (e instanceof mongoose.Error.ValidationError) {
      // e is now specifically mongoose.Error.ValidationError
      return NextResponse.json(
        { error: "Validation failed", details: e.errors }, // Now e.errors should be typed correctly
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create prompt", details: error.message }, // Use general error message
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  await dbConnect();
  try {
    const { id, ...updateData } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: "Prompt ID is required" },
        { status: 400 }
      );
    }

    if (updateData.isDefault) {
      // When setting a prompt as default, ensure no other prompt for THE SAME PLATFORM is default.
      if (updateData.platform) {
        await CaptionPrompt.updateMany(
          { platform: updateData.platform, _id: { $ne: id } },
          { $set: { isDefault: false } }
        );
      } else {
        // Fallback if platform somehow isn't in updateData, though it should be.
        await CaptionPrompt.updateMany(
          { _id: { $ne: id } },
          { $set: { isDefault: false } }
        );
      }
    }

    const updatedPrompt = await CaptionPrompt.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedPrompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }
    return NextResponse.json(updatedPrompt);
  } catch (e) {
    const error = e as Error; // General error
    console.error("Failed to update prompt:", error);
    if (e instanceof mongoose.Error.ValidationError) {
      // e is now specifically mongoose.Error.ValidationError
      return NextResponse.json(
        { error: "Validation failed", details: e.errors }, // Now e.errors should be typed correctly
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update prompt", details: error.message }, // Use general error message
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
        { error: "Prompt ID is required" },
        { status: 400 }
      );
    }

    const deletedPrompt = await CaptionPrompt.findByIdAndDelete(id);

    if (!deletedPrompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }
    return NextResponse.json(deletedPrompt);
  } catch (e) {
    const error = e as Error;
    console.error("Failed to delete prompt:", error);
    return NextResponse.json(
      { error: "Failed to delete prompt", details: error.message },
      { status: 500 }
    );
  }
}
