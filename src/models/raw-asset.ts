import { ObjectId } from "mongodb";

interface Car {
  _id: ObjectId;
  make: string;
  model: string;
  year: number;
}

export interface RawAsset {
  _id: ObjectId;
  date: string;
  description: string;
  locations: string[];
  cars: Car[];
  createdAt: Date;
  updatedAt: Date;
}
