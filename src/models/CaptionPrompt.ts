import mongoose, { Document, Schema } from "mongoose";
import { dbConnect } from "@/lib/mongodb";

// Call dbConnect to ensure a connection is established
dbConnect().catch(console.error);

export interface ICaptionPrompt extends Document {
  name: string;
  prompt: string;
  aiModel: string;
  llmProvider: string;
  platform: string;
  tone: string;
  style: string;
  length: string;
  isDefault: boolean;
  includeClientHandle: boolean;
  modelParams?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CaptionPromptSchema = new Schema<ICaptionPrompt>(
  {
    name: { type: String, required: true, trim: true },
    prompt: { type: String, required: true, trim: true },
    aiModel: { type: String, required: true, trim: true },
    llmProvider: {
      type: String,
      required: true,
      enum: ["anthropic", "openai", "google", "motive-internal"],
      default: "anthropic",
    },
    platform: {
      type: String,
      required: true,
      enum: ["instagram", "facebook", "twitter", "threads"],
      default: "instagram",
    },
    tone: {
      type: String,
      enum: ["professional", "casual", "enthusiastic", "technical"],
      default: "professional",
    },
    style: {
      type: String,
      enum: ["descriptive", "minimal", "storytelling"],
      default: "descriptive",
    },
    length: {
      type: String,
      required: true,
      default: "standard",
    },
    isDefault: { type: Boolean, default: false },
    includeClientHandle: {
      type: Boolean,
      default: false,
      description: "Whether to include client handle in captions by default",
    },
    modelParams: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
      description: "Provider-specific model parameters",
    },
  },
  {
    timestamps: true, // This will add createdAt and updatedAt automatically
    collection: "caption_prompts", // Explicitly set the collection name
  }
);

// Ensure that only one default prompt exists per platform
CaptionPromptSchema.pre("save", async function (next) {
  if (this.isDefault) {
    // Find any existing default prompts for this platform
    const existingDefault = await mongoose.models.CaptionPrompt.findOne({
      platform: this.platform,
      isDefault: true,
      _id: { $ne: this._id }, // Exclude this document
    });

    if (existingDefault) {
      // Update the existing default to not be default anymore
      await mongoose.models.CaptionPrompt.updateOne(
        { _id: existingDefault._id },
        { $set: { isDefault: false } }
      );
    }
  }

  next();
});

// Ensure unique name for prompts, perhaps scoped by platform if needed
// CaptionPromptSchema.index({ name: 1, platform: 1 }, { unique: true });

export default mongoose.models.CaptionPrompt ||
  mongoose.model<ICaptionPrompt>("CaptionPrompt", CaptionPromptSchema);
