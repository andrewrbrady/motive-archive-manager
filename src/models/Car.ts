import mongoose from "mongoose";

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
        price: Number,
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
          displacement: String,
          power_output: String,
          torque: String,
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
        images: [String],
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
      },
      {
        collection: "cars",
        timestamps: true,
      }
    )
  );

export { Car };
