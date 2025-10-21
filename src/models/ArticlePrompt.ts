import mongoose, { Document, Schema } from "mongoose";
import { dbConnect } from "@/lib/mongodb";
// No auto-connect; caller must invoke dbConnect()

export interface IArticlePrompt extends Document {
  name: string;
  prompt: string;
  aiModel: string;
  llmProvider: string;
  isDefault: boolean;
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

const ArticlePromptSchema = new Schema<IArticlePrompt>(
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
    isDefault: { type: Boolean, default: false },
    modelParams: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
      description: "Provider-specific model parameters",
    },
  },
  {
    timestamps: true, // This will add createdAt and updatedAt automatically
    collection: "article_prompts", // Explicitly set the collection name
  }
);

// Ensure that only one default prompt exists
ArticlePromptSchema.pre("save", async function (next) {
  if (this.isDefault) {
    // Find any existing default prompts
    const existingDefault = await mongoose.models.ArticlePrompt.findOne({
      isDefault: true,
      _id: { $ne: this._id }, // Exclude this document
    });

    if (existingDefault) {
      // Update the existing default to not be default anymore
      await mongoose.models.ArticlePrompt.updateOne(
        { _id: existingDefault._id },
        { $set: { isDefault: false } }
      );
    }
  }

  next();
});

export default mongoose.models.ArticlePrompt ||
  mongoose.model<IArticlePrompt>("ArticlePrompt", ArticlePromptSchema);
