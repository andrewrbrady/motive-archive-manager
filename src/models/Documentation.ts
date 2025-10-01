import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";

dbConnect().catch(console.error);

const Documentation =
  mongoose.models.Documentation ||
  mongoose.model(
    "Documentation",
    new mongoose.Schema(
      {
        carId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Car",
          required: true,
        },
        filename: {
          type: String,
          required: true,
        },
        s3Key: {
          type: String,
          required: true,
        },
        contentType: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
        description: {
          type: String,
          default: "",
        },
        tags: [
          {
            type: String,
          },
        ],
      },
      {
        timestamps: true,
        collection: "documentation_files",
      }
    )
  );

export { Documentation };
