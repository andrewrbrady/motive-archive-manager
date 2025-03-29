import { ObjectId } from "@/lib/types";
import { MongoObjectId, toObjectId } from "@/lib/mongodb-types";
import clientPromise from "@/lib/mongodb";
import { WithId, Document } from "mongodb";

interface HardDriveDocument extends Document {
  _id: MongoObjectId;
  label: string;
  systemName?: string;
  capacity: {
    total: number;
    used?: number;
    available?: number;
  };
  type: "HDD" | "SSD" | "NVMe";
  interface: "USB" | "Thunderbolt" | "USB-C" | "Internal";
  status: "Available" | "In Use" | "Archived" | "Offline";
  locationId?: string;
  notes?: string;
  lastChecked?: Date;
  rawAssets: MongoObjectId[];
  createdAt: Date;
  updatedAt: Date;
  description?: string;
}

// Client-side interface
export interface HardDriveData {
  _id?: ObjectId;
  label: string;
  systemName?: string;
  capacity: {
    total: number;
    used?: number;
    available?: number;
  };
  type: "HDD" | "SSD" | "NVMe";
  interface: "USB" | "Thunderbolt" | "USB-C" | "Internal";
  status: "Available" | "In Use" | "Archived" | "Offline";
  locationId?: string;
  notes?: string;
  lastChecked?: Date;
  rawAssets: ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
  description?: string;
}

export class HardDrive {
  static async create(
    data: Omit<HardDriveData, "_id" | "createdAt" | "updatedAt">
  ) {
    const client = await clientPromise;
    if (!client) {
      throw new Error("Failed to connect to database");
    }
    const db = client.db();
    const now = new Date();

    const result = await db
      .collection<HardDriveDocument>("hard_drives")
      .insertOne({
        ...data,
        rawAssets: data.rawAssets?.map(toObjectId) || [],
        createdAt: now,
        updatedAt: now,
      } as HardDriveDocument);

    return {
      _id: result.insertedId.toString(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
  }

  static async findById(id: string) {
    const client = await clientPromise;
    if (!client) {
      throw new Error("Failed to connect to database");
    }
    const db = client.db();

    const result = await db
      .collection<HardDriveDocument>("hard_drives")
      .findOne({
        _id: toObjectId(id),
      });

    if (!result) return null;

    return {
      ...result,
      _id: result._id.toString(),
      rawAssets: result.rawAssets.map((id) => id.toString()),
    };
  }

  static async findByLabel(label: string) {
    const client = await clientPromise;
    if (!client) {
      throw new Error("Failed to connect to database");
    }
    const db = client.db();

    const result = await db
      .collection<HardDriveDocument>("hard_drives")
      .findOne({ label });

    if (!result) return null;

    return {
      ...result,
      _id: result._id.toString(),
      rawAssets: result.rawAssets.map((id) => id.toString()),
    };
  }

  static async findBySystemName(systemName: string) {
    const client = await clientPromise;
    if (!client) {
      throw new Error("Failed to connect to database");
    }
    const db = client.db();

    const result = await db
      .collection<HardDriveDocument>("hard_drives")
      .findOne({ systemName });

    if (!result) return null;

    return {
      ...result,
      _id: result._id.toString(),
      rawAssets: result.rawAssets.map((id) => id.toString()),
    };
  }

  static async updateCapacity(
    id: string | MongoObjectId,
    capacity: { used: number; available: number }
  ) {
    const client = await clientPromise;
    if (!client) {
      throw new Error("Failed to connect to database");
    }
    const db = client.db();

    return await db.collection<HardDriveDocument>("hard_drives").updateOne(
      { _id: toObjectId(id) },
      {
        $set: {
          "capacity.used": capacity.used,
          "capacity.available": capacity.available,
          lastChecked: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  static async addRawAsset(
    id: string | MongoObjectId,
    rawAssetId: string | MongoObjectId
  ) {
    const client = await clientPromise;
    if (!client) {
      throw new Error("Failed to connect to database");
    }
    const db = client.db();

    return await db.collection<HardDriveDocument>("hard_drives").updateOne(
      { _id: toObjectId(id) },
      {
        $addToSet: { rawAssets: toObjectId(rawAssetId) },
        $set: { updatedAt: new Date() },
      }
    );
  }

  static async removeRawAsset(
    id: string | MongoObjectId,
    rawAssetId: string | MongoObjectId
  ) {
    const client = await clientPromise;
    if (!client) {
      throw new Error("Failed to connect to database");
    }
    const db = client.db();

    return await db
      .collection<HardDriveDocument>("hard_drives")
      .updateOne({ _id: toObjectId(id) }, {
        $pull: { rawAssets: toObjectId(rawAssetId) },
        $set: { updatedAt: new Date() },
      } as any);
  }

  static async findByRawAsset(rawAssetId: string | MongoObjectId) {
    const client = await clientPromise;
    if (!client) {
      throw new Error("Failed to connect to database");
    }
    const db = client.db();

    const results = await db
      .collection<HardDriveDocument>("hard_drives")
      .find({ rawAssets: toObjectId(rawAssetId) })
      .toArray();

    return results.map((result) => ({
      ...result,
      _id: result._id.toString(),
      rawAssets: result.rawAssets.map((id) => id.toString()),
    }));
  }
}
