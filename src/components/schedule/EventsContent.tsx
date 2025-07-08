"use client";

import { useState, useEffect } from "react";
import { Event, EventType } from "@/types/event";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import EventBatchTemplates from "@/components/events/EventBatchTemplates";
import EventBatchManager from "@/components/events/EventBatchManager";
import { LoadingSpinner } from "@/components/ui/loading";
import { ObjectId } from "mongodb";
import { formatEventDateTime } from "@/lib/dateUtils";

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
}

interface EventWithCar extends Event {
  car?: Car;
  _id?: string;
  start_date?: string;
  end_date?: string;
}

export default function EventsContent() {
  const [events, setEvents] = useState<EventWithCar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "",
    from: "",
    to: "",
  });

  const formatEventType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatDate = (dateString: string | undefined | null) => {
    return formatEventDateTime(dateString);
  };

  // Helper function to check if an ID is a valid MongoDB ObjectId
  function isValidObjectId(id: string): boolean {
    return ObjectId.isValid(id);
  }

  // Get car ID from event - use the actual car_id field, not derived from event ID
  const getCarId = (event: EventWithCar) => {
    // Use the car_id field if available and valid
    if (event.car_id && isValidObjectId(event.car_id)) {
      return event.car_id;
    }

    // If car object is available, use its _id
    if (event.car?._id && isValidObjectId(event.car._id)) {
      return event.car._id;
    }

    // Return null if no valid car ID is found
    return null;
  };

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.type) queryParams.append("type", filters.type);
      if (filters.from) queryParams.append("from", filters.from);
      if (filters.to) queryParams.append("to", filters.to);

      const response = await fetch(`/api/events?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();

      // Performance optimization: Group events by car_id to reduce API calls
      const carIdToEvents = new Map<string, Event[]>();
      const eventsWithoutCarId: Event[] = [];

      // Group events by car_id
      data.forEach((event: Event) => {
        if (event.car_id) {
          if (!carIdToEvents.has(event.car_id)) {
            carIdToEvents.set(event.car_id, []);
          }
          const events = carIdToEvents.get(event.car_id);
          if (events) {
            events.push(event);
          }
        } else {
          eventsWithoutCarId.push(event);
        }
      });

      // Fetch car information in parallel
      const carPromises = Array.from(carIdToEvents.keys()).map(
        async (carId) => {
          try {
            const carResponse = await fetch(`/api/cars/${carId}`);
            if (!carResponse.ok)
              throw new Error(`Failed to fetch car ${carId}`);
            const car = await carResponse.json();
            return { carId, car };
          } catch (error) {
            console.error(`Error fetching car ${carId}:`, error);
            return { carId, car: null };
          }
        }
      );

      // Wait for all car fetches to complete
      const carsResults = await Promise.all(carPromises);

      // Create a map of car_id to car data
      const carIdToCarData = new Map();
      carsResults.forEach(({ carId, car }) => {
        carIdToCarData.set(carId, car);
      });

      // Combine events with their car data
      const eventsWithCars: EventWithCar[] = [];
      carIdToEvents.forEach((events, carId) => {
        const car = carIdToCarData.get(carId);
        events.forEach((event: Event) => {
          eventsWithCars.push({ ...event, car });
        });
      });

      // Add events without car_id
      eventsWithoutCarId.forEach((event: Event) => {
        eventsWithCars.push(event);
      });

      setEvents(eventsWithCars);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center gap-2">
        <EventBatchManager />
        <EventBatchTemplates
          carId={events[0]?.car_id || ""}
          onEventsCreated={fetchEvents}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          value={filters.type}
          onValueChange={(value) => setFilters({ ...filters, type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            {Object.values(EventType).map((type) => (
              <SelectItem key={type} value={type}>
                {formatEventType(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          placeholder="From Date"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          className="bg-background"
        />

        <Input
          type="date"
          placeholder="To Date"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          className="bg-background"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Car</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event._id}>
                  <TableCell>
                    {event.car
                      ? (() => {
                          const carId = getCarId(event);
                          return carId ? (
                            <Link
                              href={`/cars/${carId}`}
                              className="hover:underline"
                            >
                              {event.car.year} {event.car.make}{" "}
                              {event.car.model}
                            </Link>
                          ) : (
                            <span>
                              {event.car.year} {event.car.make}{" "}
                              {event.car.model}
                            </span>
                          );
                        })()
                      : "Unknown Car"}
                  </TableCell>
                  <TableCell>{formatEventType(event.type)}</TableCell>
                  <TableCell>{formatDate(event.start_date)}</TableCell>
                  <TableCell>{formatDate(event.end_date)}</TableCell>
                  <TableCell>
                    {(() => {
                      const carId = getCarId(event);
                      return carId ? (
                        <Link href={`/cars/${carId}/events/${event._id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="ghost" size="sm" disabled>
                          View
                        </Button>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
