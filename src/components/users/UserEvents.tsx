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
import { EventType, EventStatus } from "@/types/event";
import { RefreshCw } from "lucide-react";

interface Event {
  id: string;
  car_id: string;
  type: EventType;
  description: string;
  status: EventStatus;
  start: string;
  end?: string;
  isAllDay?: boolean;
  assignees: string[];
  createdAt: string;
  updatedAt: string;
}

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
}

interface UserEventsProps {
  userName: string;
}

const EVENT_TYPES = Object.values(EventType);
const STATUSES = Object.values(EventStatus);

export default function UserEvents({ userName }: UserEventsProps) {
  const [events, setEvents] = useState<(Event & { car?: Car })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams({
        assignee: userName,
        sortField: "start",
        sortDirection: "asc",
      });

      if (search) params.append("search", search);
      if (status && status !== "all") params.append("status", status);
      if (type && type !== "all") params.append("type", type);

      const response = await fetch(`/api/events?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      const data = await response.json();

      // Fetch car details for each event
      const eventsWithCars = await Promise.all(
        data.map(async (event: Event) => {
          try {
            const carResponse = await fetch(`/api/cars/${event.car_id}`);
            if (carResponse.ok) {
              const carData = await carResponse.json();
              return { ...event, car: carData };
            }
            return event;
          } catch (error) {
            console.error(`Error fetching car for event ${event.id}:`, error);
            return event;
          }
        })
      );

      setEvents(eventsWithCars);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to fetch events",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (userName) {
      fetchEvents();
    }
  }, [userName, search, status, type]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchEvents();
  };

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case EventStatus.NOT_STARTED:
        return "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100";
      case EventStatus.IN_PROGRESS:
        return "bg-primary/10 text-primary";
      case EventStatus.COMPLETED:
        return "bg-green-100 dark:bg-green-800/20 text-green-700 dark:text-green-300";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100";
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assigned Events</CardTitle>
          <CardDescription>Loading events...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Assigned Events</CardTitle>
            <CardDescription>Events assigned to this user</CardDescription>
          </div>
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
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="search"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Search
              </label>
              <Input
                id="search"
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="status"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Status
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="type"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Type
              </label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatStatus(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <TableHead>Description</TableHead>
                  <TableHead>Car</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      {event.description}
                    </TableCell>
                    <TableCell>
                      {event.car
                        ? `${event.car.year} ${event.car.make} ${event.car.model}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>{formatStatus(event.type)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                          event.status
                        )}`}
                      >
                        {formatStatus(event.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {format(new Date(event.start), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell>
                      {event.end
                        ? format(new Date(event.end), "MMM d, yyyy h:mm a")
                        : "N/A"}
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
