"use client";

import { useState } from "react";
import { Event, EventType } from "@/types/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CustomDropdown,
  LocationDropdown,
} from "@/components/ui/custom-dropdown";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { EventTypeSelector } from "@/components/events/EventTypeSelector";
import { Checkbox } from "@/components/ui/checkbox";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: Partial<Event>) => Promise<void>;
  carId: string;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  onCreate,
  carId,
}: CreateEventDialogProps) {
  const [formData, setFormData] = useState({
    type: EventType.DETAIL,
    title: "",
    description: "",
    url: "",
    start: "",
    end: "",
    isAllDay: false,
    locationId: "",
    teamMemberIds: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!formData.start) {
      toast.error("Start date is required");
      return;
    }

    try {
      await onCreate({
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        url: formData.url.trim() || undefined,
        locationId: formData.locationId || undefined,
        car_id: carId,
      });

      // Reset form after successful creation
      setFormData({
        type: EventType.DETAIL,
        title: "",
        description: "",
        url: "",
        start: "",
        end: "",
        isAllDay: false,
        locationId: "",
        teamMemberIds: [],
      });
    } catch (error) {
      // Error handling is done in the parent component
      console.error("Error in form submission:", error);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form when closing
    setFormData({
      type: EventType.DETAIL,
      title: "",
      description: "",
      url: "",
      start: "",
      end: "",
      isAllDay: false,
      locationId: "",
      teamMemberIds: [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
        <DialogHeader className="flex-shrink-0 pb-2 border-b border-[hsl(var(--border-subtle))]">
          <DialogTitle className="text-xl font-bold text-[hsl(var(--foreground))] dark:text-white">
            Create New Event
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-1">
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                  Basic Information
                </span>
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="title"
                  className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                >
                  Title
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Event title"
                  required
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                >
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Event description"
                  className="text-sm"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="url"
                  className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                >
                  URL (Optional)
                </Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  placeholder="Event URL"
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="location"
                  className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                >
                  Location
                </Label>
                <LocationDropdown
                  value={formData.locationId}
                  onChange={(value) =>
                    setFormData({ ...formData, locationId: value })
                  }
                  placeholder="Select location"
                  className="w-full"
                />
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-1">
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                  Schedule
                </span>
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="start"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Start Date & Time
                  </Label>
                  <DateTimePicker
                    value={formData.start}
                    onChange={(value) =>
                      setFormData({ ...formData, start: value })
                    }
                    placeholder="Select start date and time"
                    isAllDay={formData.isAllDay}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="end"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    End Date & Time
                  </Label>
                  <DateTimePicker
                    value={formData.end}
                    onChange={(value) =>
                      setFormData({ ...formData, end: value })
                    }
                    placeholder="Select end date and time"
                    isAllDay={formData.isAllDay}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allDay"
                  checked={formData.isAllDay}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isAllDay: checked === true })
                  }
                />
                <Label htmlFor="allDay" className="text-sm font-normal">
                  All Day Event
                </Label>
              </div>
            </div>

            {/* Type Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-1">
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                  Type
                </span>
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Event Type
                </Label>
                <EventTypeSelector
                  value={formData.type}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, type: value as EventType })
                  }
                  label=""
                />
              </div>
            </div>
          </form>
        </div>

        <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border-subtle))]">
          <Button variant="outline" onClick={handleClose} size="sm">
            Cancel
          </Button>
          <Button onClick={handleSubmit} size="sm">
            Create Event
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateEventDialog;
