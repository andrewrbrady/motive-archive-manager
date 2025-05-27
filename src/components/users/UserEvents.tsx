"use client";

import { useState, useEffect } from "react";
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

export default function UserEvents({ userId }: UserEventsProps) {
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
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
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
      queryParams.append("userId", userId);
      if (filters.type) queryParams.append("type", filters.type);
      if (filters.from) queryParams.append("from", filters.from);
      if (filters.to) queryParams.append("to", filters.to);

      const response = await fetch(`/api/events?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();

      // Fetch car information for each event
      const eventsWithCars = await Promise.all(
        data.map(async (event: Event) => {
          try {
            const carResponse = await fetch(`/api/cars/${event.car_id}`);
            if (!carResponse.ok) throw new Error("Failed to fetch car");
            const car = await carResponse.json();
            return { ...event, car };
          } catch (error) {
            console.error(`Error fetching car ${event.car_id}:`, error);
            return event;
          }
        })
      );

      setEvents(eventsWithCars);
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
  };

  useEffect(() => {
    fetchEvents();
  }, [userId, filters]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchEvents();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          <span>Loading events...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
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
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
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
                        <Link
                          href={`/cars/${event.car_id}`}
                          className="hover:underline"
                        >
                          {event.car.year} {event.car.make} {event.car.model}
                        </Link>
                      ) : (
                        "Unknown Car"
                      )}
                    </TableCell>
                    <TableCell>{formatEventType(event.type)}</TableCell>
                    <TableCell>{event.title}</TableCell>
                    <TableCell>{formatDate(event.start_date)}</TableCell>
                    <TableCell>{formatDate(event.end_date)}</TableCell>
                    <TableCell>
                      <Link href={`/cars/${event.car_id}/events/${event._id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
