import { ObjectId } from "mongodb";

export enum EventType {
  AUCTION_SUBMISSION = "AUCTION_SUBMISSION",
  AUCTION_LISTING = "AUCTION_LISTING",
  AUCTION_END = "AUCTION_END",
  INSPECTION = "INSPECTION",
  DETAIL = "DETAIL",
  PRODUCTION = "PRODUCTION",
  POST_PRODUCTION = "POST_PRODUCTION",
  MARKETING = "MARKETING",
  PICKUP = "PICKUP",
  DELIVERY = "DELIVERY",
  OTHER = "OTHER",
}

export enum EventStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

export interface Event {
  id: string;
  car_id: string;
  type: EventType;
  description: string;
  status: EventStatus;
  start: string;
  end?: string;
  isAllDay?: boolean;
  assignees: string[];
  createdAt: string;
  updatedAt: string;
}
