import mongoose, { Document, Schema } from "mongoose";
import { dbConnect } from "@/lib/mongodb";

// Call dbConnect to ensure a connection is established
dbConnect().catch(console.error);

export interface IBrandTone extends Document {
  name: string;
  description: string;
  tone_instructions: string;
  example_phrases: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

const BrandToneSchema = new Schema<IBrandTone>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    tone_instructions: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    example_phrases: {
      type: [String],
      default: [],
      validate: {
        validator: function (arr: string[]) {
          return arr.length <= 10; // Maximum 10 example phrases
        },
        message: "Maximum 10 example phrases allowed",
      },
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    created_by: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "brand_tones",
  }
);

// Index for better query performance
BrandToneSchema.index({ name: 1 });
BrandToneSchema.index({ is_active: 1 });

export default mongoose.models.BrandTone ||
  mongoose.model<IBrandTone>("BrandTone", BrandToneSchema);
