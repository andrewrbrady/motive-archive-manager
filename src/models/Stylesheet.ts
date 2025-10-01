import mongoose, { Document, Model } from "mongoose";
import { dbConnect } from "@/lib/mongodb";

dbConnect().catch(console.error);
import { ClientStylesheet } from "@/types/stylesheet";
import { ParsedCSS, CSSClass } from "@/lib/css-parser";

// Stylesheet document interface
export interface IStylesheetDocument
  extends Document,
    Omit<ClientStylesheet, "_id" | "id"> {
  _id: mongoose.Types.ObjectId;
  id: string;
}

// Stylesheet methods interface
export interface IStylesheetMethods {
  updateParsedCSS(cssContent: string): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
}

// Stylesheet model type
export type StylesheetModel = Model<
  IStylesheetDocument,
  Record<string, never>,
  IStylesheetMethods
>;

// CSS Class schema for parsed CSS
const cssClassSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    selector: {
      type: String,
      required: true,
    },
    properties: {
      type: Map,
      of: String,
      required: true,
    },
    description: String,
    category: String,
  },
  { _id: false }
);

// Parsed CSS schema
const parsedCSSSchema = new mongoose.Schema(
  {
    classes: [cssClassSchema],
    variables: {
      type: Map,
      of: String,
      default: new Map(),
    },
    globalStyles: {
      type: Map,
      of: String,
      default: new Map(),
    },
  },
  { _id: false }
);

// Main stylesheet schema
const stylesheetSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      default: () =>
        Date.now().toString(36) + Math.random().toString(36).substr(2),
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    clientId: {
      type: String,
      index: true,
    },
    clientName: String,
    cssContent: {
      type: String,
      required: true,
    },
    parsedCSS: {
      type: parsedCSSSchema,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    uploadedBy: {
      type: String,
      required: true,
    },
    description: String,
    version: {
      type: String,
      default: "1.0.0",
    },
    tags: [String],
  },
  {
    timestamps: true,
    collection: "stylesheets",
  }
);

// Add indexes for efficient querying
stylesheetSchema.index({ clientId: 1, isActive: 1 });
stylesheetSchema.index({ uploadedAt: -1 });
stylesheetSchema.index({ isDefault: 1 });

// Instance methods
stylesheetSchema.methods.updateParsedCSS = async function (cssContent: string) {
  const { parseCSS } = await import("@/lib/css-parser");
  this.cssContent = cssContent;
  this.parsedCSS = parseCSS(cssContent);
  this.updatedAt = new Date();
  return this.save();
};

stylesheetSchema.methods.activate = async function () {
  this.isActive = true;
  this.updatedAt = new Date();
  return this.save();
};

stylesheetSchema.methods.deactivate = async function () {
  this.isActive = false;
  this.updatedAt = new Date();
  return this.save();
};

// Check if the model is already defined to prevent overwriting
const Stylesheet =
  mongoose.models.Stylesheet ||
  mongoose.model<IStylesheetDocument, StylesheetModel>(
    "Stylesheet",
    stylesheetSchema
  );

export { Stylesheet };
export default Stylesheet;
