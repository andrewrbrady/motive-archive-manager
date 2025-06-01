import React, { useState, useEffect } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MeasurementValue } from "@/types/measurements";
import { getUnitsForType } from "@/constants/units";
import MeasurementInputWithUnit from "@/components/MeasurementInputWithUnit";
import JsonUploadPasteModal from "@/components/common/JsonUploadPasteModal";
import { CarData } from "./BaseSpecifications";
import { Client } from "@/types/contact";
import { useAPI } from "@/hooks/useAPI";

export interface SpecificationsEditorConfig {
  carId: string;
  onSave: (editedSpecs: Partial<CarData>) => Promise<void>;
  onCancel: () => void;
}

interface SpecificationsEditorProps {
  config: SpecificationsEditorConfig;
  carData: CarData;
  isEditMode: boolean;
}

// Utility functions (extracted from original component)
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

const formatMeasurement = (
  measurement: MeasurementValue | string | undefined
): string => {
  if (!measurement) return "N/A";
  if (typeof measurement === "string") return measurement;
  if (!measurement.value) return "N/A";
  return `${measurement.value} ${measurement.unit}`;
};

const formatMileage = (mileage: MeasurementValue | undefined): string => {
  if (!mileage?.value) return "N/A";
  return `${mileage.value.toLocaleString()} ${mileage.unit}`;
};

export function SpecificationsEditor({
  config,
  carData,
  isEditMode,
}: SpecificationsEditorProps) {
  const api = useAPI();

  // Local state for editing
  const [localSpecs, setLocalSpecs] = useState<Partial<CarData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isJsonUploadModalOpen, setIsJsonUploadModalOpen] = useState(false);
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);

  // Input styling
  const baseInputClasses =
    "px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100";

  // Initialize local specs when entering edit mode
  useEffect(() => {
    if (isEditMode) {
      setLocalSpecs(carData);
    }
  }, [isEditMode, carData]);

  // Fetch clients data in background
  useEffect(() => {
    if (!api || !isEditMode) return;

    const fetchClients = async () => {
      try {
        const data = (await api.get("clients")) as { clients: Client[] };
        if (data && Array.isArray(data.clients)) {
          setClients(data.clients);

          // Auto-populate client info if we have a client ID
          if (
            carData.client &&
            !carData.clientInfo &&
            data.clients.length > 0
          ) {
            const clientMatch = data.clients.find(
              (c: Client) => c._id.toString() === carData.client
            );
            if (clientMatch) {
              setLocalSpecs((prev) => ({
                ...prev,
                clientInfo: {
                  name: clientMatch.name,
                  email: clientMatch.email,
                  phone: clientMatch.phone,
                },
              }));
            }
          }
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        setClients([]);
      }
    };

    fetchClients();
  }, [carData.client, api, isEditMode]);

  // Input handlers
  const handleInputChange = (field: string, value: any) => {
    setLocalSpecs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedInputChange = (
    parent: string,
    field: string,
    value: any
  ) => {
    setLocalSpecs((prev) => ({
      ...prev,
      [parent]: {
        ...((prev as any)[parent] || {}),
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
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
  };

  const handleCancel = () => {
    setLocalSpecs({});
    config.onCancel();
  };

  const handleJsonSubmit = async (jsonData: any[]) => {
    try {
      setIsSubmittingJson(true);

      const mergeDeep = (target: any, source: any): any => {
        const output = Object.assign({}, target);
        for (const key in source) {
          if (
            source[key] &&
            typeof source[key] === "object" &&
            !Array.isArray(source[key])
          ) {
            output[key] = mergeDeep(target[key] || {}, source[key]);
          } else {
            output[key] = source[key];
          }
        }
        return output;
      };

      if (jsonData.length > 0) {
        const newSpecs = mergeDeep(localSpecs, jsonData[0]);
        setLocalSpecs(newSpecs);
        toast.success("JSON data imported successfully");
      }
    } catch (error) {
      console.error("Error processing JSON:", error);
      toast.error("Failed to import JSON data");
    } finally {
      setIsSubmittingJson(false);
      setIsJsonUploadModalOpen(false);
    }
  };

  // If not in edit mode, don't render anything (this component is for editing only)
  if (!isEditMode) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with edit controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Edit Specifications</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsJsonUploadModalOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import JSON
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>

      {/* Basic Info Editing */}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {/* Year */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Year
          </span>
          <input
            type="number"
            value={localSpecs.year || ""}
            onChange={(e) =>
              handleInputChange("year", parseInt(e.target.value) || "")
            }
            className={`w-24 ${baseInputClasses}`}
          />
        </div>

        {/* Make */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Make
          </span>
          <input
            type="text"
            value={localSpecs.make || ""}
            onChange={(e) => handleInputChange("make", e.target.value)}
            className={`w-40 ${baseInputClasses}`}
          />
        </div>

        {/* Model */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Model
          </span>
          <input
            type="text"
            value={localSpecs.model || ""}
            onChange={(e) => handleInputChange("model", e.target.value)}
            className={`w-40 ${baseInputClasses}`}
          />
        </div>

        {/* Color */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Color
          </span>
          <input
            type="text"
            value={localSpecs.color || ""}
            onChange={(e) => handleInputChange("color", e.target.value)}
            className={`w-40 ${baseInputClasses}`}
          />
        </div>

        {/* Mileage */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Mileage
          </span>
          <MeasurementInputWithUnit
            value={
              localSpecs.mileage ?? {
                value: carData.mileage?.value ?? null,
                unit: carData.mileage?.unit ?? getUnitsForType("MILEAGE")[0],
              }
            }
            onChange={(value) => handleInputChange("mileage", value)}
            availableUnits={getUnitsForType("MILEAGE")}
            className="justify-end"
          />
        </div>

        {/* VIN */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            VIN
          </span>
          <input
            type="text"
            value={localSpecs.vin || ""}
            onChange={(e) => handleInputChange("vin", e.target.value)}
            className={`w-48 ${baseInputClasses} font-mono`}
          />
        </div>

        {/* Status */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Status
          </span>
          <select
            value={localSpecs.status || ""}
            onChange={(e) => handleInputChange("status", e.target.value)}
            className={`w-32 ${baseInputClasses}`}
          >
            <option value="">Select...</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Condition */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Condition
          </span>
          <input
            type="text"
            value={localSpecs.condition || ""}
            onChange={(e) => handleInputChange("condition", e.target.value)}
            className={`w-40 ${baseInputClasses}`}
          />
        </div>

        {/* Location */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Location
          </span>
          <input
            type="text"
            value={localSpecs.location || ""}
            onChange={(e) => handleInputChange("location", e.target.value)}
            className={`w-48 ${baseInputClasses}`}
          />
        </div>
      </div>

      {/* Engine Section */}
      <div className="space-y-4">
        <h3 className="font-medium text-[hsl(var(--foreground))] dark:text-white">
          Engine
        </h3>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {/* Engine Type */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
              Type
            </span>
            <input
              type="text"
              value={localSpecs.engine?.type || ""}
              onChange={(e) =>
                handleNestedInputChange("engine", "type", e.target.value)
              }
              className={`w-48 ${baseInputClasses}`}
            />
          </div>

          {/* Engine Displacement */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
              Displacement
            </span>
            <MeasurementInputWithUnit
              value={
                localSpecs.engine?.displacement ?? {
                  value: carData.engine?.displacement?.value ?? null,
                  unit:
                    carData.engine?.displacement?.unit ??
                    getUnitsForType("VOLUME")[0],
                }
              }
              onChange={(value) =>
                handleNestedInputChange("engine", "displacement", value)
              }
              availableUnits={getUnitsForType("VOLUME")}
              className="justify-end"
            />
          </div>

          {/* Power */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
              Power (HP)
            </span>
            <input
              type="number"
              value={
                localSpecs.engine?.power?.hp ?? carData.engine?.power?.hp ?? ""
              }
              onChange={(e) => {
                const hp = parseFloat(e.target.value) || 0;
                const kW = Math.round(hp * 0.7457);
                const ps = Math.round(hp * 1.014);
                handleNestedInputChange("engine", "power", { hp, kW, ps });
              }}
              className={`w-24 ${baseInputClasses}`}
            />
          </div>

          {/* Torque */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
              Torque (lb-ft)
            </span>
            <input
              type="number"
              value={
                localSpecs.engine?.torque?.["lb-ft"] ??
                carData.engine?.torque?.["lb-ft"] ??
                ""
              }
              onChange={(e) => {
                const lbft = parseFloat(e.target.value) || 0;
                const Nm = Math.round(lbft * 1.356);
                handleNestedInputChange("engine", "torque", {
                  "lb-ft": lbft,
                  Nm,
                });
              }}
              className={`w-24 ${baseInputClasses}`}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-4">
        <h3 className="font-medium text-[hsl(var(--foreground))] dark:text-white">
          Description
        </h3>
        <textarea
          value={localSpecs.description ?? carData.description ?? ""}
          onChange={(e) => handleInputChange("description", e.target.value)}
          className={`w-full h-32 ${baseInputClasses}`}
          placeholder="Enter car description..."
        />
      </div>

      {/* JSON Upload Modal */}
      <JsonUploadPasteModal
        isOpen={isJsonUploadModalOpen}
        onClose={() => setIsJsonUploadModalOpen(false)}
        onSubmit={handleJsonSubmit}
        title="Update Specifications from JSON"
        description="Upload a JSON file or paste a JSON object to update car specifications. Data will be merged with existing specifications."
        expectedType="cars"
        isSubmitting={isSubmittingJson}
        carData={{
          make: carData.make,
          model: carData.model,
          year: carData.year,
          color: carData.color,
          vin: carData.vin,
          condition: carData.condition,
          description: carData.description,
        }}
      />
    </div>
  );
}
