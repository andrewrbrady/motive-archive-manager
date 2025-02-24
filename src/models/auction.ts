import { ObjectId } from "mongodb";

interface Bid {
  _id: ObjectId;
  amount: number;
  bidder: ObjectId;
  timestamp: Date;
}

export interface Auction {
  _id: ObjectId;
  title: string;
  description: string;
  startPrice: number;
  currentPrice: number;
  startDate: Date;
  endDate: Date;
  status: "draft" | "active" | "ended" | "cancelled";
  bids: Bid[];
  images: string[];
  seller: ObjectId;
  winner?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
