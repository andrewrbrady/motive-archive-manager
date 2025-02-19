import { Collection, Db, ObjectId } from "mongodb";
import { Event, EventStatus, EventType } from "@/types/event";

interface DbEvent extends Omit<Event, "id"> {
  _id: ObjectId;
  car_id: string;
  created_at: Date;
  updated_at: Date;
  scheduled_date: string;
  end_date?: string;
  is_all_day?: boolean;
}

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
    const result = await this.collection.insertOne({
      ...event,
      _id: new ObjectId(),
      created_at: new Date(),
      updated_at: new Date(),
    });
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

  async findAll(query: Partial<DbEvent> = {}): Promise<DbEvent[]> {
    return this.collection
      .find(query)
      .sort({ scheduled_date: 1, created_at: -1 })
      .toArray();
  }

  async update(id: ObjectId, updates: Partial<Omit<DbEvent, "_id">>) {
    const result = await this.collection.updateOne(
      { _id: id },
      { $set: { ...updates, updated_at: new Date() } }
    );
    return result.matchedCount > 0;
  }

  async delete(id: ObjectId) {
    const result = await this.collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async updateStatus(id: ObjectId, status: EventStatus): Promise<boolean> {
    return this.update(id, { status });
  }
}
