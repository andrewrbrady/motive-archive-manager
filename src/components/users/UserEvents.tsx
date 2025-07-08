"use client";

import { useState, useEffect, useCallback } from "react";
import { useAPI } from "@/hooks/useAPI";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "@/components/ui/use-toast";
import { EventType } from "@/types/event";
import { RefreshCw } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";
import Link from "next/link";
import { formatEventDateTime } from "@/lib/dateUtils";

interface Event {
  _id: string;
  car_id: string;
  type: EventType;
  title: string;
  description: string;
  start_date: string;
  end_date?: string;
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

interface UserEventsProps {
  userId: string;
}

const EVENT_TYPES = Object.values(EventType);

// Helper function to check if an ID is a valid MongoDB ObjectId
function isValidObjectId(id: string): boolean {
  // Simple validation for MongoDB ObjectId format (24 character hex string)
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export default function UserEvents({ userId }: UserEventsProps) {
  const api = useAPI();
  const [events, setEvents] = useState<EventWithCar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    type: "",
    from: "",
    to: "",
  });

  const formatEventType = (eventType: string) => {
    return eventType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatDate = (dateString: string | undefined | null) => {
    return formatEventDateTime(dateString);
  };

  const fetchEvents = useCallback(async () => {
    if (!api) return;

    try {
      console.time("UserEvents.fetchEvents");
      setIsLoading(true);

      const queryParams = new URLSearchParams();
      queryParams.append("userId", userId);
      if (filters.type) queryParams.append("type", filters.type);
      if (filters.from) queryParams.append("from", filters.from);
      if (filters.to) queryParams.append("to", filters.to);

      // ✅ NUCLEAR AUTH FIX: Replace unauthenticated fetch with useAPI
      const data = (await api.get(
        `/api/events?${queryParams.toString()}`
      )) as Event[];

      // ✅ PERFORMANCE OPTIMIZATION: Batch car fetches to reduce N+1 queries
      const uniqueCarIds = [...new Set(data.map((event) => event.car_id))];

      // Fetch all cars in parallel instead of N individual requests
      const carPromises = uniqueCarIds.map(async (carId) => {
        try {
          // ✅ NUCLEAR AUTH FIX: Replace unauthenticated fetch with useAPI
          const car = (await api.get(`cars/${carId}`)) as Car;
          return { carId, car };
        } catch (error) {
          console.error(`Error fetching car ${carId}:`, error);
          return { carId, car: null };
        }
      });

      const carResults = await Promise.all(carPromises);
      const carMap = new Map(
        carResults.map((result) => [result.carId, result.car])
      );

      // Map events with their corresponding cars
      const eventsWithCars: EventWithCar[] = data.map((event) => ({
        ...event,
        car: carMap.get(event.car_id) || undefined,
      }));

      setEvents(eventsWithCars);
      console.timeEnd("UserEvents.fetchEvents");
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [api, userId, filters]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRefresh = useCallback(async () => {
    if (!api) return;

    setIsRefreshing(true);
    await fetchEvents();
  }, [api, fetchEvents]);

  // ✅ LOADING STATE: Handle in JSX instead of early return (following Session 5.1 lesson)
  return (
    <Card>
      <CardContent>
        {!api ? (
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            <span>Initializing...</span>
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            <span>Loading events...</span>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing || !api}
                className={isRefreshing ? "animate-spin" : ""}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {/* Filters */}
            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="type"
                    className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]"
                  >
                    Type
                  </label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) =>
                      setFilters({ ...filters, type: value })
                    }
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {formatEventType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="from"
                    className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]"
                  >
                    From Date
                  </label>
                  <Input
                    type="date"
                    placeholder="From Date"
                    value={filters.from}
                    onChange={(e) =>
                      setFilters({ ...filters, from: e.target.value })
                    }
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="to"
                    className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]"
                  >
                    To Date
                  </label>
                  <Input
                    type="date"
                    placeholder="To Date"
                    value={filters.to}
                    onChange={(e) =>
                      setFilters({ ...filters, to: e.target.value })
                    }
                    className="bg-background"
                  />
                </div>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No events found
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Car</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event._id}>
                        <TableCell>
                          {event.car ? (
                            isValidObjectId(event.car_id) ? (
                              <Link
                                href={`/cars/${event.car_id}`}
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
                            )
                          ) : (
                            "Unknown Car"
                          )}
                        </TableCell>
                        <TableCell>{formatEventType(event.type)}</TableCell>
                        <TableCell>{event.title}</TableCell>
                        <TableCell>{formatDate(event.start_date)}</TableCell>
                        <TableCell>{formatDate(event.end_date)}</TableCell>
                        <TableCell>
                          {isValidObjectId(event.car_id) ? (
                            <Link
                              href={`/cars/${event.car_id}/events/${event._id}`}
                            >
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                          ) : (
                            <Button variant="ghost" size="sm" disabled>
                              View
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
