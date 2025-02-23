import { useState, useEffect } from "react";
import { toast } from "sonner";
import { EventType, EventStatus } from "@/types/event";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { addDays } from "date-fns";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";

interface EventTemplate {
  type: EventType;
  description: string;
  daysFromStart: number;
  hasEndDate?: boolean;
  daysUntilEnd?: number;
  isAllDay?: boolean;
}

interface BatchTemplate {
  name: string;
  events: EventTemplate[];
}

interface EventBatchTemplatesProps {
  carId: string;
  onEventsCreated: () => void;
}

export default function EventBatchTemplates({
  carId,
  onEventsCreated,
}: EventBatchTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<Record<string, BatchTemplate>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/event-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to fetch templates");
    }
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    setIsSubmitting(true);
    const template = templates[selectedTemplate];
    // Create a date at the start of the selected day in the local timezone
    const baseDate = new Date(startDate + "T00:00:00.000");

    try {
      // Create all events in the batch
      const promises = template.events.map((event) => {
        const startEventDate = addDays(baseDate, event.daysFromStart);
        const endEventDate = event.hasEndDate
          ? addDays(startEventDate, event.daysUntilEnd || 0)
          : undefined;

        // Ensure we're using the full ISO string with the local timezone
        const startISOString = format(
          startEventDate,
          "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
        );
        const endISOString = endEventDate
          ? format(endEventDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
          : undefined;

        return fetch(`/api/cars/${carId}/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: event.type,
            description: event.description,
            status: EventStatus.NOT_STARTED,
            start: startISOString,
            end: endISOString,
            isAllDay: event.isAllDay,
            car_id: carId,
          }),
        });
      });

      await Promise.all(promises);
      toast.success("Events created successfully");
      onEventsCreated();
      setIsOpen(false);
      setSelectedTemplate("");
    } catch (error) {
      console.error("Error creating events:", error);
      toast.error("Failed to create events");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="whitespace-nowrap">
          <CalendarDays className="w-4 h-4 mr-2" />
          Create from Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Events from Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Template</label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(templates).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {selectedTemplate && (
              <div className="space-y-2 border rounded-lg p-4 bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))]">
                <h3 className="text-sm font-medium">Events to be created:</h3>
                <ul className="space-y-2">
                  {templates[selectedTemplate].events.map((event, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <div className="w-4 h-4 mt-1 flex-shrink-0">
                        <div className="w-2 h-2 bg-info-500 rounded-full" />
                      </div>
                      <div>
                        <span className="font-medium">
                          {event.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                          {" - "}
                          {event.description}
                        </span>
                        <div className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                          {event.daysFromStart === 0
                            ? "Starts on base date"
                            : `Starts ${event.daysFromStart} days from base date`}
                          {event.hasEndDate &&
                            ` (${event.daysUntilEnd} days duration)`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Events"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
