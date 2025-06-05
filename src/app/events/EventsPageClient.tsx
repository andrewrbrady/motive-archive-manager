"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/hooks/useFirebaseAuth";
import { useAuthenticatedFetch } from "@/hooks/useFirebaseAuth";
import { EventType } from "@/types/event";
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
import { PageTitle } from "@/components/ui/PageTitle";
import EventBatchTemplates from "@/components/events/EventBatchTemplates";
import EventBatchManager from "@/components/events/EventBatchManager";

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
}

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

interface EventWithCar extends Event {
  car?: Car;
}

interface EventsPageClientProps {
  initialEvents: EventWithCar[];
}

export default function EventsPageClient({
  initialEvents,
}: EventsPageClientProps) {
  const { data: session } = useSession();
  const { authenticatedFetch } = useAuthenticatedFetch();
  const [events, setEvents] = useState<EventWithCar[]>(initialEvents);
  const [isLoading, setIsLoading] = useState(false);
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
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "-";
      }
      return format(date, "PPp");
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "-";
    }
  };

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.type) queryParams.append("type", filters.type);
      if (filters.from) queryParams.append("from", filters.from);
      if (filters.to) queryParams.append("to", filters.to);

      const response = await authenticatedFetch(
        `/api/events?${queryParams.toString()}`
      );
      const data = await response.json();

      // Fetch car information for each event
      const eventsWithCars = await Promise.all(
        data.map(async (event: any) => {
          try {
            const carId = event.car_id;
            if (!carId) {
              console.error("No car_id found for event:", event);
              return event;
            }
            const carResponse = await authenticatedFetch(`/api/cars/${carId}`);
            const car = await carResponse.json();
            return { ...event, car };
          } catch (error) {
            console.error("Error fetching car:", error);
            return event;
          }
        })
      );

      setEvents(eventsWithCars);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only refetch when filters change and we have session
    if (session?.user && (filters.type || filters.from || filters.to)) {
      fetchEvents();
    }
  }, [filters, session]);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <PageTitle title="All Events" />
            <div className="flex gap-2">
              <EventBatchManager />
              <EventBatchTemplates
                carId={events[0]?.car_id || ""}
                onEventsCreated={fetchEvents}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Select
                value={filters.type}
                onValueChange={(value) =>
                  setFilters({ ...filters, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.values(EventType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Input
                type="date"
                placeholder="From Date"
                value={filters.from}
                onChange={(e) =>
                  setFilters({ ...filters, from: e.target.value })
                }
              />
            </div>

            <div>
              <Input
                type="date"
                placeholder="To Date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <div className="w-full h-12 bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] animate-pulse rounded-lg" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-full h-16 bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] animate-pulse rounded-lg"
                  />
                ))}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Car</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event._id}>
                    <TableCell>
                      {event.car ? (
                        <Link
                          href={`/cars/${event.car._id}?tab=events`}
                          className="text-info-600 hover:underline"
                        >
                          {`${event.car.year} ${event.car.make} ${event.car.model}`}
                        </Link>
                      ) : (
                        "Loading..."
                      )}
                    </TableCell>
                    <TableCell>{formatEventType(event.type)}</TableCell>
                    <TableCell>{event.description}</TableCell>
                    <TableCell>{formatDate(event.date)}</TableCell>
                    <TableCell>{formatDate(event.date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}
