import { Car } from "@/types/car";
import { MeasurementValue } from "@/types/measurements";
import { Pencil, Sparkles, Loader2 } from "lucide-react";
import { getUnitsForType } from "@/constants/units";
import MeasurementInputWithUnit from "@/components/MeasurementInputWithUnit";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Client } from "@/types/contact";
import { toast } from "react-hot-toast";
import { SpecificationsEnrichment } from "./SpecificationsEnrichment";

// Define the car data structure as we receive it from the API
interface CarData {
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

interface SpecificationProps {
  car: CarData;
  isEditMode?: boolean;
  onEdit?: () => void;
  onSave?: (editedSpecs: Partial<CarData>) => void;
  onCancel?: () => void;
  onRefresh?: () => void;
  editedSpecs?: any;
  onInputChange?: (field: string, value: any, nestedField?: string) => void;
  onMeasurementChange?: (
    field: string,
    value: any,
    nestedField?: string
  ) => void;
  onPowerChange?: (value: MeasurementValue) => void;
  onTorqueChange?: (value: MeasurementValue) => void;
}

interface SpecificationItemProps {
  label: string;
  value: any; // Using any here since we need to handle various MongoDB number formats
  unit?: string;
}

const SpecificationItem = ({ label, value, unit }: SpecificationItemProps) => {
  // Add detailed logging for each specification item
  // [REMOVED] // [REMOVED] console.log(`\n=== ${label} Specification Item Debug ===`);
  // [REMOVED] // [REMOVED] console.log("Raw value:", JSON.stringify(value, null, 2));
  // [REMOVED] // [REMOVED] console.log("Unit:", unit);
  // [REMOVED] // [REMOVED] console.log("Value type:", typeof value);

  if (value === null || value === undefined || value === "") {
    // [REMOVED] // [REMOVED] console.log(`${label}: Skipping null/undefined/empty value`);
    return null;
  }

  let displayValue: string | number = value;

  // Handle MongoDB number format
  if (value && typeof value === "object") {
    console.log(
      `${label}: Processing object value:`,
      JSON.stringify(value, null, 2)
    );

    if ("$numberInt" in value && value.$numberInt !== null) {
      displayValue = Number(value.$numberInt);
      // [REMOVED] // [REMOVED] console.log(`${label}: Extracted $numberInt:`, displayValue);
    } else if ("$numberDouble" in value && value.$numberDouble !== null) {
      displayValue = Number(value.$numberDouble);
      // [REMOVED] // [REMOVED] console.log(`${label}: Extracted $numberDouble:`, displayValue);
    } else if ("value" in value && value.value !== null) {
      // Handle nested value object (e.g. dimensions.gvwr.value)
      const nestedValue = value.value;
      console.log(
        `${label}: Processing nested value:`,
        JSON.stringify(nestedValue, null, 2)
      );

      if (nestedValue && typeof nestedValue === "object") {
        if ("$numberInt" in nestedValue && nestedValue.$numberInt !== null) {
          displayValue = Number(nestedValue.$numberInt);
          // [REMOVED] // [REMOVED] console.log(`${label}: Extracted nested $numberInt:`, displayValue);
        } else if (
          "$numberDouble" in nestedValue &&
          nestedValue.$numberDouble !== null
        ) {
          displayValue = Number(nestedValue.$numberDouble);
          console.log(
            `${label}: Extracted nested $numberDouble:`,
            displayValue
          );
        }
      } else if (nestedValue !== null) {
        displayValue = nestedValue;
        // [REMOVED] // [REMOVED] console.log(`${label}: Using nested value directly:`, displayValue);
      }
    }
  }

  console.log(`${label} final display value:`, {
    displayValue,
    type: typeof displayValue,
  });

  return (
    <div className="flex justify-between py-2 border-b border-[hsl(var(--border-subtle))]/10 dark:border-[hsl(var(--border-subtle))]/20">
      <span className="text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
        {label}
      </span>
      <span className="text-[hsl(var(--foreground))] dark:text-white font-medium">
        {typeof displayValue === "number"
          ? displayValue.toLocaleString()
          : displayValue}
        {unit && ` ${unit}`}
      </span>
    </div>
  );
};

interface SpecificationSectionProps {
  title: string;
  children: React.ReactNode;
}

const SpecificationSection = ({
  title,
  children,
}: SpecificationSectionProps) => {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] dark:text-white mb-3">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
};

// Helper function to handle input values
const getInputValue = (
  value: string | number | MeasurementValue | null | undefined
): string => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return value;
  if (value.value === null) return "";
  return value.value.toString();
};

// Helper function to handle number input values
const getNumberInputValue = (
  value: string | number | MeasurementValue | null | undefined
): string => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return value.toString();
  if (typeof value === "string" && !isNaN(Number(value))) return value;
  if (typeof value === "object" && value.value !== null)
    return value.value.toString();
  return "";
};

// Helper function to format structured measurement values
const formatMeasurement = (
  measurement: MeasurementValue | string | undefined
): string => {
  if (!measurement) return "N/A";
  if (typeof measurement === "string") return measurement;
  if (measurement.value === null) return "N/A";
  return `${measurement.value} ${measurement.unit}`;
};

// Helper function to display mileage
const formatMileage = (mileage: MeasurementValue | undefined): string => {
  if (!mileage || mileage.value === null || mileage.value === undefined)
    return "0";
  return (
    mileage.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
    " " +
    (mileage.unit || "")
  );
};

// Add type information for measurement values
interface MeasurementWithUnit {
  value: number | string | null;
  unit: string;
}

// Add type information for nested objects
interface EngineValue {
  type?: string;
  displacement?: MeasurementWithUnit;
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
}

interface DimensionsValue {
  [key: string]: MeasurementWithUnit;
}

interface InteriorFeaturesValue {
  seats?: number | string | null;
  upholstery?: string;
}

// Common class names for form inputs
const baseInputClasses =
  "bg-[var(--background-primary)] dark:bg-background-primary border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded px-2 py-1 text-[hsl(var(--foreground))] dark:text-white focus:ring-2 focus:ring-[hsl(var(--ring))] dark:focus:ring-[hsl(var(--ring))] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-background-primary";

// Main component definition
const Specifications = ({
  car,
  isEditMode = false,
  onEdit,
  onSave,
  onCancel,
  onRefresh,
  editedSpecs = {},
  onInputChange,
  onMeasurementChange,
  onPowerChange,
  onTorqueChange,
}: SpecificationProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [localSpecs, setLocalSpecs] = useState<Partial<CarData>>(car);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedId, setLastSavedId] = useState(car._id);

  // Update localSpecs when car changes or edit mode is toggled
  useEffect(() => {
    if (car._id !== lastSavedId || !isEditMode) {
      setLocalSpecs(car);
      setLastSavedId(car._id);
    }
  }, [car._id, isEditMode, lastSavedId]);

  const handleInputChange = (field: string, value: any) => {
    const newSpecs = { ...localSpecs } as Record<string, any>;
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      newSpecs[parent] = {
        ...(newSpecs[parent] || {}),
        [child]: value,
      };
    } else {
      newSpecs[field] = value;
    }
    setLocalSpecs(newSpecs as Partial<CarData>);
    onInputChange?.(field, value);
  };

  const handleNestedInputChange = (
    parent: string,
    field: string,
    value: any
  ) => {
    const newSpecs = {
      ...localSpecs,
      [parent]: {
        ...((localSpecs as Record<string, any>)[parent] || {}),
        [field]: value,
      },
    };
    setLocalSpecs(newSpecs);
    onInputChange?.(parent, value, field);
  };

  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(localSpecs);
      // [REMOVED] // [REMOVED] console.log("Save successful");
    } catch (error) {
      console.error("Error saving specifications:", error);
      toast.error("Failed to save specifications");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalSpecs(car);
    onCancel?.();
  };

  useEffect(() => {
    // Fetch clients when component mounts
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/clients");
        if (!response.ok) {
          // Get detailed error information from the response
          let errorDetail = "";
          try {
            const errorData = await response.json();
            errorDetail =
              errorData.details || errorData.error || response.statusText;
          } catch (parseError) {
            errorDetail = response.statusText;
          }
          throw new Error(`Failed to fetch clients: ${errorDetail}`);
        }

        // Ensure the response has the expected format before using it
        const data = await response.json();

        if (!data || !Array.isArray(data.clients)) {
          console.warn("Unexpected response format from /api/clients:", data);
          setClients([]); // Set to empty array as fallback
          return;
        }

        setClients(data.clients || []); // Extract the clients array from the response

        // If we have a client ID but no clientInfo and we have clients data
        if (car.client && !car.clientInfo && data.clients?.length > 0) {
          const clientMatch = data.clients.find(
            (c: Client) => c._id.toString() === car.client
          );
          if (clientMatch) {
            setLocalSpecs((prev) => ({
              ...prev,
              clientInfo: {
                name: clientMatch.name,
                email: clientMatch.email,
                phone: clientMatch.phone,
                company: clientMatch.company,
              },
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        // Set clients to empty array to prevent UI from waiting indefinitely
        setClients([]);
        // Don't crash the whole component on API error
        toast.error(
          error instanceof Error ? error.message : "Failed to load client data"
        );
      }
    };
    fetchClients();
  }, [car.client]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Specifications</h2>
        <div className="flex items-center gap-2">
          {!isEditMode ? (
            <>
              <SpecificationsEnrichment
                carId={car._id || ""}
                onEnrichComplete={onRefresh || (() => {})}
              />
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
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
            </>
          )}
        </div>
      </div>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {/* Basic Info */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Year
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="number"
                value={localSpecs.year || ""}
                onChange={(e) =>
                  handleInputChange("year", parseInt(e.target.value) || "")
                }
                className={`w-24 ${baseInputClasses}`}
              />
            ) : (
              car.year
            )}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Make
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="text"
                value={localSpecs.make || ""}
                onChange={(e) => handleInputChange("make", e.target.value)}
                className={`w-40 ${baseInputClasses}`}
              />
            ) : (
              car.make
            )}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Model
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="text"
                value={localSpecs.model || ""}
                onChange={(e) => handleInputChange("model", e.target.value)}
                className={`w-40 ${baseInputClasses}`}
              />
            ) : (
              car.model
            )}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Color
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="text"
                value={localSpecs.color || ""}
                onChange={(e) => handleInputChange("color", e.target.value)}
                className={`w-40 ${baseInputClasses}`}
              />
            ) : (
              car.color || "N/A"
            )}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Mileage
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
            {isEditMode ? (
              <MeasurementInputWithUnit
                value={
                  localSpecs.mileage ?? {
                    value: car.mileage?.value ?? null,
                    unit: car.mileage?.unit ?? getUnitsForType("MILEAGE")[0],
                  }
                }
                onChange={(value) => handleInputChange("mileage", value)}
                availableUnits={getUnitsForType("MILEAGE")}
                className="justify-end"
              />
            ) : (
              formatMileage(car.mileage)
            )}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            VIN
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white font-mono pr-3">
            {isEditMode ? (
              <input
                type="text"
                value={localSpecs.vin || car.vin || ""}
                onChange={(e) => handleInputChange("vin", e.target.value)}
                className={`w-40 ${baseInputClasses}`}
              />
            ) : (
              car.vin || "N/A"
            )}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Client
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
            {isEditMode ? (
              <select
                value={localSpecs.client ?? ""}
                onChange={(e) => handleInputChange("client", e.target.value)}
                className={`w-48 ${baseInputClasses}`}
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option
                    key={client._id.toString()}
                    value={client._id.toString()}
                  >
                    {client.name}
                  </option>
                ))}
              </select>
            ) : (
              localSpecs.clientInfo?.name ||
              (localSpecs.client &&
                clients.find((c) => c._id.toString() === localSpecs.client)
                  ?.name) ||
              "N/A"
            )}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            Location
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="text"
                value={localSpecs.location || car.location || ""}
                onChange={(e) => handleInputChange("location", e.target.value)}
                className={`w-40 ${baseInputClasses}`}
              />
            ) : (
              car.location || "N/A"
            )}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            List Price
          </span>
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="number"
                value={
                  localSpecs.price?.listPrice ?? car.price?.listPrice ?? ""
                }
                onChange={(e) =>
                  handleInputChange("price", {
                    ...car.price,
                    listPrice: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                className={`w-28 ${baseInputClasses}`}
              />
            ) : car.price?.listPrice ? (
              `$${car.price.listPrice
                .toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
            ) : (
              "Price on request"
            )}
          </span>
        </div>

        {car.status === "sold" && (
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
              Sold Price
            </span>
            <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
              {isEditMode ? (
                <input
                  type="number"
                  value={
                    localSpecs.price?.soldPrice ?? car.price?.soldPrice ?? ""
                  }
                  onChange={(e) =>
                    handleInputChange("price", {
                      ...car.price,
                      soldPrice: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    })
                  }
                  className={`w-28 ${baseInputClasses}`}
                />
              ) : car.price?.soldPrice ? (
                `$${car.price.soldPrice
                  .toString()
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
              ) : (
                "Not recorded"
              )}
            </span>
          </div>
        )}

        {/* Engine Info */}
        {car.engine && (
          <>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                Engine Type
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <input
                    type="text"
                    value={localSpecs.engine?.type || ""}
                    onChange={(e) =>
                      handleNestedInputChange("engine", "type", e.target.value)
                    }
                    className={`w-48 ${baseInputClasses}`}
                  />
                ) : (
                  car.engine?.type || "N/A"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                Displacement
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      localSpecs.engine?.displacement ??
                      car.engine?.displacement ?? {
                        value: null,
                        unit: "L",
                      }
                    }
                    onChange={(value) =>
                      handleInputChange("engine.displacement", value)
                    }
                    availableUnits={["L", "cc"]}
                    className="justify-end"
                  />
                ) : (
                  formatMeasurement(car.engine?.displacement)
                )}
              </span>
            </div>
            {car.engine.power && (
              <>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                    Power Output
                  </span>
                  <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                    {isEditMode ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={
                            localSpecs.engine?.power?.hp ?? car.engine.power.hp
                          }
                          onChange={(e) => {
                            const hp = parseFloat(e.target.value) || 0;
                            const kW = Math.round(hp * 0.7457);
                            const ps = Math.round(hp * 1.014);
                            handleInputChange("engine", {
                              ...car.engine,
                              power: { hp, kW, ps },
                            });
                          }}
                          className={`w-20 ${baseInputClasses}`}
                        />
                        <span>hp</span>
                      </div>
                    ) : (
                      `${car.engine.power.hp} hp / ${car.engine.power.kW} kW / ${car.engine.power.ps} ps`
                    )}
                  </span>
                </div>
              </>
            )}
            {car.engine.torque &&
              (car.engine.torque["lb-ft"] > 0 || car.engine.torque.Nm > 0) && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                    Torque
                  </span>
                  <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                    {car.engine.torque["lb-ft"]} lb-ft / {car.engine.torque.Nm}{" "}
                    Nm
                  </span>
                </div>
              )}
            {car.engine.features && car.engine.features.length > 0 && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                  Engine Features
                </span>
                <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                  {car.engine.features.join(", ")}
                </span>
              </div>
            )}
          </>
        )}

        {/* Manufacturing Info */}
        {car.manufacturing && (
          <>
            {car.manufacturing.series && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                  Series
                </span>
                <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={
                        localSpecs.manufacturing?.series ??
                        car.manufacturing.series ??
                        ""
                      }
                      onChange={(e) =>
                        handleNestedInputChange(
                          "manufacturing",
                          "series",
                          e.target.value
                        )
                      }
                      className={`w-48 ${baseInputClasses}`}
                    />
                  ) : (
                    car.manufacturing.series
                  )}
                </span>
              </div>
            )}
            {car.manufacturing.trim && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                  Trim
                </span>
                <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={
                        localSpecs.manufacturing?.trim ??
                        car.manufacturing.trim ??
                        ""
                      }
                      onChange={(e) =>
                        handleNestedInputChange(
                          "manufacturing",
                          "trim",
                          e.target.value
                        )
                      }
                      className={`w-48 ${baseInputClasses}`}
                    />
                  ) : (
                    car.manufacturing.trim
                  )}
                </span>
              </div>
            )}
            {car.manufacturing.bodyClass && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                  Body Class
                </span>
                <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={getInputValue(
                        localSpecs.manufacturing?.bodyClass ??
                          car.manufacturing.bodyClass
                      )}
                      onChange={(e) =>
                        handleNestedInputChange(
                          "manufacturing",
                          "bodyClass",
                          e.target.value
                        )
                      }
                      className={`w-48 ${baseInputClasses}`}
                    />
                  ) : (
                    car.manufacturing.bodyClass
                  )}
                </span>
              </div>
            )}
          </>
        )}

        {/* Additional Vehicle Info */}
        {car.doors && (
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
              Number of Doors
            </span>
            <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
              {isEditMode ? (
                <input
                  type="number"
                  value={getNumberInputValue(localSpecs.doors ?? car.doors)}
                  onChange={(e) => handleInputChange("doors", e.target.value)}
                  className={`w-24 ${baseInputClasses}`}
                />
              ) : (
                car.doors
              )}
            </span>
          </div>
        )}

        {/* Safety Features */}
        {car.safety?.tpms && (
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
              TPMS Type
            </span>
            <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
              {isEditMode ? (
                <input
                  type="text"
                  value={getInputValue(
                    localSpecs.safety?.tpms?.type ?? car.safety.tpms.type
                  )}
                  onChange={(e) =>
                    handleNestedInputChange(
                      "safety.tpms",
                      "type",
                      e.target.value
                    )
                  }
                  className={`w-48 ${baseInputClasses}`}
                />
              ) : (
                car.safety.tpms.type
              )}
            </span>
          </div>
        )}

        {/* Dimensions */}
        {car.dimensions && (
          <>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                Length
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      localSpecs.dimensions?.length ?? {
                        value: car.dimensions?.length?.value ?? null,
                        unit:
                          car.dimensions?.length?.unit ??
                          getUnitsForType("LENGTH")[0],
                      }
                    }
                    onChange={(value) =>
                      handleNestedInputChange("dimensions", "length", value)
                    }
                    availableUnits={getUnitsForType("LENGTH")}
                    className="justify-end"
                  />
                ) : (
                  formatMeasurement(car.dimensions?.length)
                )}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                Width
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      localSpecs.dimensions?.width ?? {
                        value: car.dimensions?.width?.value ?? null,
                        unit:
                          car.dimensions?.width?.unit ??
                          getUnitsForType("LENGTH")[0],
                      }
                    }
                    onChange={(value) =>
                      handleNestedInputChange("dimensions", "width", value)
                    }
                    availableUnits={getUnitsForType("LENGTH")}
                    className="justify-end"
                  />
                ) : (
                  formatMeasurement(car.dimensions?.width)
                )}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                Height
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      localSpecs.dimensions?.height ?? {
                        value: car.dimensions?.height?.value ?? null,
                        unit:
                          car.dimensions?.height?.unit ??
                          getUnitsForType("LENGTH")[0],
                      }
                    }
                    onChange={(value) =>
                      handleNestedInputChange("dimensions", "height", value)
                    }
                    availableUnits={getUnitsForType("LENGTH")}
                    className="justify-end"
                  />
                ) : (
                  formatMeasurement(car.dimensions?.height)
                )}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                Wheelbase
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      localSpecs.dimensions?.wheelbase ?? {
                        value: car.dimensions?.wheelbase?.value ?? null,
                        unit:
                          car.dimensions?.wheelbase?.unit ??
                          getUnitsForType("LENGTH")[0],
                      }
                    }
                    onChange={(value) =>
                      handleNestedInputChange("dimensions", "wheelbase", value)
                    }
                    availableUnits={getUnitsForType("LENGTH")}
                    className="justify-end"
                  />
                ) : (
                  formatMeasurement(car.dimensions?.wheelbase)
                )}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                GVWR
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      localSpecs.dimensions?.gvwr ?? {
                        value: car.dimensions?.gvwr?.value ?? null,
                        unit:
                          car.dimensions?.gvwr?.unit ??
                          getUnitsForType("WEIGHT")[0],
                      }
                    }
                    onChange={(value) =>
                      handleNestedInputChange("dimensions", "gvwr", value)
                    }
                    availableUnits={getUnitsForType("WEIGHT")}
                    className="justify-end"
                  />
                ) : (
                  formatMeasurement(car.dimensions?.gvwr)
                )}
              </span>
            </div>
          </>
        )}

        {/* Interior Features */}
        {car.interior_features && (
          <>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                Interior Color
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <input
                    type="text"
                    value={
                      localSpecs.interior_color ?? car.interior_color ?? ""
                    }
                    onChange={(e) =>
                      handleInputChange("interior_color", e.target.value)
                    }
                    className={`w-48 ${baseInputClasses}`}
                  />
                ) : (
                  car.interior_color || "N/A"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                Seats
              </span>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
                {isEditMode ? (
                  <input
                    type="number"
                    value={
                      localSpecs.interior_features?.seats ??
                      car.interior_features?.seats ??
                      ""
                    }
                    onChange={(e) =>
                      handleInputChange(
                        "interior_features.seats",
                        parseInt(e.target.value) || ""
                      )
                    }
                    className={`w-24 ${baseInputClasses}`}
                  />
                ) : (
                  car.interior_features.seats || "N/A"
                )}
              </span>
            </div>
          </>
        )}

        {/* Transmission */}
        {car.transmission && (
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
              Transmission Type
            </span>
            <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white pr-3">
              {isEditMode ? (
                <input
                  type="text"
                  value={
                    localSpecs.transmission?.type ?? car.transmission.type ?? ""
                  }
                  onChange={(e) =>
                    handleNestedInputChange(
                      "transmission",
                      "type",
                      e.target.value
                    )
                  }
                  className={`w-48 ${baseInputClasses}`}
                />
              ) : (
                car.transmission.type
              )}
            </span>
          </div>
        )}

        {/* Description */}
        <div className="flex flex-col px-3 py-2">
          <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] mb-2">
            Description
          </span>
          <div className="w-full">
            {isEditMode ? (
              <textarea
                value={localSpecs.description ?? car.description ?? ""}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                className={`w-full h-32 ${baseInputClasses}`}
                placeholder="Enter car description..."
              />
            ) : (
              <p className="text-sm text-[hsl(var(--foreground))] dark:text-white whitespace-pre-wrap">
                {car.description || "No description available"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Specifications;
