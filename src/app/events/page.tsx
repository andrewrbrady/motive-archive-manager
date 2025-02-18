"use client";

import { useState, useEffect } from "react";
import { Event, EventStatus, EventType } from "@/types/event";
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
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { PageTitle } from "@/components/ui/PageTitle";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    from: "",
    to: "",
  });

  const fetchEvents = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append("status", filters.status);
      if (filters.type) queryParams.append("type", filters.type);
      if (filters.from) queryParams.append("from", filters.from);
      if (filters.to) queryParams.append("to", filters.to);

      const response = await fetch(`/api/events?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      toast.error("Failed to load events");
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  const handleUpdateStatus = async (
    eventId: string,
    carId: string,
    newStatus: EventStatus
  ) => {
    try {
      const response = await fetch(`/api/cars/${carId}/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update event");

      await fetchEvents();
      toast.success("Event status updated");
    } catch (error) {
      toast.error("Failed to update event status");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <PageTitle title="All Events" />

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  {Object.values(EventStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                  <SelectItem value="">All Types</SelectItem>
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

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Car</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event._id.toString()}>
                  <TableCell>
                    <Link
                      href={`/cars/${event.car_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View Car
                    </Link>
                  </TableCell>
                  <TableCell>{event.type.replace(/_/g, " ")}</TableCell>
                  <TableCell>{event.title}</TableCell>
                  <TableCell>{event.description}</TableCell>
                  <TableCell>
                    {format(new Date(event.scheduled_date), "PPp")}
                  </TableCell>
                  <TableCell>{event.status}</TableCell>
                  <TableCell>
                    <Select
                      value={event.status}
                      onValueChange={(value) =>
                        handleUpdateStatus(
                          event._id.toString(),
                          event.car_id.toString(),
                          value as EventStatus
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(EventStatus).map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
      <Footer />
    </div>
  );
}
