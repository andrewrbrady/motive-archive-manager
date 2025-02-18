import { ObjectId } from "mongodb";

export enum EventType {
  DETAIL = "DETAIL",
  MAINTENANCE = "MAINTENANCE",
  CATALOG = "CATALOG",
  DELIVERY = "DELIVERY",
  PICKUP = "PICKUP",
  INSPECTION = "INSPECTION",
  CUSTOM = "CUSTOM",
}

export enum EventStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

export interface Event {
  id: string;
  description: string;
  type: EventType;
  status: EventStatus;
  start: string;
  end?: string;
  assignee?: string;
  isAllDay?: boolean;
}
