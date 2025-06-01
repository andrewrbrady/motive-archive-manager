import { Collection, Db, ObjectId, Filter } from "mongodb";
import { Event, EventType, DbEvent } from "@/types/event";

type EventQuery = {
  type?: EventType;
  teamMemberIds?: string | { $in: string[] };
  car_id?: string;
  project_id?: string;
  createdBy?: string;
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
    // Temporarily disabled to test performance
    // this.setupCollection();
  }

  private async setupCollection() {
    const collections = await this.collection.listIndexes().toArray();

    // Create indexes if they don't exist
    if (collections.length <= 1) {
      // Basic single field indexes
      await this.collection.createIndex({ car_id: 1 });
      await this.collection.createIndex({ project_id: 1 });
      await this.collection.createIndex({ type: 1 });
      await this.collection.createIndex({ start: 1 });
      await this.collection.createIndex({ created_by: 1 });
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

    // Add car_id filter
    if (query.car_id) {
      filter.car_id = query.car_id;
    }

    // Add project_id filter
    if (query.project_id) {
      filter.project_id = query.project_id;
    }

    // Add createdBy filter
    if (query.createdBy) {
      filter.created_by = query.createdBy;
    }

    // Add team member filter
    if (query.teamMemberIds) {
      if (typeof query.teamMemberIds === "string") {
        filter.teamMemberIds = { $in: [query.teamMemberIds] };
      } else {
        filter.teamMemberIds = {
          $in: query.teamMemberIds.$in,
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
        // Keep teamMemberIds as strings since they are Firebase UIDs
        updates.teamMemberIds = updates.teamMemberIds.map((id: any) =>
          typeof id === "string" ? id : String(id)
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
    // Helper function to safely convert to ISO string
    const toISOString = (
      date: Date | string | undefined
    ): string | undefined => {
      if (!date) return undefined;
      if (typeof date === "string") return date;
      if (date instanceof Date) return date.toISOString();
      return undefined;
    };

    return {
      id: dbEvent._id.toString(),
      car_id: dbEvent.car_id,
      project_id: dbEvent.project_id,
      type: dbEvent.type,
      title: dbEvent.title,
      description: dbEvent.description,
      url: dbEvent.url,
      start: toISOString(dbEvent.start) || new Date().toISOString(),
      end: toISOString(dbEvent.end),
      isAllDay: dbEvent.is_all_day || false,
      teamMemberIds: dbEvent.teamMemberIds || [],
      locationId: dbEvent.location_id?.toString(),
      primaryImageId: dbEvent.primary_image_id?.toString(),
      imageIds: dbEvent.image_ids?.map((id) => id.toString()) || [],
      createdBy: dbEvent.created_by,
      createdAt: toISOString(dbEvent.created_at) || new Date().toISOString(),
      updatedAt: toISOString(dbEvent.updated_at) || new Date().toISOString(),
    };
  }
}
