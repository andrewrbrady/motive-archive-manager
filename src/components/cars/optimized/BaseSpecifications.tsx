import React, { useState, useEffect, useCallback } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeasurementValue } from "@/types/measurements";
import { SpecificationsSkeleton } from "./SpecificationsSkeleton";

// Reuse the same interfaces from original component
export interface CarData {
  _id?: string;
  make: string;
  model: string;
  year: number;
  price: {
    listPrice: number | null;
    soldPrice?: number | null;
    priceHistory: Array<{
      type: "list" | "sold";
      price: number | null;
      date: string;
      notes?: string;
    }>;
  };
  mileage?: MeasurementValue;
  color?: string | null;
  interior_color?: string;
  vin?: string;
  status?: "available" | "sold" | "pending";
  condition?: string;
  location?: string;
  description?: string;
  type?: string;
  client?: string;
  clientInfo?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    company?: string;
    role?: string;
    [key: string]: string | undefined;
  };
  engine?: {
    type?: string;
    displacement?: MeasurementValue;
    power?: {
      hp: number;
      kW: number;
      ps: number;
    };
    torque?: {
      "lb-ft": number;
      Nm: number;
    };
    features?: string[];
  };
  dimensions?: {
    wheelbase?: MeasurementValue;
    weight?: MeasurementValue;
    gvwr?: MeasurementValue;
    trackWidth?: MeasurementValue;
    length?: MeasurementValue;
    width?: MeasurementValue;
    height?: MeasurementValue;
  };
  manufacturing?: {
    plant?: {
      city?: string;
      country?: string;
      company?: string;
    };
    series?: string;
    trim?: string;
    bodyClass?: string;
  };
  doors?: number;
  safety?: {
    tpms?: {
      type: string;
      present: boolean;
    };
  };
  aiAnalysis?: {
    [key: string]: {
      value: string;
      confidence: "confirmed" | "inferred" | "suggested";
      source: string;
    };
  };
  performance?: {
    "0_to_60_mph"?: MeasurementValue;
    top_speed?: MeasurementValue;
  };
  interior_features?: {
    seats?: number;
    upholstery?: string;
  };
  transmission?: {
    type: string;
  };
}

export interface BaseSpecificationsConfig {
  carId: string;
  onEdit?: () => void;
  onRefresh?: () => void;
  showEnrichment?: boolean;
}

export interface BaseSpecificationsCallbacks {
  onDataFetch: () => Promise<{
    basicSpecs: CarData;
    advancedSpecs?: any;
    clientData?: any;
  }>;
  onEnrichment?: (carId: string) => Promise<void>;
}

interface BaseSpecificationsProps {
  config: BaseSpecificationsConfig;
  callbacks: BaseSpecificationsCallbacks;
  initialData?: CarData; // Critical path data that might already be available
}

// Utility functions from original component
const formatMileage = (mileage: MeasurementValue | undefined): string => {
  if (!mileage?.value) return "N/A";
  return `${mileage.value.toLocaleString()} ${mileage.unit}`;
};

const formatMeasurement = (
  measurement: MeasurementValue | string | undefined
): string => {
  if (!measurement) return "N/A";
  if (typeof measurement === "string") return measurement;
  if (!measurement.value) return "N/A";
  return `${measurement.value} ${measurement.unit}`;
};

// Reusable specification row component
interface SpecRowProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}

const SpecRow: React.FC<SpecRowProps> = ({ label, value, unit }) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return (
    <div className="flex justify-between py-2 border-b border-[hsl(var(--border-subtle))]/10 dark:border-[hsl(var(--border-subtle))]/20">
      <span className="text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
        {label}
      </span>
      <span className="text-[hsl(var(--foreground))] dark:text-white font-medium">
        {typeof value === "number" ? value.toLocaleString() : value}
        {unit && ` ${unit}`}
      </span>
    </div>
  );
};

// Section header component
interface SectionHeaderProps {
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
  <h3 className="font-medium text-[hsl(var(--foreground))] dark:text-white mb-3 pb-2 border-b border-[hsl(var(--border-subtle))]/20">
    {title}
  </h3>
);

export function BaseSpecifications({
  config,
  callbacks,
  initialData,
}: BaseSpecificationsProps): JSX.Element {
  // Data state
  const [carData, setCarData] = useState<CarData | null>(initialData || null);
  const [error, setError] = useState<string | null>(null);
  const [enriching, setEnriching] = useState(false);

  // Phase 2 improvement: Non-blocking data initialization
  // Only call onDataFetch if we don't have initialData and it's truly needed
  const [hasTriedFetch, setHasTriedFetch] = useState(!!initialData);

  // Update carData when initialData prop changes
  useEffect(() => {
    if (initialData) {
      setCarData(initialData);
      setHasTriedFetch(true);
    }
  }, [initialData]);

  // Non-blocking fallback data fetch only when absolutely necessary
  const handleManualRefresh = useCallback(async () => {
    try {
      setError(null);
      const data = await callbacks.onDataFetch();
      setCarData(data.basicSpecs);
      setHasTriedFetch(true);
    } catch (err) {
      console.error("Error fetching specifications:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    }
  }, [callbacks]);

  const handleEnrichment = async () => {
    if (!callbacks.onEnrichment) return;

    try {
      setEnriching(true);
      await callbacks.onEnrichment(config.carId);
      if (config.onRefresh) {
        config.onRefresh();
      }
    } catch (err) {
      console.error("Enrichment error:", err);
      setError("Failed to enrich specifications");
    } finally {
      setEnriching(false);
    }
  };

  // Phase 2 improvement: Show data immediately if available, or provide non-blocking load option
  if (!carData && !hasTriedFetch) {
    return (
      <div className="space-y-4">
        <div className="bg-muted/30 border border-muted rounded-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Specifications data not loaded
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tab switching is available while data loads
              </p>
            </div>
            <button
              onClick={handleManualRefresh}
              className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Load Specs
            </button>
          </div>
        </div>
        <SpecificationsSkeleton />
      </div>
    );
  }

  // Show error state with non-blocking retry
  if (error && !carData) {
    return (
      <div className="space-y-4">
        <div className="bg-destructive/15 border border-destructive/20 rounded-md p-3">
          <p className="text-destructive text-sm">
            {error}. Tab switching is still available.
          </p>
          <button
            onClick={handleManualRefresh}
            className="text-xs underline text-destructive hover:no-underline mt-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show skeleton while loading but allow tab switching
  if (!carData) {
    return (
      <div className="space-y-4">
        <div className="bg-muted/30 border border-muted rounded-md p-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">
              Loading specifications...
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            You can switch tabs while this loads
          </p>
        </div>
        <SpecificationsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Specifications</h2>
        <div className="flex items-center gap-2">
          {config.showEnrichment && callbacks.onEnrichment && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnrichment}
              disabled={enriching}
            >
              {enriching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enriching...
                </>
              ) : (
                "Enrich Data"
              )}
            </Button>
          )}
          {config.onEdit && (
            <Button variant="outline" size="sm" onClick={config.onEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: Basic Information */}
        <div className="space-y-6">
          <SectionHeader title="Basic Information" />
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            <SpecRow label="Year" value={carData.year} />
            <SpecRow label="Make" value={carData.make} />
            <SpecRow label="Model" value={carData.model} />
            <SpecRow label="Color" value={carData.color || "N/A"} />
            <SpecRow label="Mileage" value={formatMileage(carData.mileage)} />
            <SpecRow label="VIN" value={carData.vin} />
            <SpecRow label="Status" value={carData.status} />
            <SpecRow label="Condition" value={carData.condition} />
            <SpecRow label="Location" value={carData.location} />
            <SpecRow label="Type" value={carData.type} />
            {carData.doors && <SpecRow label="Doors" value={carData.doors} />}
          </div>

          {/* Pricing Information */}
          {carData.price && (
            <div className="space-y-3">
              <SectionHeader title="Pricing" />
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {carData.price.listPrice && (
                  <SpecRow
                    label="List Price"
                    value={`$${carData.price.listPrice.toLocaleString()}`}
                  />
                )}
                {carData.price.soldPrice && (
                  <SpecRow
                    label="Sold Price"
                    value={`$${carData.price.soldPrice.toLocaleString()}`}
                  />
                )}
              </div>
            </div>
          )}

          {/* Client Information */}
          {carData.clientInfo && (
            <div className="space-y-3">
              <SectionHeader title="Client Information" />
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <SpecRow label="Name" value={carData.clientInfo.name} />
                <SpecRow label="Email" value={carData.clientInfo.email} />
                <SpecRow label="Phone" value={carData.clientInfo.phone} />
                <SpecRow label="Company" value={carData.clientInfo.company} />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Detailed Specifications */}
        <div className="space-y-6">
          {/* Engine Information */}
          {carData.engine && (
            <div className="space-y-3">
              <SectionHeader title="Engine" />
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {carData.engine.type && (
                  <SpecRow label="Type" value={carData.engine.type} />
                )}
                {carData.engine.displacement && (
                  <SpecRow
                    label="Displacement"
                    value={formatMeasurement(carData.engine.displacement)}
                  />
                )}
                {carData.engine.power?.hp && (
                  <SpecRow
                    label="Power"
                    value={`${carData.engine.power.hp} hp / ${carData.engine.power.kW} kW / ${carData.engine.power.ps} ps`}
                  />
                )}
                {carData.engine.torque &&
                  (carData.engine.torque["lb-ft"] > 0 ||
                    carData.engine.torque.Nm > 0) && (
                    <SpecRow
                      label="Torque"
                      value={`${carData.engine.torque["lb-ft"]} lb-ft / ${carData.engine.torque.Nm} Nm`}
                    />
                  )}
                {carData.engine.features &&
                  carData.engine.features.length > 0 && (
                    <SpecRow
                      label="Features"
                      value={carData.engine.features.join(", ")}
                    />
                  )}
              </div>
            </div>
          )}

          {/* Transmission */}
          {carData.transmission?.type && (
            <div className="space-y-3">
              <SectionHeader title="Transmission" />
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <SpecRow label="Type" value={carData.transmission.type} />
              </div>
            </div>
          )}

          {/* Dimensions */}
          {carData.dimensions && (
            <div className="space-y-3">
              <SectionHeader title="Dimensions" />
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {carData.dimensions.length && (
                  <SpecRow
                    label="Length"
                    value={formatMeasurement(carData.dimensions.length)}
                  />
                )}
                {carData.dimensions.width && (
                  <SpecRow
                    label="Width"
                    value={formatMeasurement(carData.dimensions.width)}
                  />
                )}
                {carData.dimensions.height && (
                  <SpecRow
                    label="Height"
                    value={formatMeasurement(carData.dimensions.height)}
                  />
                )}
                {carData.dimensions.wheelbase && (
                  <SpecRow
                    label="Wheelbase"
                    value={formatMeasurement(carData.dimensions.wheelbase)}
                  />
                )}
                {carData.dimensions.weight && (
                  <SpecRow
                    label="Weight"
                    value={formatMeasurement(carData.dimensions.weight)}
                  />
                )}
                {carData.dimensions.gvwr && (
                  <SpecRow
                    label="GVWR"
                    value={formatMeasurement(carData.dimensions.gvwr)}
                  />
                )}
                {carData.dimensions.trackWidth && (
                  <SpecRow
                    label="Track Width"
                    value={formatMeasurement(carData.dimensions.trackWidth)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Manufacturing */}
          {carData.manufacturing && (
            <div className="space-y-3">
              <SectionHeader title="Manufacturing" />
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {carData.manufacturing.series && (
                  <SpecRow
                    label="Series"
                    value={carData.manufacturing.series}
                  />
                )}
                {carData.manufacturing.trim && (
                  <SpecRow label="Trim" value={carData.manufacturing.trim} />
                )}
                {carData.manufacturing.bodyClass && (
                  <SpecRow
                    label="Body Class"
                    value={carData.manufacturing.bodyClass}
                  />
                )}
                {carData.manufacturing.plant && (
                  <SpecRow
                    label="Manufacturing Plant"
                    value={`${carData.manufacturing.plant.city}, ${carData.manufacturing.plant.country}`}
                  />
                )}
              </div>
            </div>
          )}

          {/* Performance */}
          {carData.performance && (
            <div className="space-y-3">
              <SectionHeader title="Performance" />
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {carData.performance["0_to_60_mph"] && (
                  <SpecRow
                    label="0-60 mph"
                    value={formatMeasurement(
                      carData.performance["0_to_60_mph"]
                    )}
                  />
                )}
                {carData.performance.top_speed && (
                  <SpecRow
                    label="Top Speed"
                    value={formatMeasurement(carData.performance.top_speed)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Interior Features */}
          {carData.interior_features && (
            <div className="space-y-3">
              <SectionHeader title="Interior" />
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <SpecRow
                  label="Interior Color"
                  value={carData.interior_color || "N/A"}
                />
                {carData.interior_features.seats && (
                  <SpecRow
                    label="Seats"
                    value={carData.interior_features.seats}
                  />
                )}
                {carData.interior_features.upholstery && (
                  <SpecRow
                    label="Upholstery"
                    value={carData.interior_features.upholstery}
                  />
                )}
              </div>
            </div>
          )}

          {/* Safety */}
          {carData.safety?.tpms && (
            <div className="space-y-3">
              <SectionHeader title="Safety" />
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <SpecRow label="TPMS Type" value={carData.safety.tpms.type} />
                <SpecRow
                  label="TPMS Present"
                  value={carData.safety.tpms.present ? "Yes" : "No"}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description (Full Width) */}
      {carData.description && (
        <div className="space-y-3">
          <SectionHeader title="Description" />
          <div className="max-w-4xl max-h-96 overflow-y-auto">
            <p className="text-sm text-[hsl(var(--foreground))] dark:text-white whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
              {carData.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
