import mongoose from "mongoose";

const ResearchFile =
  mongoose.models.ResearchFile ||
  mongoose.model(
    "ResearchFile",
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
        collection: "research_files",
      }
    )
  );

export { ResearchFile };
