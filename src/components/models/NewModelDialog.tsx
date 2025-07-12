"use client";

import React, { useState } from "react";
import {
  VehicleModelClient,
  BODY_STYLES,
  MARKET_SEGMENTS,
} from "@/types/model";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

interface NewModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (model: Partial<VehicleModelClient>) => void;
}

export default function NewModelDialog({
  open,
  onOpenChange,
  onSubmit,
}: NewModelDialogProps) {
  const [formData, setFormData] = useState<Partial<VehicleModelClient>>({
    make: "",
    model: "",
    generation: {
      code: "",
      year_range: {
        start: new Date().getFullYear(),
        end: undefined,
      },
      body_styles: [],
      trims: [],
    },
    engine_options: [],
    market_segment: "",
    description: "",
    tags: [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    // Reset form
    setFormData({
      make: "",
      model: "",
      generation: {
        code: "",
        year_range: {
          start: new Date().getFullYear(),
          end: undefined,
        },
        body_styles: [],
        trims: [],
      },
      engine_options: [],
      market_segment: "",
      description: "",
      tags: [],
    });
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateGeneration = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      generation: {
        ...prev.generation!,
        [field]: value,
      },
    }));
  };

  const updateGenerationYearRange = (
    field: "start" | "end",
    value: number | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      generation: {
        ...prev.generation!,
        year_range: {
          ...prev.generation!.year_range,
          [field]: value,
        },
      },
    }));
  };

  const addTag = () => {
    const tag = prompt("Enter tag:");
    if (tag && tag.trim()) {
      updateFormData("tags", [...(formData.tags || []), tag.trim()]);
    }
  };

  const removeTag = (index: number) => {
    const tags = formData.tags || [];
    updateFormData(
      "tags",
      tags.filter((_, i) => i !== index)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New Vehicle Model</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="space-y-6 p-1">
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                This form creates a basic model structure. Use batch import for
                detailed models with engines and trims.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="make">Make *</Label>
                    <Input
                      id="make"
                      value={formData.make}
                      onChange={(e) => updateFormData("make", e.target.value)}
                      placeholder="e.g., BMW, Toyota"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="model">Model *</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => updateFormData("model", e.target.value)}
                      placeholder="e.g., 3 Series, Camry"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="market_segment">Market Segment</Label>
                    <Select
                      value={formData.market_segment}
                      onValueChange={(value) =>
                        updateFormData("market_segment", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select segment" />
                      </SelectTrigger>
                      <SelectContent>
                        {MARKET_SEGMENTS.map((segment) => (
                          <SelectItem key={segment} value={segment}>
                            {segment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      updateFormData("description", e.target.value)
                    }
                    placeholder="General description of the model..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generation Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="generation_code">Generation Code *</Label>
                    <Input
                      id="generation_code"
                      value={formData.generation?.code}
                      onChange={(e) => updateGeneration("code", e.target.value)}
                      placeholder="e.g., F30, XV70"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="year_start">Start Year</Label>
                    <Input
                      id="year_start"
                      type="number"
                      value={formData.generation?.year_range?.start || ""}
                      onChange={(e) =>
                        updateGenerationYearRange(
                          "start",
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      placeholder="e.g., 2012"
                    />
                  </div>
                  <div>
                    <Label htmlFor="year_end">
                      End Year (leave empty for current production)
                    </Label>
                    <Input
                      id="year_end"
                      type="number"
                      value={formData.generation?.year_range?.end || ""}
                      onChange={(e) =>
                        updateGenerationYearRange(
                          "end",
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      placeholder="e.g., 2018"
                    />
                  </div>
                </div>
                <div>
                  <Label>Body Styles</Label>
                  <MultiSelect
                    options={BODY_STYLES.map((style) => ({
                      label: style,
                      value: style,
                    }))}
                    value={
                      formData.generation?.body_styles?.map((style) => ({
                        label: style,
                        value: style,
                      })) || []
                    }
                    onChange={(selected) =>
                      updateGeneration(
                        "body_styles",
                        selected.map((s) => s.value)
                      )
                    }
                    placeholder="Select body styles..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {formData.tags?.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm cursor-pointer hover:bg-blue-200"
                      onClick={() => removeTag(index)}
                    >
                      {tag} ×
                    </span>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTag}
                  >
                    Add Tag
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Model</Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
