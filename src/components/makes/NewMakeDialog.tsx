"use client";

import React, { useState } from "react";
import { Make } from "@/lib/fetchMakes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";

interface NewMakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (make: Partial<Make>) => void;
}

const MAKE_TYPES = [
  "Luxury",
  "Sports",
  "Economy",
  "SUV",
  "Truck",
  "Motorcycle",
  "Commercial",
  "Electric",
  "Hybrid",
];

export default function NewMakeDialog({
  open,
  onOpenChange,
  onSubmit,
}: NewMakeDialogProps) {
  const [formData, setFormData] = useState<Partial<Make>>({
    name: "",
    country_of_origin: "",
    founded: undefined,
    type: [],
    parent_company: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      name: "",
      country_of_origin: "",
      founded: undefined,
      type: [],
      parent_company: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Make</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="country">Country of Origin</Label>
            <Input
              id="country"
              value={formData.country_of_origin}
              onChange={(e) =>
                setFormData({ ...formData, country_of_origin: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="founded">Founded Year</Label>
            <Input
              id="founded"
              type="number"
              value={formData.founded || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  founded: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
            />
          </div>
          <div>
            <Label>Type</Label>
            <MultiSelect
              options={MAKE_TYPES.map((type) => ({ label: type, value: type }))}
              value={formData.type?.map((t) => ({ label: t, value: t })) || []}
              onChange={(selected) =>
                setFormData({
                  ...formData,
                  type: selected.map((s) => s.value),
                })
              }
              placeholder="Select types..."
            />
          </div>
          <div>
            <Label htmlFor="parent">Parent Company</Label>
            <Input
              id="parent"
              value={formData.parent_company}
              onChange={(e) =>
                setFormData({ ...formData, parent_company: e.target.value })
              }
            />
          </div>
          <Button type="submit" className="w-full">
            Add Make
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
