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
import { toast } from "react-hot-toast";
import { BatchTemplate } from "@/types/deliverable";
import { addDays } from "date-fns";

interface BatchDeliverableFormProps {
  carId: string;
  onDeliverableCreated?: () => void;
}

export default function BatchDeliverableForm({
  carId,
  onDeliverableCreated,
}: BatchDeliverableFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState<Record<string, BatchTemplate>>({});

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/batch-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to fetch templates");
    }
  };

  const handleSubmit = async () => {
    if (!selectedBatch) {
      toast.error("Please select a batch template");
      return;
    }

    setIsSubmitting(true);

    try {
      const batch = templates[selectedBatch];
      const baseDate = new Date();

      // Create all deliverables in the batch
      const promises = batch.templates.map((template) => {
        const deliverableData = {
          ...template,
          edit_deadline: addDays(baseDate, 7).toISOString(), // One week from now
          release_date: addDays(baseDate, 9).toISOString(), // One week + 2 days from now
          editor: "", // Will be assigned later
          status: "not_started",
          tags: [],
          edit_dates: [],
        };

        return fetch(`/api/cars/${carId}/deliverables`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deliverableData),
        });
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
