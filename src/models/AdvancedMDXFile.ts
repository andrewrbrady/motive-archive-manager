import mongoose from "mongoose";

// Define the interface for Advanced MDX file document
interface IAdvancedMDXFile extends mongoose.Document {
  filename: string;
  s3Key: string;
  content?: string;
  frontmatter?: {
    title?: string;
    subtitle?: string;
    type?: string;
    slug?: string;
    author?: string;
    tags?: string[];
    cover?: string;
    specs?: {
      mileage?: string;
      engine?: string;
      power?: string;
      torque?: string;
      transmission?: string;
      drivetrain?: string;
      price?: string;
      [key: string]: string | undefined;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema
const AdvancedMDXFileSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    s3Key: {
      type: String,
      required: true,
    },
    frontmatter: {
      type: {
        title: String,
        subtitle: String,
        type: String,
        slug: String,
        author: String,
        tags: [String],
        cover: String,
        specs: {
          type: Map,
          of: String,
        },
      },
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "advanced_mdx_files",
    versionKey: "__v",
  }
);

// Ensure indexes are created (without unique constraint)
AdvancedMDXFileSchema.index({ filename: 1 }, { background: true });
AdvancedMDXFileSchema.index({ createdAt: -1 }, { background: true });
AdvancedMDXFileSchema.index({ "frontmatter.slug": 1 }, { background: true });

// Export the model with proper type checking and explicit database name
export const AdvancedMDXFile =
  mongoose.models.AdvancedMDXFile ||
  mongoose.model(
    "AdvancedMDXFile",
    AdvancedMDXFileSchema,
    "advanced_mdx_files"
  );

export type { IAdvancedMDXFile };
