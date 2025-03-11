import { ObjectId as TypeObjectId } from "@/lib/types";
import { MongoObjectId, toObjectId } from "@/lib/mongodb-types";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Client-side interface
export interface RawAssetData {
  _id?: TypeObjectId;
  date: string;
  description: string;
  hardDriveIds: TypeObjectId[];
  carIds: string[]; // Array of car IDs - required field
  createdAt?: Date;
  updatedAt?: Date;
}

// Server-side class
export class RawAsset {
  static async create(
    data: Omit<RawAssetData, "_id" | "createdAt" | "updatedAt">
  ) {
    const client = await clientPromise;
    const db = client.db();
    const now = new Date();

    const hardDriveIds = data.hardDriveIds.map(toObjectId);
    const carIds = (data.carIds || []).map((id) =>
      typeof id === "string" ? new ObjectId(id) : id
    );

    // Create a clean data object without any 'cars' field
    const cleanData = {
      date: data.date,
      description: data.description,
      hardDriveIds,
      carIds,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("raw_assets").insertOne(cleanData);

    return {
      _id: result.insertedId.toString(),
      date: data.date,
      description: data.description,
      hardDriveIds: hardDriveIds.map((id) => id.toString()),
      carIds: carIds.map((id) => id.toString()),
      createdAt: now,
      updatedAt: now,
    };
  }
}
