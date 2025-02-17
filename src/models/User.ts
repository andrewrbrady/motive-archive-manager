"use strict";
import mongoose, { Model, Document } from "mongoose";
import { dbConnect } from "@/lib/mongodb";

// Ensure database connection is established
dbConnect().catch(console.error);

export interface IUser extends Document {
  name: string;
  email: string;
  roles: string[];
  status: string;
  creativeRoles: string[];
  created_at: Date;
  updated_at: Date;
  active: boolean;
  permissions: string[];
  last_login?: Date;
  profile?: {
    avatar_url?: string;
    title?: string;
    bio?: string;
    specialties?: string[];
    portfolio_url?: string;
  };
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
      index: true,
    },
    roles: {
      type: [String],
      enum: {
        values: ["admin", "editor", "viewer"],
        message: "{VALUE} is not a valid role",
      },
      required: [true, "At least one role is required"],
      default: ["viewer"],
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive", "suspended"],
        message: "{VALUE} is not a valid status",
      },
      default: "active",
    },
    creativeRoles: {
      type: [String],
      enum: {
        values: [
          "video_editor",
          "photographer",
          "content_writer",
          "social_media_manager",
          "cinematographer",
          "sound_engineer",
          "graphic_designer",
          "storyboard_artist",
        ],
        message: "{VALUE} is not a valid creative role",
      },
      default: [],
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
    active: {
      type: Boolean,
      default: true,
    },
    permissions: {
      type: [String],
      enum: {
        values: ["create", "read", "update", "delete"],
        message: "{VALUE} is not a valid permission",
      },
      default: ["read"],
    },
    last_login: {
      type: Date,
    },
    profile: {
      avatar_url: String,
      title: String,
      bio: String,
      specialties: [String],
      portfolio_url: String,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add instance methods
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Add static methods
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Add virtual properties
userSchema.virtual("isActive").get(function () {
  return this.status === "active" && this.active;
});

// Export the model using the singleton pattern
const User = mongoose.models.User || mongoose.model("User", userSchema);

export { User };
