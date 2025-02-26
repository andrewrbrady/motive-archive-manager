import { ObjectId } from "@/lib/types";
import { MongoObjectId, toObjectId } from "@/lib/mongodb-types";
import clientPromise from "@/lib/mongodb";

// Client-side interface
export interface RawAssetData {
  _id?: ObjectId;
  date: string;
  description: string;
  hardDriveIds: ObjectId[];
  carIds?: string[]; // Array of car IDs
  cars?: any[];
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

    const result = await db.collection("raw_assets").insertOne({
      ...data,
      hardDriveIds,
      createdAt: now,
      updatedAt: now,
    });

    return {
      _id: result.insertedId.toString(),
      ...data,
      hardDriveIds: hardDriveIds.map((id) => id.toString()),
      createdAt: now,
      updatedAt: now,
    };
  }
}
