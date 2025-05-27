"use client";

import { useState, useEffect } from "react";
import { Event, EventType } from "@/types/event";
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
import { LocationDropdown } from "@/components/ui/custom-dropdown";
import { toast } from "sonner";
import { format } from "date-fns";
import { EventTypeSelector } from "./EventTypeSelector";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { TeamMemberPicker } from "@/components/ui/team-member-picker";
import { CustomCheckbox } from "@/components/ui/custom-checkbox";

interface EditEventDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (eventId: string, data: Partial<Event>) => void;
}

export default function EditEventDialog({
  event,
  open,
  onOpenChange,
  onUpdate,
}: EditEventDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    url: "",
    type: EventType.DETAIL,
    start: "",
    end: "",
    isAllDay: false,
    locationId: "",
    teamMemberIds: [] as string[],
  });

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      const startDate = new Date(event.start);
      const endDate = event.end ? new Date(event.end) : null;

      setFormData({
        title: event.title,
        description: event.description,
        url: event.url || "",
        type: event.type,
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
        teamMemberIds: event.teamMemberIds || [],
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
        url: formData.url.trim() || undefined,
        type: formData.type,
        start: startDate.toISOString(),
        end: endDate ? endDate.toISOString() : undefined,
        isAllDay: formData.isAllDay,
        locationId: formData.locationId || undefined,
        teamMemberIds: formData.teamMemberIds,
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
      url: "",
      type: EventType.DETAIL,
      start: "",
      end: "",
      isAllDay: false,
      locationId: "",
      teamMemberIds: [],
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
                <Label
                  htmlFor="title"
                  className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                >
                  Title *
                </Label>
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
                  placeholder="Enter event description"
                  className="text-sm"
                  rows={3}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label
                  htmlFor="url"
                  className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                >
                  URL
                </Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  placeholder="https://example.com"
                  className="text-sm"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
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

              <div className="col-span-2 space-y-1.5">
                <EventTypeSelector
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as EventType })
                  }
                  label="Type *"
                  placeholder="Select event type"
                  required
                  className="space-y-1.5"
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
                  Team
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                Team Members
              </Label>
              <TeamMemberPicker
                selectedMemberIds={formData.teamMemberIds}
                onSelectionChange={(memberIds: string[]) =>
                  setFormData({ ...formData, teamMemberIds: memberIds })
                }
                placeholder="Select team members"
              />
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
              <CustomCheckbox
                id="isAllDay"
                checked={formData.isAllDay}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isAllDay: checked as boolean })
                }
                label="All day event"
              />

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="start"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Start {formData.isAllDay ? "Date" : "Date & Time"} *
                  </Label>
                  <DateTimePicker
                    value={formData.start}
                    onChange={(value) =>
                      setFormData({ ...formData, start: value })
                    }
                    className="text-sm"
                    required
                    isAllDay={formData.isAllDay}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="end"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    End {formData.isAllDay ? "Date" : "Date & Time"}
                  </Label>
                  <DateTimePicker
                    value={formData.end}
                    onChange={(value) =>
                      setFormData({ ...formData, end: value })
                    }
                    className="text-sm"
                    isAllDay={formData.isAllDay}
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
