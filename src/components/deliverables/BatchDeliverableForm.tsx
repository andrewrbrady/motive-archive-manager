"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { useAPI } from "@/hooks/useAPI";
import { addDays, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import "react-day-picker/dist/style.css";

interface BatchDeliverableFormProps {
  carId: string;
  onDeliverableCreated?: () => void;
}

// Define batch interface locally
interface DeliverableTemplate {
  title: string;
  platform_id?: string;
  platform?: string; // Legacy field
  mediaTypeId?: string;
  type?: string; // Legacy field
  duration?: number;
  aspect_ratio: string;
}

interface BatchTemplate {
  name: string;
  templates: DeliverableTemplate[];
}

export default function BatchDeliverableForm({
  carId,
  onDeliverableCreated,
}: BatchDeliverableFormProps) {
  const api = useAPI();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<Record<string, BatchTemplate>>({});

  useEffect(() => {
    if (isOpen && api) {
      fetchTemplates();
    }
  }, [isOpen, api]);

  const fetchTemplates = async () => {
    if (!api) return;
    try {
      const data = (await api.get("batch-templates")) as BatchTemplatesResponse;
      setTemplates(data.templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to fetch templates");
    }
  };

  // Improved date validation
  const isValidDate = (date: Date | null | undefined): boolean => {
    return date != null && date instanceof Date && !isNaN(date.getTime());
  };

  // Enhanced safe date addition function
  const safeAddDays = (date: Date | null | undefined, days: number): Date => {
    if (!isValidDate(date)) {
      return new Date(); // Return current date as fallback
    }
    try {
      return addDays(date as Date, days);
    } catch (error) {
      console.error("Error adding days to date:", error);
      return new Date();
    }
  };

  // Safe date formatting function
  const safeFormat = (
    date: Date | null | undefined,
    formatStr: string
  ): string => {
    try {
      if (!isValidDate(date)) return "Invalid Date";
      return format(date as Date, formatStr);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  const handleSubmit = async () => {
    if (!selectedBatch) {
      toast.error("Please select a batch template");
      return;
    }

    if (!isValidDate(startDate)) {
      toast.error("Please select a valid start date");
      return;
    }

    if (!api) return;

    setIsSubmitting(true);

    try {
      const batch = templates[selectedBatch];

      // Create all deliverables in the batch
      const promises = batch.templates.map((template) => {
        const deadlineDate = safeAddDays(startDate, template.daysUntilDeadline);
        const releaseDate =
          typeof template.daysUntilRelease === "number"
            ? safeAddDays(startDate, template.daysUntilRelease)
            : undefined;

        if (!isValidDate(deadlineDate)) {
          throw new Error("Invalid deadline date calculation");
        }

        if (releaseDate && !isValidDate(releaseDate)) {
          throw new Error("Invalid release date calculation");
        }

        const deliverableData = {
          ...template,
          edit_deadline: deadlineDate.toISOString(),
          release_date: releaseDate?.toISOString(),
          editor: "",
          status: "not_started",
          tags: [],
          edit_dates: [],
        };

        return api.post(`cars/${carId}/deliverables`, deliverableData);
      });

      await Promise.all(promises);

      toast.success("Batch created successfully");
      setIsOpen(false);
      onDeliverableCreated?.();
    } catch (error) {
      console.error("Error creating batch:", error);
      toast.error("Failed to create batch");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Create Batch</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Deliverable Batch</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Batch Template</label>
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(templates).map(([key, batch]) => (
                  <SelectItem key={key} value={key}>
                    {batch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 z-50"
                align="start"
                sideOffset={4}
                side="bottom"
              >
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                  className="rounded-md border"
                  disabled={(date) =>
                    date < new Date(new Date().setHours(0, 0, 0, 0))
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          {selectedBatch && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Deliverables in this batch:
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {templates[selectedBatch].templates.map((template, index) => (
                  <li key={index} className="text-sm">
                    {template.title} - {template.platform} ({template.type}
                    {template.duration ? ` - ${template.duration}s` : ""})
                    <div className="ml-6 text-xs text-muted-foreground">
                      Deadline: Day {template.daysUntilDeadline} (
                      {safeFormat(
                        safeAddDays(startDate, template.daysUntilDeadline),
                        "PP"
                      )}
                      )
                      {typeof template.daysUntilRelease === "number" && (
                        <>
                          <br />
                          Release: Day {template.daysUntilRelease} (
                          {safeFormat(
                            safeAddDays(startDate, template.daysUntilRelease),
                            "PP"
                          )}
                          )
                        </>
                      )}
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
            {isSubmitting ? "Creating..." : "Create Batch"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
