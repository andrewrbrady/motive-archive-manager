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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";

interface EventsTabProps {
  carId: string;
}

export default function EventsTab({ carId }: EventsTabProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    type: EventType.CUSTOM,
    title: "",
    description: "",
    scheduled_date: "",
    status: EventStatus.SCHEDULED,
    is_milestone: false,
  });

  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/cars/${carId}/events`);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      toast.error("Failed to load events");
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [carId]);

  const handleAddEvent = async () => {
    try {
      const response = await fetch(`/api/cars/${carId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });

      if (!response.ok) throw new Error("Failed to create event");

      await fetchEvents();
      setIsAddingEvent(false);
      setNewEvent({
        type: EventType.CUSTOM,
        title: "",
        description: "",
        scheduled_date: "",
        status: EventStatus.SCHEDULED,
        is_milestone: false,
      });
      toast.success("Event added successfully");
    } catch (error) {
      toast.error("Failed to add event");
    }
  };

  const handleUpdateStatus = async (
    eventId: string,
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Events</h2>
        <Dialog open={isAddingEvent} onOpenChange={setIsAddingEvent}>
          <DialogTrigger asChild>
            <Button>Add Event</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Event Type</Label>
                <Select
                  value={newEvent.type}
                  onValueChange={(value) =>
                    setNewEvent({ ...newEvent, type: value as EventType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(EventType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={newEvent.title}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, title: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={newEvent.description}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, description: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Scheduled Date</Label>
                <Input
                  type="datetime-local"
                  value={newEvent.scheduled_date}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, scheduled_date: e.target.value })
                  }
                />
              </div>
              <Button onClick={handleAddEvent}>Add Event</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
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
  );
}
