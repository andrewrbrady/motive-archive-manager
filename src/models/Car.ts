import mongoose from 'mongoose';

// Check if the model is already defined to prevent overwriting
const Car = mongoose.models.Car || mongoose.model('Car', new mongoose.Schema(
  {
    brand: String,
    model: String,
    year: String,
    price: String,
    mileage: String,
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
  },
  {
    collection: "cars",
  }
));

export { Car };