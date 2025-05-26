"use client";

import { useState, useEffect } from "react";
import { Event, EventType, EventStatus } from "@/types/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CustomDropdown,
  LocationDropdown,
} from "@/components/ui/custom-dropdown";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Camera,
  Video,
  Search,
  Wrench,
  Sparkles,
  Package,
  Truck,
  MoreHorizontal,
  CircleDot,
  Play,
  CheckCircle,
} from "lucide-react";

interface EditEventDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (eventId: string, data: Partial<Event>) => void;
}

// Event type options with icons
const eventTypeOptions = [
  {
    value: EventType.PRODUCTION,
    label: "Production",
    icon: <Camera className="w-4 h-4 flex-shrink-0" />,
  },
  {
    value: EventType.POST_PRODUCTION,
    label: "Post Production",
    icon: <Video className="w-4 h-4 flex-shrink-0" />,
  },
  {
    value: EventType.MARKETING,
    label: "Marketing",
    icon: <Sparkles className="w-4 h-4 flex-shrink-0" />,
  },
  {
    value: EventType.INSPECTION,
    label: "Inspection",
    icon: <Search className="w-4 h-4 flex-shrink-0" />,
  },
  {
    value: EventType.DETAIL,
    label: "Detail",
    icon: <Wrench className="w-4 h-4 flex-shrink-0" />,
  },
  {
    value: EventType.PICKUP,
    label: "Pickup",
    icon: <Package className="w-4 h-4 flex-shrink-0" />,
  },
  {
    value: EventType.DELIVERY,
    label: "Delivery",
    icon: <Truck className="w-4 h-4 flex-shrink-0" />,
  },
  {
    value: EventType.OTHER,
    label: "Other",
    icon: <MoreHorizontal className="w-4 h-4 flex-shrink-0" />,
  },
];

// Event status options with icons
const eventStatusOptions = [
  {
    value: EventStatus.NOT_STARTED,
    label: "Not Started",
    icon: <CircleDot className="w-4 h-4 flex-shrink-0" />,
  },
  {
    value: EventStatus.IN_PROGRESS,
    label: "In Progress",
    icon: <Play className="w-4 h-4 flex-shrink-0" />,
  },
  {
    value: EventStatus.COMPLETED,
    label: "Completed",
    icon: <CheckCircle className="w-4 h-4 flex-shrink-0" />,
  },
];

export default function EditEventDialog({
  event,
  open,
  onOpenChange,
  onUpdate,
}: EditEventDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: EventType.PRODUCTION,
    status: EventStatus.NOT_STARTED,
    start: "",
    end: "",
    isAllDay: false,
    locationId: "",
  });

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      const startDate = new Date(event.start);
      const endDate = event.end ? new Date(event.end) : null;

      setFormData({
        title: event.title,
        description: event.description,
        type: event.type,
        status: event.status,
        start: event.isAllDay
          ? format(startDate, "yyyy-MM-dd")
          : format(startDate, "yyyy-MM-dd'T'HH:mm"),
        end: endDate
          ? event.isAllDay
            ? format(endDate, "yyyy-MM-dd")
            : format(endDate, "yyyy-MM-dd'T'HH:mm")
          : "",
        isAllDay: event.isAllDay || false,
        locationId: event.locationId || "",
      });
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!event) return;

    if (!formData.title.trim()) {
      toast.error("Please enter an event title");
      return;
    }

    if (!formData.start) {
      toast.error("Please select a start date/time");
      return;
    }

    try {
      const startDate = new Date(formData.start);
      const endDate = formData.end ? new Date(formData.end) : null;

      // Validate dates
      if (endDate && endDate <= startDate) {
        toast.error("End date/time must be after start date/time");
        return;
      }

      const eventData: Partial<Event> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        status: formData.status,
        start: startDate.toISOString(),
        end: endDate ? endDate.toISOString() : undefined,
        isAllDay: formData.isAllDay,
        locationId: formData.locationId || undefined,
      };

      onUpdate(event.id, eventData);
      handleClose();
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form
    setFormData({
      title: "",
      description: "",
      type: EventType.PRODUCTION,
      status: EventStatus.NOT_STARTED,
      start: "",
      end: "",
      isAllDay: false,
      locationId: "",
    });
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>Update the event details below.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-6 py-4">
            {/* ─────────────────────────────────────────────────────────────── */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Event Details
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter event title"
                  className="text-sm"
                  required
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter event description"
                  className="text-sm"
                  rows={3}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <LocationDropdown
                  value={formData.locationId}
                  onChange={(value) =>
                    setFormData({ ...formData, locationId: value })
                  }
                  placeholder="Select location"
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="type">Type *</Label>
                <CustomDropdown
                  value={formData.type}
                  onChange={(value) =>
                    setFormData({ ...formData, type: value as EventType })
                  }
                  options={eventTypeOptions}
                  placeholder="Select event type"
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status *</Label>
                <CustomDropdown
                  value={formData.status}
                  onChange={(value) =>
                    setFormData({ ...formData, status: value as EventStatus })
                  }
                  options={eventStatusOptions}
                  placeholder="Select event status"
                  className="w-full"
                />
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────── */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Schedule
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isAllDay"
                  checked={formData.isAllDay}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isAllDay: checked as boolean })
                  }
                />
                <Label htmlFor="isAllDay" className="text-sm">
                  All day event
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="start">
                    Start {formData.isAllDay ? "Date" : "Date & Time"} *
                  </Label>
                  <Input
                    id="start"
                    type={formData.isAllDay ? "date" : "datetime-local"}
                    value={formData.start}
                    onChange={(e) =>
                      setFormData({ ...formData, start: e.target.value })
                    }
                    className="text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="end">
                    End {formData.isAllDay ? "Date" : "Date & Time"}
                  </Label>
                  <Input
                    id="end"
                    type={formData.isAllDay ? "date" : "datetime-local"}
                    value={formData.end}
                    onChange={(e) =>
                      setFormData({ ...formData, end: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">Update Event</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
