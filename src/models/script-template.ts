import { ObjectId } from "mongodb";

export interface ScriptTemplate {
  _id: ObjectId;
  name: string;
  description: string;
  platforms: string[];
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
