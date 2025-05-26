import { Collection, Db, ObjectId, Filter } from "mongodb";
import { Event, EventStatus, EventType, DbEvent } from "@/types/event";

type EventQuery = {
  type?: EventType;
  status?: EventStatus;
  teamMemberIds?: string | { $in: string[] };
  car_id?: string;
  project_id?: string;
  start?:
    | Date
    | {
        $gte?: Date;
        $lte?: Date;
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
      await this.collection.createIndex({ project_id: 1 });
      await this.collection.createIndex({ type: 1 });
      await this.collection.createIndex({ start: 1 });
      await this.collection.createIndex({ status: 1 });
      await this.collection.createIndex({ created_at: -1 });
      await this.collection.createIndex({ teamMemberIds: 1 });
    }
  }

  async create(event: Omit<DbEvent, "_id" | "created_at" | "updated_at">) {
    const now = new Date();
    const newEvent = {
      ...event,
      created_at: now,
      updated_at: now,
      teamMemberIds: event.teamMemberIds || [],
    };

    const result = await this.collection.insertOne(newEvent as DbEvent);
    return result.insertedId;
  }

  async findById(id: ObjectId) {
    return await this.collection.findOne({ _id: id });
  }

  async findByCarId(carId: string) {
    const events = await this.collection
      .find({ car_id: carId })
      .sort({ start: 1 })
      .toArray();
    return events;
  }

  async findByProjectId(projectId: string) {
    const events = await this.collection
      .find({ project_id: projectId })
      .sort({ start: 1 })
      .toArray();
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

    // Add car_id filter
    if (query.car_id) {
      filter.car_id = query.car_id;
    }

    // Add project_id filter
    if (query.project_id) {
      filter.project_id = query.project_id;
    }

    // Add team member filter
    if (query.teamMemberIds) {
      if (typeof query.teamMemberIds === "string") {
        filter.teamMemberIds = { $in: [new ObjectId(query.teamMemberIds)] };
      } else {
        filter.teamMemberIds = {
          $in: query.teamMemberIds.$in.map((id) => new ObjectId(id)),
        };
      }
    }

    // Add date filters
    if (query.start) {
      if (query.start instanceof Date) {
        filter.start = query.start;
      } else {
        filter.start = {};
        if (query.start.$gte) {
          filter.start.$gte = query.start.$gte;
        }
        if (query.start.$lte) {
          filter.start.$lte = query.start.$lte;
        }
      }
    }

    return this.collection.find(filter).sort({ start: 1 }).toArray();
  }

  async update(id: ObjectId, updates: Partial<DbEvent>): Promise<boolean> {
    try {
      // Validate teamMemberIds if present
      if (updates.teamMemberIds !== undefined) {
        if (!Array.isArray(updates.teamMemberIds)) {
          console.error("Invalid teamMemberIds format:", updates.teamMemberIds);
          return false;
        }
        // Ensure all teamMemberIds are ObjectIds
        updates.teamMemberIds = updates.teamMemberIds.map((id) =>
          typeof id === "string" ? new ObjectId(id) : id
        );
      }

      // Ensure dates are proper Date objects
      if (updates.updated_at && !(updates.updated_at instanceof Date)) {
        updates.updated_at = new Date(updates.updated_at);
      }

      const result = await this.collection.updateOne(
        { _id: id },
        {
          $set: {
            ...updates,
            // Always update the updated_at timestamp
            updated_at: updates.updated_at || new Date(),
          },
        }
      );

      return result.matchedCount > 0;
    } catch (error) {
      console.error("Error updating event:", error);
      return false;
    }
  }

  async delete(id: ObjectId) {
    const result = await this.collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async updateStatus(id: ObjectId, status: EventStatus): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: id },
      { $set: { status, updated_at: new Date() } }
    );
    return result.modifiedCount > 0;
  }

  async getUpcomingEvents(limit: number = 10) {
    const now = new Date();
    return await this.collection
      .find({
        start: { $gte: now },
      })
      .sort({ start: 1 })
      .limit(limit)
      .toArray();
  }

  // Transform database event to API event
  transformToApiEvent(dbEvent: DbEvent): Event {
    return {
      id: dbEvent._id.toString(),
      car_id: dbEvent.car_id,
      project_id: dbEvent.project_id,
      type: dbEvent.type,
      description: dbEvent.description,
      status: dbEvent.status,
      start: dbEvent.start.toISOString(),
      end: dbEvent.end?.toISOString(),
      isAllDay: dbEvent.is_all_day || false,
      teamMemberIds: dbEvent.teamMemberIds.map((id) => id.toString()),
      createdAt: dbEvent.created_at.toISOString(),
      updatedAt: dbEvent.updated_at.toISOString(),
    };
  }
}
