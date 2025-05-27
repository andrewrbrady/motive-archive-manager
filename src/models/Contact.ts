"use strict";
import mongoose, { Document, Model } from "mongoose";
import { dbConnect } from "@/lib/mongodb";

// Ensure database connection is established
dbConnect();

// Contact document interface
export interface IContactDocument extends Document {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role?: string;
  company?: string;
  status: "active" | "inactive";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Contact methods interface
export interface IContactMethods {
  getFullName(): string;
  toPublicJSON(): Record<string, any>;
}

// Define static methods
export interface ContactModelStatics {
  findByEmail(email: string): Promise<IContactDocument | null>;
  findActiveContacts(): Promise<IContactDocument[]>;
}

// Contact model interface combining document and methods
export interface IContact extends IContactDocument, IContactMethods {}

// Contact model type
export type ContactModel = Model<
  IContactDocument,
  Record<string, never>,
  IContactMethods
> &
  ContactModelStatics;

// Define the contact schema
const contactSchema = new mongoose.Schema<
  IContactDocument,
  ContactModel,
  IContactMethods
>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: false,
      unique: true,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    phone: {
      type: String,
      required: false,
      trim: true,
    },
    role: {
      type: String,
      required: false,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  }
);

// Method to get full name
contactSchema.methods.getFullName = function (): string {
  return `${this.firstName} ${this.lastName}`;
};

// Method to create a public contact object (without sensitive data)
contactSchema.methods.toPublicJSON = function () {
  const contact = this.toObject();
  return contact;
};

// Static method to find a contact by email
contactSchema.statics.findByEmail = async function (email: string) {
  if (!email) return null;
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active contacts
contactSchema.statics.findActiveContacts = async function () {
  return this.find({ status: "active" }).sort({ firstName: 1, lastName: 1 });
};

// Create and export the Contact model
export const Contact = (mongoose.models.Contact ||
  mongoose.model<IContactDocument, ContactModel>(
    "Contact",
    contactSchema
  )) as ContactModel;

export default Contact;
