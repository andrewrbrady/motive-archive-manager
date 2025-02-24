import { ObjectId } from "mongodb";

export interface InventoryItem {
  _id: ObjectId;
  name: string;
  description: string;
  quantity: number;
  location: string;
  category: string;
  status: string;
  lastUpdated: Date;
  createdAt: Date;
}
