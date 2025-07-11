import mongoose, { Document, Schema } from "mongoose";
import { dbConnect } from "@/lib/mongodb";

// Call dbConnect to ensure a connection is established
dbConnect().catch(console.error);

export interface IAIImageAnalysisPrompt extends Document {
  name: string;
  description: string;
  analysisType: "alt" | "caption" | "both";
  systemPrompt: string;
  userPromptTemplate: string;
  aiModel: string;
  llmProvider: string;
  isDefault: boolean;
  isActive: boolean;
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

const AIImageAnalysisPromptSchema = new Schema<IAIImageAnalysisPrompt>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    analysisType: {
      type: String,
      required: true,
      enum: ["alt", "caption", "both"],
      default: "both",
    },
    systemPrompt: { type: String, required: true, trim: true },
    userPromptTemplate: { type: String, required: true, trim: true },
    aiModel: { type: String, required: true, trim: true },
    llmProvider: {
      type: String,
      required: true,
      enum: ["anthropic", "openai", "google", "motive-internal"],
      default: "openai",
    },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    modelParams: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
      description: "Provider-specific model parameters",
    },
  },
  {
    timestamps: true,
    collection: "ai_image_analysis_prompts",
  }
);

// Ensure that only one default prompt exists per analysis type
AIImageAnalysisPromptSchema.pre("save", async function (next) {
  if (this.isDefault) {
    // Find any existing default prompts for this analysis type
    const existingDefault = await mongoose.models.AIImageAnalysisPrompt.findOne(
      {
        analysisType: this.analysisType,
        isDefault: true,
        _id: { $ne: this._id }, // Exclude this document
      }
    );

    if (existingDefault) {
      // Update the existing default to not be default anymore
      await mongoose.models.AIImageAnalysisPrompt.updateOne(
        { _id: existingDefault._id },
        { $set: { isDefault: false } }
      );
    }
  }

  next();
});

export default mongoose.models.AIImageAnalysisPrompt ||
  mongoose.model<IAIImageAnalysisPrompt>(
    "AIImageAnalysisPrompt",
    AIImageAnalysisPromptSchema
  );
