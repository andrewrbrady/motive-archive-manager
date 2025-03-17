"use strict";
import mongoose, { Model, Document } from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import bcrypt from "bcrypt";

// Ensure database connection is established
dbConnect().catch(console.error);

// Base interface for user properties
export interface IUserBase {
  name: string;
  email: string;
  password?: string;
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
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerified?: boolean;
}

// Interface for user methods
export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  toPublicJSON(): Record<string, any>;
}

// Combined interface for user document with methods
export interface IUser extends IUserBase, Document, IUserMethods {}

// Interface for user model static methods
export interface UserModel extends Model<IUser, {}, IUserMethods> {
  findByEmail(email: string): Promise<IUser | null>;
  findByResetToken(token: string): Promise<IUser | null>;
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
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters long"],
      select: false, // Don't include password in query results by default
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerified: {
      type: Boolean,
      default: false,
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

// Hash password before saving
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with the new salt
    if (this.password) {
      const hashedPassword = await bcrypt.hash(this.password, salt);
      // Replace the plaintext password with the hashed one
      this.password = hashedPassword;
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Add method to check password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  // If no password set, authentication can't succeed
  if (!this.password) return false;

  return bcrypt.compare(candidatePassword, this.password);
};

// Add instance methods
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  // Remove sensitive data
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.__v;
  return obj;
};

// Add static methods
userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByResetToken = function (token: string) {
  return this.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: Date.now() },
  });
};

// Add virtual properties
userSchema.virtual("isActive").get(function () {
  return this.status === "active" && this.active;
});

// Export the model using the singleton pattern
const User = (mongoose.models.User ||
  mongoose.model<IUser, UserModel>("User", userSchema)) as UserModel;

export { User };
