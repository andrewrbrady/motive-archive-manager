import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";

dbConnect().catch(console.error);

// Define the interface for MDX file document
interface IMDXFile extends mongoose.Document {
  filename: string;
  s3Key: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema
const MDXFileSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      unique: true,
    },
    s3Key: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "mdx_files",
    versionKey: "__v",
  }
);

// Ensure indexes are created
MDXFileSchema.index({ filename: 1 }, { unique: true, background: true });
MDXFileSchema.index({ createdAt: -1 }, { background: true });

// Export the model with proper type checking
export const MDXFile =
  mongoose.models.MDXFile || mongoose.model("MDXFile", MDXFileSchema);
