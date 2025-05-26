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
  car_id?: string;
  project_id?: string;
  type: EventType;
  title: string;
  description: string;
  status: EventStatus;
  start: string;
  end?: string;
  isAllDay?: boolean;
  teamMemberIds: string[];
  locationId?: string;
  primaryImageId?: string;
  imageIds?: string[];
  createdAt: string;
  updatedAt: string;
}

// Database representation
export interface DbEvent {
  _id: ObjectId;
  car_id?: string;
  project_id?: string;
  type: EventType;
  title: string;
  description: string;
  status: EventStatus;
  start: Date;
  end?: Date;
  is_all_day?: boolean;
  teamMemberIds: ObjectId[];
  location_id?: ObjectId;
  primary_image_id?: ObjectId;
  image_ids?: ObjectId[];
  created_at: Date;
  updated_at: Date;
}
