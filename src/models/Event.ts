import { Collection, Db, ObjectId, Filter } from "mongodb";
import { Event, EventType, DbEvent } from "@/types/event";

type EventQuery = {
  type?: EventType;
  teamMemberIds?: string | { $in: string[] };
  carId?: string;
  projectId?: string;
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
      await this.collection.createIndex({ carId: 1 });
      await this.collection.createIndex({ projectId: 1 });
      await this.collection.createIndex({ type: 1 });
      await this.collection.createIndex({ start: 1 });
      await this.collection.createIndex({ createdBy: 1 });
      await this.collection.createIndex({ createdAt: -1 });
      await this.collection.createIndex({ teamMemberIds: 1 });
    }
  }

  async create(event: Omit<DbEvent, "_id" | "createdAt" | "updatedAt">) {
    const now = new Date();
    const newEvent = {
      ...event,
      createdAt: now,
      updatedAt: now,
      teamMemberIds: event.teamMemberIds || [],
    };

    const result = await this.collection.insertOne(newEvent as DbEvent);
    return result.insertedId;
  }

  async findById(id: ObjectId) {
    return await this.collection.findOne({ _id: id });
  }

  async findByCarId(carId: string, options: { limit?: number } = {}) {
    const filter = this.buildCarMatchFilter(carId);

    const limit = options.limit ?? 500;

    let cursor = this.collection.find(filter).sort({ start: 1 });

    if (limit && limit > 0) {
      cursor = cursor.limit(limit);
    }

    return cursor.toArray();
  }

  async findByProjectId(projectId: string) {
    const events = await this.collection
      .find({ projectId })
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

    // Add carId filter
    if (query.carId) {
      filter.carId = query.carId;
    }

    // Add projectId filter
    if (query.projectId) {
      filter.projectId = query.projectId;
    }

    // Add createdBy filter
    if (query.createdBy) {
      filter.createdBy = query.createdBy;
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
      if (updates.updatedAt && !(updates.updatedAt instanceof Date)) {
        updates.updatedAt = new Date(updates.updatedAt);
      }

      const result = await this.collection.updateOne(
        { _id: id },
        {
          $set: {
            ...updates,
            // Always update the updated_at timestamp
            updatedAt: updates.updatedAt || new Date(),
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

    const primaryCarId = dbEvent.carId
      ? typeof dbEvent.carId === "string"
        ? dbEvent.carId
        : dbEvent.carId.toString()
      : undefined;

    const legacyCarId = dbEvent.car_id
      ? typeof dbEvent.car_id === "string"
        ? dbEvent.car_id
        : dbEvent.car_id.toString()
      : undefined;

    return {
      id: dbEvent._id.toString(),
      car_id: primaryCarId || legacyCarId,
      project_id: dbEvent.projectId,
      type: dbEvent.type,
      title: dbEvent.title,
      description: dbEvent.description,
      url: dbEvent.url,
      start: toISOString(dbEvent.start) || new Date().toISOString(),
      end: toISOString(dbEvent.end),
      isAllDay: dbEvent.isAllDay || false,
      teamMemberIds: dbEvent.teamMemberIds || [],
      locationId: dbEvent.locationId?.toString(),
      primaryImageId: dbEvent.primaryImageId?.toString(),
      imageIds: dbEvent.imageIds?.map((id) => id.toString()) || [],
      createdBy: dbEvent.createdBy,
      createdAt: toISOString(dbEvent.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(dbEvent.updatedAt) || new Date().toISOString(),
    };
  }

  private buildCarMatchFilter(carId: string): Filter<DbEvent> {
    if (!carId) {
      return {};
    }

    const filters: Filter<DbEvent>[] = [{ carId } as Filter<DbEvent>];

    if (ObjectId.isValid(carId)) {
      const objectId = new ObjectId(carId);
      filters.push({ carId: objectId } as Filter<DbEvent>);
      filters.push({ car_id: objectId } as Filter<DbEvent>);
    }

    filters.push({ car_id: carId } as Filter<DbEvent>);

    return ({ $or: filters } as unknown) as Filter<DbEvent>;
  }
}
