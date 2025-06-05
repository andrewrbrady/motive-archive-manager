import { AuthGuard } from "@/components/auth/AuthGuard";
import { getMongoClient } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import EventsPageClient from "./EventsPageClient";

// Make this page dynamic to avoid build-time database issues
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Event {
  _id: string;
  type: string;
  car_id: string;
  date?: string;
  location?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
}

interface EventWithCar extends Event {
  car?: Car;
}

async function getEvents(): Promise<EventWithCar[]> {
  try {
    const mongoClient = await getMongoClient();
    const db = mongoClient.db(process.env.MONGODB_DB || "motive_archive");
    const eventsCollection = db.collection("events");
    const carsCollection = db.collection("cars");

    // Fetch all events
    const events = await eventsCollection.find({}).sort({ date: -1 }).toArray();

    // Get unique car IDs and fetch car details in a single query
    const carIds = [
      ...new Set(events.map((event: any) => event.car_id).filter(Boolean)),
    ];
    const cars = await carsCollection
      .find({
        _id: { $in: carIds.map((id: any) => new ObjectId(id)) },
      })
      .toArray();

    // Create a map for quick car lookup
    const carsMap = new Map(cars.map((car: any) => [car._id.toString(), car]));

    // Serialize events with car details
    const serializedEvents: EventWithCar[] = events.map((event: any) => ({
      _id: event._id.toString(),
      type: event.type || "",
      car_id: event.car_id || "",
      date: event.date
        ? event.date instanceof Date
          ? event.date.toISOString()
          : event.date
        : null,
      location: event.location || "",
      description: event.description || "",
      createdAt: event.createdAt
        ? event.createdAt instanceof Date
          ? event.createdAt.toISOString()
          : event.createdAt
        : null,
      updatedAt: event.updatedAt
        ? event.updatedAt instanceof Date
          ? event.updatedAt.toISOString()
          : event.updatedAt
        : null,
      car:
        event.car_id && carsMap.has(event.car_id)
          ? (() => {
              const carData: any = carsMap.get(event.car_id);
              return {
                _id: carData._id.toString(),
                make: carData.make || "",
                model: carData.model || "",
                year: carData.year || 0,
              };
            })()
          : undefined,
    }));

    return serializedEvents;
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <AuthGuard>
      <EventsPageClient initialEvents={events} />
    </AuthGuard>
  );
}
