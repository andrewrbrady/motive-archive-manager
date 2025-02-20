import { Collection, Db, ObjectId, Filter } from "mongodb";
import { Event, EventStatus, EventType } from "@/types/event";

interface DbEvent extends Omit<Event, "id"> {
  _id: ObjectId;
  car_id: string;
  created_at: Date;
  updated_at: Date;
  scheduled_date: string;
  end_date?: string;
  is_all_day?: boolean;
  assignees: string[];
}

type EventQuery = {
  type?: EventType;
  status?: EventStatus;
  assignees?: string | { $in: string[] };
  scheduled_date?:
    | string
    | {
        $gte?: string;
        $lte?: string;
      };
};

export class EventModel {
  private collection: Collection<DbEvent>;

  constructor(db: Db) {
    this.collection = db.collection<DbEvent>("events");
    this.setupCollection();
  }

  private async setupCollection() {
    const collections = await this.collection.listIndexes().toArray();

    // Create indexes if they don't exist
    if (collections.length <= 1) {
      await this.collection.createIndex({ car_id: 1 });
      await this.collection.createIndex({ type: 1 });
      await this.collection.createIndex({ scheduled_date: 1 });
      await this.collection.createIndex({ status: 1 });
      await this.collection.createIndex({ created_at: -1 });
    }
  }

  async create(event: Omit<DbEvent, "_id" | "created_at" | "updated_at">) {
    const now = new Date();
    const newEvent = {
      ...event,
      created_at: now,
      updated_at: now,
      assignees: event.assignees || [],
    };

    const result = await this.collection.insertOne(newEvent as DbEvent);
    return result.insertedId;
  }

  async findById(id: ObjectId) {
    return await this.collection.findOne({ _id: id });
  }

  async findByCarId(carId: string) {
    console.log("Finding events for car ID:", carId); // Debug log
    const events = await this.collection
      .find({ car_id: carId })
      .sort({ scheduled_date: 1 })
      .toArray();
    console.log("Found events:", events); // Debug log
    return events;
  }

  async findAll(query: EventQuery = {}) {
    const filter: Filter<DbEvent> = {};

    // Add type filter
    if (query.type) {
      filter.type = query.type;
    }

    // Add status filter
    if (query.status) {
      filter.status = query.status;
    }

    // Add assignee filter
    if (query.assignees) {
      if (typeof query.assignees === "string") {
        filter.assignees = { $in: [query.assignees] };
      } else {
        filter.assignees = query.assignees;
      }
    }

    // Add date filters
    if (query.scheduled_date) {
      if (typeof query.scheduled_date === "string") {
        filter.scheduled_date = query.scheduled_date;
      } else {
        filter.scheduled_date = {};
        if (query.scheduled_date.$gte) {
          filter.scheduled_date.$gte = query.scheduled_date.$gte;
        }
        if (query.scheduled_date.$lte) {
          filter.scheduled_date.$lte = query.scheduled_date.$lte;
        }
      }
    }

    return this.collection.find(filter).sort({ scheduled_date: 1 }).toArray();
  }

  async update(id: ObjectId, updates: Partial<DbEvent>) {
    if ("assignees" in updates && !Array.isArray(updates.assignees)) {
      updates.assignees = [];
    }

    const result = await this.collection.updateOne(
      { _id: id },
      { $set: { ...updates, updated_at: new Date() } }
    );
    return result.modifiedCount > 0;
  }

  async delete(id: ObjectId) {
    const result = await this.collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async updateStatus(id: ObjectId, status: EventStatus): Promise<boolean> {
    return this.update(id, { status });
  }
}
