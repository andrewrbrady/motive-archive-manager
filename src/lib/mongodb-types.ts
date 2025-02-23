import { ObjectId as MongoObjectId } from "mongodb";

export type { MongoObjectId };

export function toObjectId(id: string | MongoObjectId): MongoObjectId {
  return typeof id === "string" ? new MongoObjectId(id) : id;
}
