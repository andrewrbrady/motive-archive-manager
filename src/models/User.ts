"use strict";
import mongoose, { Document, Model } from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import bcryptjs from "bcryptjs";

// No auto-connect; caller must invoke dbConnect()

// User document interface
export interface IUserDocument extends Document {
  name: string;
  email: string;
  password?: string;
  roles: string[];
  status: "active" | "inactive" | "suspended";
  creativeRoles: string[];
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  accountType?: string;
  profileImage?: string;
  bio?: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
}

// User methods interface
export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  toPublicJSON(): Record<string, any>;
}

// Define static methods
export interface UserModelStatics {
  findByResetToken(token: string): Promise<IUserDocument | null>;
}

// User model interface combining document and methods
export interface IUser extends IUserDocument, IUserMethods {}

// User model type
export type UserModel = Model<
  IUserDocument,
  Record<string, never>,
  IUserMethods
> &
  UserModelStatics;

// Define the user schema
const userSchema = new mongoose.Schema<IUserDocument, UserModel, IUserMethods>(
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
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
    },
    roles: {
      type: [String],
      default: ["user"],
      enum: ["user", "admin", "editor"],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    creativeRoles: {
      type: [String],
      default: [],
    },
    accountType: {
      type: String,
      enum: ["individual", "organization"],
      default: "individual",
    },
    profileImage: {
      type: String,
    },
    bio: {
      type: String,
    },
    last_login: {
      type: Date,
    },
    resetToken: {
      type: String,
    },
    resetTokenExpiry: {
      type: Date,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  try {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified("password")) return next();

    // Generate a salt
    const salt = await bcryptjs.genSalt(10);

    // Hash the password along with the new salt
    if (this.password) {
      this.password = await bcryptjs.hash(this.password, salt);
    }

    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to check if the provided password is correct
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  // If no password set, authentication can't succeed
  if (!this.password) return false;

  return bcryptjs.compare(candidatePassword, this.password);
};

// Method to create a public user object (without sensitive data)
userSchema.methods.toPublicJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.resetToken;
  delete user.resetTokenExpiry;
  return user;
};

// Static method to find a user by reset token that hasn't expired
userSchema.statics.findByResetToken = async function (token: string) {
  return this.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() },
  });
};

// Create and export the User model
export const User = (mongoose.models.User ||
  mongoose.model<IUserDocument, UserModel>("User", userSchema)) as UserModel;

export default User;
