"use client";

import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAPI } from "@/hooks/useAPI";
import { Loader2, Save, X, FileJson } from "lucide-react";
import { CarData } from "./BaseSpecifications";
import { MeasurementValue } from "@/types/measurements";

// Lazy load heavy utility modules
const SpecificationUtilities = lazy(() =>
  import("./utils/SpecificationUtilities").then((module) => ({
    default: module.default,
  }))
);

const JsonUploadPasteModal = lazy(
  () => import("@/components/common/JsonUploadPasteModal")
);

// Lightweight utility functions for immediate use
const getInputValue = (
  value: string | number | MeasurementValue | null | undefined
): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  return String(value.value || "");
};

const getNumberInputValue = (
  value: string | number | MeasurementValue | null | undefined
): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return String(value.value || "");
};

interface SpecificationsEditorConfig {
  carId: string;
  onSave: (specs: Partial<CarData>) => Promise<void>;
  onCancel: () => void;
}

interface SpecificationsEditorProps {
  config: SpecificationsEditorConfig;
  carData: CarData;
  isEditMode: boolean;
}

// Memoized input field component to prevent re-renders
const MemoizedInputField = React.memo(
  ({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, "-")}>{label}</Label>
      <Input
        id={label.toLowerCase().replace(/\s+/g, "-")}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
);
MemoizedInputField.displayName = "MemoizedInputField";

// Memoized textarea component
const MemoizedTextarea = React.memo(
  ({
    label,
    value,
    onChange,
    placeholder,
    rows = 4,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, "-")}>{label}</Label>
      <Textarea
        id={label.toLowerCase().replace(/\s+/g, "-")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  )
);
MemoizedTextarea.displayName = "MemoizedTextarea";

// Memoized select component
const MemoizedSelect = React.memo(
  ({
    label,
    value,
    onChange,
    options,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
);
MemoizedSelect.displayName = "MemoizedSelect";

export const SpecificationsEditor = React.memo<SpecificationsEditorProps>(
  function SpecificationsEditor({
    config,
    carData,
    isEditMode,
  }: SpecificationsEditorProps) {
    const api = useAPI();
    const [localSpecs, setLocalSpecs] = useState<Partial<CarData>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isJsonUploadModalOpen, setIsJsonUploadModalOpen] = useState(false);
    const [isSubmittingJson, setIsSubmittingJson] = useState(false);
    const [hasLoadedUtilities, setHasLoadedUtilities] = useState(true);

    // Initialize local specs from car data
    useEffect(() => {
      if (carData) {
        setLocalSpecs(carData);
      }
    }, [carData]);

    // Optimized input handlers with useCallback
    const handleInputChange = useCallback((field: string, value: any) => {
      setLocalSpecs((prev) => ({
        ...prev,
        [field]: value,
      }));
    }, []);

    const handleNestedInputChange = useCallback(
      (parent: string, field: string, value: any) => {
        setLocalSpecs((prev) => ({
          ...prev,
          [parent]: {
            ...((prev as any)[parent] || {}),
            [field]: value,
          },
        }));
      },
      []
    );

    const handleSave = useCallback(async () => {
      try {
        setIsSaving(true);
        await config.onSave(localSpecs);
        toast.success("Specifications saved successfully");
      } catch (error) {
        console.error("Error saving specifications:", error);
        toast.error("Failed to save specifications");
      } finally {
        setIsSaving(false);
      }
    }, [config, localSpecs]);

    const handleCancel = useCallback(() => {
      setLocalSpecs({});
      config.onCancel();
    }, [config]);

    // Simple merge function for basic JSON operations
    const mergeSpecs = useCallback(
      (jsonData: any[]) => {
        if (jsonData.length > 0) {
          const newSpecs = { ...localSpecs, ...jsonData[0] };
          setLocalSpecs(newSpecs);
          toast.success("JSON data imported successfully");
        }
      },
      [localSpecs]
    );

    const handleJsonSubmit = useCallback(
      async (jsonData: any[]) => {
        try {
          setIsSubmittingJson(true);
          mergeSpecs(jsonData);
        } catch (error) {
          console.error("Error processing JSON:", error);
          toast.error("Failed to import JSON data");
        } finally {
          setIsSubmittingJson(false);
          setIsJsonUploadModalOpen(false);
        }
      },
      [mergeSpecs]
    );

    const handleAdvancedFeatures = useCallback(() => {
      setHasLoadedUtilities(true);
    }, []);

    // If not in edit mode, don't render anything
    if (!isEditMode) {
      return null;
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Edit Specifications</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsJsonUploadModalOpen(true)}
            >
              <FileJson className="w-4 h-4 mr-2" />
              Import JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Basic Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MemoizedInputField
              label="Make"
              value={getInputValue(localSpecs.make)}
              onChange={(value) => handleInputChange("make", value)}
              placeholder="e.g., BMW"
            />
            <MemoizedInputField
              label="Model"
              value={getInputValue(localSpecs.model)}
              onChange={(value) => handleInputChange("model", value)}
              placeholder="e.g., M3"
            />
            <MemoizedInputField
              label="Year"
              type="number"
              value={getNumberInputValue(localSpecs.year)}
              onChange={(value) =>
                handleInputChange("year", parseInt(value) || "")
              }
              placeholder="e.g., 2023"
            />
            <MemoizedInputField
              label="VIN"
              value={getInputValue(localSpecs.vin)}
              onChange={(value) => handleInputChange("vin", value)}
              placeholder="Vehicle Identification Number"
            />
            <MemoizedInputField
              label="Color"
              value={getInputValue(localSpecs.color)}
              onChange={(value) => handleInputChange("color", value)}
              placeholder="e.g., Alpine White"
            />
            <MemoizedInputField
              label="Interior Color"
              value={getInputValue(localSpecs.interior_color)}
              onChange={(value) => handleInputChange("interior_color", value)}
              placeholder="e.g., Black Leather"
            />
          </CardContent>
        </Card>

        {/* Pricing Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MemoizedInputField
              label="List Price"
              type="number"
              value={getNumberInputValue(localSpecs.price?.listPrice)}
              onChange={(value) =>
                handleNestedInputChange(
                  "price",
                  "listPrice",
                  parseFloat(value) || null
                )
              }
              placeholder="e.g., 75000"
            />
            <MemoizedInputField
              label="Sold Price"
              type="number"
              value={getNumberInputValue(localSpecs.price?.soldPrice)}
              onChange={(value) =>
                handleNestedInputChange(
                  "price",
                  "soldPrice",
                  parseFloat(value) || null
                )
              }
              placeholder="e.g., 72000"
            />
          </CardContent>
        </Card>

        {/* Status and Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Status and Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MemoizedSelect
                label="Status"
                value={localSpecs.status || ""}
                onChange={(value) => handleInputChange("status", value)}
                options={[
                  { value: "available", label: "Available" },
                  { value: "sold", label: "Sold" },
                  { value: "pending", label: "Pending" },
                ]}
                placeholder="Select status"
              />
              <MemoizedInputField
                label="Condition"
                value={getInputValue(localSpecs.condition)}
                onChange={(value) => handleInputChange("condition", value)}
                placeholder="e.g., Excellent"
              />
            </div>
            <MemoizedTextarea
              label="Description"
              value={getInputValue(localSpecs.description)}
              onChange={(value) => handleInputChange("description", value)}
              placeholder="Detailed description of the vehicle..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Advanced Features - Lazy Loaded */}
        {!hasLoadedUtilities && (
          <Card>
            <CardContent className="py-6">
              <Button
                variant="outline"
                onClick={handleAdvancedFeatures}
                className="w-full"
              >
                Load Advanced Editing Features
              </Button>
            </CardContent>
          </Card>
        )}

        {hasLoadedUtilities && (
          <Suspense
            fallback={
              <Card>
                <CardContent className="py-6 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p>Loading advanced features...</p>
                </CardContent>
              </Card>
            }
          >
            <SpecificationUtilities
              localSpecs={localSpecs}
              onInputChange={handleInputChange}
              onNestedInputChange={handleNestedInputChange}
            />
          </Suspense>
        )}

        {/* JSON Upload Modal */}
        {isJsonUploadModalOpen && (
          <Suspense fallback={<div>Loading JSON uploader...</div>}>
            <JsonUploadPasteModal
              isOpen={isJsonUploadModalOpen}
              onClose={() => setIsJsonUploadModalOpen(false)}
              onSubmit={handleJsonSubmit}
              title="Import Specifications from JSON"
              description="Upload a JSON file or paste JSON data to import specifications."
              expectedType="specifications"
              isSubmitting={isSubmittingJson}
            />
          </Suspense>
        )}
      </div>
    );
  }
);

SpecificationsEditor.displayName = "SpecificationsEditor";
