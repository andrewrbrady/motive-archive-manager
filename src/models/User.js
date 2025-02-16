"use strict";
import mongoose from "mongoose";

const User =
  mongoose.models.User ||
  mongoose.model(
    "User",
    new mongoose.Schema(
      {
        name: {
          type: String,
          required: true,
        },
        email: {
          type: String,
          required: true,
          unique: true,
        },
        roles: {
          type: [String],
          enum: ["admin", "editor", "viewer"],
          default: ["viewer"],
        },
        active: {
          type: Boolean,
          default: true,
        },
      },
      {
        timestamps: true,
      }
    )
  );

export { User };
