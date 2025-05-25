import mongoose from "mongoose";

const ChecklistItemSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  dateCompleted: {
    type: Date,
  },
});

const InspectionSchema = new mongoose.Schema(
  {
    carId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pass", "needs_attention"],
      required: true,
      default: "pass",
    },
    inspectionImageIds: [
      {
        type: String, // Cloudflare image IDs
      },
    ],
    dropboxVideoFolderUrl: {
      type: String,
      trim: true,
    },
    dropboxImageFolderUrl: {
      type: String,
      trim: true,
    },
    checklistItems: [ChecklistItemSchema],
    inspectedBy: {
      type: String,
      trim: true,
    },
    inspectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "inspections",
  }
);

// Create compound index for efficient queries
InspectionSchema.index({ carId: 1, createdAt: -1 });

const Inspection =
  mongoose.models.Inspection || mongoose.model("Inspection", InspectionSchema);

export { Inspection };
export default Inspection;
