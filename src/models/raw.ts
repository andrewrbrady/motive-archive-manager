import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export interface RawAssetData {
  _id?: ObjectId;
  date: string;
  description: string;
  locations: string[];
  cars: ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class RawAsset {
  static async create(
    data: Omit<RawAssetData, "_id" | "createdAt" | "updatedAt">
  ) {
    const client = await clientPromise;
    const db = client.db();
    const now = new Date();

    const result = await db.collection("raw").insertOne({
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    return {
      _id: result.insertedId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
  }
}
