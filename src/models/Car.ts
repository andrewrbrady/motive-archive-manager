import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";

dbConnect().catch(console.error);

// Check if the model is already defined to prevent overwriting
const Car =
  mongoose.models.Car ||
  mongoose.model(
    "Car",
    new mongoose.Schema(
      {
        make: String,
        model: String,
        year: Number,
        price: {
          listPrice: Number,
          soldPrice: Number,
          priceHistory: [
            {
              type: {
                type: String,
                enum: ["list", "sold"],
                required: true,
              },
              price: Number,
              date: {
                type: Date,
                default: Date.now,
              },
              notes: String,
            },
          ],
        },
        mileage: {
          value: Number,
          unit: {
            type: String,
            default: "mi",
          },
        },
        color: String,
        engine: {
          type: String,
          displacement: {
            value: Number,
            unit: {
              type: String,
              default: "L",
            },
          },
          power: {
            hp: Number,
            kW: Number,
            ps: Number,
          },
          torque: {
            "lb-ft": Number,
            Nm: Number,
          },
          features: [String],
        },
        horsepower: Number,
        condition: String,
        location: String,
        owner_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        description: String,
        history_report: String,
        // DEPRECATED: Use imageIds instead
        // This field should be removed in future versions
        images: {
          type: Map,
          of: [String],
          default: new Map([
            ["exterior", []],
            ["interior", []],
            ["engine", []],
            ["damage", []],
            ["documents", []],
            ["other", []],
          ]),
        },
        // Array of ObjectIds referencing documents in the 'images' collection
        // UPDATED: Now enforces ObjectId type for data consistency
        // Migration completed 2025-06-01 to convert existing strings to ObjectIds
        imageIds: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Image",
          },
        ],
        // Reference to the primary image for this car
        primaryImageId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Image",
        },
        type: String,
        vin: String,
        interior_color: String,
        client: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Client",
        },
        status: {
          type: String,
          enum: ["available", "sold", "pending"],
          default: "available",
        },
        eventIds: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
          },
        ],
        dimensions: {
          wheelbase: {
            value: Number,
            unit: String,
          },
          weight: {
            value: Number,
            unit: String,
          },
          gvwr: {
            value: Number,
            unit: String,
          },
          trackWidth: {
            value: Number,
            unit: String,
          },
          length: {
            value: Number,
            unit: String,
          },
          width: {
            value: Number,
            unit: String,
          },
          height: {
            value: Number,
            unit: String,
          },
        },
      },
      {
        collection: "cars",
        timestamps: true,
      }
    )
  );

export { Car };
