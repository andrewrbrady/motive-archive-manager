import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
// No auto-connect; caller must invoke dbConnect()

// Check if the model is already defined to prevent overwriting
const Gallery =
  mongoose.models.Gallery ||
  mongoose.model(
    "Gallery",
    new mongoose.Schema(
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        // Array of ObjectIds referencing documents in the 'images' collection
        imageIds: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Image",
          },
        ],
        // Reference to the primary image for this gallery (used for thumbnails)
        primaryImageId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Image",
        },
        // Optional ordered images array for custom sorting
        orderedImages: [
          {
            id: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Image",
            },
            order: {
              type: Number,
              default: 0,
            },
          },
        ],
      },
      {
        collection: "galleries",
        timestamps: true,
      }
    )
  );

export { Gallery };
