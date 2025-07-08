"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileJson, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import JsonUploadPasteModal from "./JsonUploadPasteModal";

export interface JsonImportConfig {
  title: string;
  description?: string;
  expectedType:
    | "cars"
    | "events"
    | "deliverables"
    | "deliverables-relaxed"
    | "specifications";
  buttonText?: string;
  buttonVariant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  carData?: {
    make?: string;
    model?: string;
    year?: number;
    [key: string]: any;
  };
}

interface JsonImportUtilityProps {
  config: JsonImportConfig;
  onImport: (data: any[]) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function JsonImportUtility({
  config,
  onImport,
  disabled = false,
  className = "",
}: JsonImportUtilityProps) {
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJsonSubmit = useCallback(
    async (jsonData: any[]) => {
      try {
        setIsSubmitting(true);
        await onImport(jsonData);
        setShowJsonModal(false);

        const itemCount = jsonData.length;
        const itemType =
          config.expectedType === "cars"
            ? "car"
            : config.expectedType.slice(0, -1); // Remove 's' for singular

        toast.success(
          config.expectedType === "cars"
            ? `Form populated with ${itemType} data`
            : `Successfully imported ${itemCount} ${itemCount === 1 ? itemType : config.expectedType}`
        );
      } catch (error) {
        console.error("Error importing JSON:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to import JSON data"
        );
        throw error; // Re-throw to prevent modal from closing
      } finally {
        setIsSubmitting(false);
      }
    },
    [config.expectedType, onImport]
  );

  const getButtonText = () => {
    if (config.buttonText) return config.buttonText;

    switch (config.expectedType) {
      case "cars":
        return "Import JSON";
      case "events":
        return "Batch Import Events";
      case "deliverables":
        return "Batch Import Deliverables";
      case "deliverables-relaxed":
        return "Batch Import Deliverables (Relaxed)";
      case "specifications":
        return "Import Specifications";
      default:
        return "Import JSON";
    }
  };

  const getDefaultDescription = () => {
    if (config.description) return config.description;

    switch (config.expectedType) {
      case "cars":
        return "Upload a JSON file or paste a JSON object to populate the form with car data.";
      case "events":
        return "Upload a JSON file or paste JSON data to create multiple events at once.";
      case "deliverables":
        return "Upload a JSON file or paste JSON data to create multiple deliverables at once.";
      case "deliverables-relaxed":
        return "Upload a JSON file or paste JSON data to create multiple deliverables at once. The JSON should be an array of deliverable objects with minimal validation - only title is required.";
      case "specifications":
        return "Upload a JSON file or paste a JSON object to update specifications.";
      default:
        return "Upload a JSON file or paste JSON data to import.";
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowJsonModal(true)}
        variant={config.buttonVariant || "outline"}
        size={config.buttonSize || "default"}
        disabled={disabled}
        className={className}
      >
        {config.showIcon !== false && <FileJson className="h-4 w-4 mr-2" />}
        {getButtonText()}
      </Button>

      <JsonUploadPasteModal
        isOpen={showJsonModal}
        onClose={() => setShowJsonModal(false)}
        onSubmit={handleJsonSubmit}
        title={config.title}
        description={getDefaultDescription()}
        expectedType={config.expectedType}
        isSubmitting={isSubmitting}
        carData={config.carData}
      />
    </>
  );
}

// Convenience components for specific use cases
export function CarJsonImport({
  onImport,
  disabled = false,
  className = "",
  carData,
}: {
  onImport: (data: any[]) => Promise<void>;
  disabled?: boolean;
  className?: string;
  carData?: JsonImportConfig["carData"];
}) {
  const config: JsonImportConfig = {
    title: "Import Car Data from JSON",
    expectedType: "cars",
    carData,
  };

  return (
    <JsonImportUtility
      config={config}
      onImport={onImport}
      disabled={disabled}
      className={className}
    />
  );
}

export function EventsJsonImport({
  onImport,
  disabled = false,
  className = "",
}: {
  onImport: (data: any[]) => Promise<void>;
  disabled?: boolean;
  className?: string;
}) {
  const config: JsonImportConfig = {
    title: "Batch Create Events from JSON",
    expectedType: "events",
  };

  return (
    <JsonImportUtility
      config={config}
      onImport={onImport}
      disabled={disabled}
      className={className}
    />
  );
}

export function DeliverablesJsonImport({
  onImport,
  disabled = false,
  className = "",
}: {
  onImport: (data: any[]) => Promise<void>;
  disabled?: boolean;
  className?: string;
}) {
  const config: JsonImportConfig = {
    title: "Batch Create Deliverables from JSON",
    expectedType: "deliverables",
  };

  return (
    <JsonImportUtility
      config={config}
      onImport={onImport}
      disabled={disabled}
      className={className}
    />
  );
}

export function DeliverablesRelaxedJsonImport({
  onImport,
  disabled = false,
  className = "",
}: {
  onImport: (data: any[]) => Promise<void>;
  disabled?: boolean;
  className?: string;
}) {
  const config: JsonImportConfig = {
    title: "Batch Create Deliverables from JSON (Relaxed)",
    expectedType: "deliverables-relaxed",
  };

  return (
    <JsonImportUtility
      config={config}
      onImport={onImport}
      disabled={disabled}
      className={className}
    />
  );
}

export function SpecificationsJsonImport({
  onImport,
  disabled = false,
  className = "",
  carData,
}: {
  onImport: (data: any[]) => Promise<void>;
  disabled?: boolean;
  className?: string;
  carData?: JsonImportConfig["carData"];
}) {
  const config: JsonImportConfig = {
    title: "Update Specifications from JSON",
    description:
      "Upload a JSON file or paste a JSON object to update specifications. Data will be merged with existing specifications.",
    expectedType: "specifications",
    carData,
  };

  return (
    <JsonImportUtility
      config={config}
      onImport={onImport}
      disabled={disabled}
      className={className}
    />
  );
}
