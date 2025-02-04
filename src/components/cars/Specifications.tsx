import { Car } from "@/types/car";
import { MeasurementValue } from "@/types/measurements";
import { Pencil, Sparkles } from "lucide-react";
import { getUnitsForType } from "@/constants/units";
import MeasurementInputWithUnit from "@/components/MeasurementInputWithUnit";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Client } from "@/types/car";

// Define the car data structure as we receive it from the API
interface CarData {
  _id?: string;
  make: string;
  model: string;
  year: number;
  price: string | number | null;
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
  onSave?: () => void;
  onCancel?: () => void;
  onEnrich?: () => void;
  isEnriching?: boolean;
  editedSpecs?: any;
  onInputChange?: (field: string, value: any, nestedField?: string) => void;
  onMeasurementChange?: (
    field: string,
    value: any,
    nestedField?: string
  ) => void;
}

interface SpecificationItemProps {
  label: string;
  value: any; // Using any here since we need to handle various MongoDB number formats
  unit?: string;
}

const SpecificationItem = ({ label, value, unit }: SpecificationItemProps) => {
  // Add detailed logging for each specification item
  console.log(`\n=== ${label} Specification Item Debug ===`);
  console.log("Raw value:", JSON.stringify(value, null, 2));
  console.log("Unit:", unit);
  console.log("Value type:", typeof value);

  if (value === null || value === undefined || value === "") {
    console.log(`${label}: Skipping null/undefined/empty value`);
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
      console.log(`${label}: Extracted $numberInt:`, displayValue);
    } else if ("$numberDouble" in value && value.$numberDouble !== null) {
      displayValue = Number(value.$numberDouble);
      console.log(`${label}: Extracted $numberDouble:`, displayValue);
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
          console.log(`${label}: Extracted nested $numberInt:`, displayValue);
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
        console.log(`${label}: Using nested value directly:`, displayValue);
      }
    }
  }

  console.log(`${label} final display value:`, {
    displayValue,
    type: typeof displayValue,
  });

  return (
    <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-800">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-gray-900 dark:text-white font-medium">
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
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
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

export default function Specifications({
  car,
  isEditMode = false,
  onEdit,
  onSave,
  onCancel,
  onEnrich,
  isEnriching,
  editedSpecs = {},
  onInputChange,
  onMeasurementChange,
}: SpecificationProps) {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    // Fetch clients when component mounts
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/clients");
        if (!response.ok) {
          throw new Error(`Failed to fetch clients: ${response.statusText}`);
        }
        const data = await response.json();
        setClients(data);
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };
    fetchClients();
  }, []);

  // Add detailed logging of the car object
  console.log("=== Specifications Component Debug Logs ===");
  console.log("Full car object:", JSON.stringify(car, null, 2));
  console.log("GVWR value:", JSON.stringify(car?.dimensions?.gvwr, null, 2));
  console.log(
    "Series value:",
    JSON.stringify(car?.manufacturing?.series, null, 2)
  );
  console.log("Trim value:", JSON.stringify(car?.manufacturing?.trim, null, 2));

  return (
    <div className="bg-white dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white uppercase">
          Specifications
        </h2>
        <div className="flex items-center gap-2">
          {onEnrich && (
            <Button
              variant="outline"
              size="icon"
              onClick={onEnrich}
              disabled={isEnriching || isEditMode}
              title="Enrich car data"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          )}
          {onEdit && !isEditMode && (
            <Button
              variant="outline"
              size="icon"
              onClick={onEdit}
              disabled={isEnriching}
              title="Edit specifications"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {isEditMode && (
            <>
              <Button
                variant="default"
                onClick={onSave}
                className="bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200"
              >
                Save
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50"
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {/* Basic Info */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Year</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="number"
                value={getNumberInputValue(editedSpecs.year ?? car.year)}
                onChange={(e) => onInputChange?.("year", e.target.value)}
                className="w-24 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
              />
            ) : (
              car.year
            )}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Make</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="text"
                value={getInputValue(editedSpecs.make ?? car.make)}
                onChange={(e) => onInputChange?.("make", e.target.value)}
                className="w-40 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
              />
            ) : (
              car.make
            )}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Model
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="text"
                value={getInputValue(editedSpecs.model ?? car.model)}
                onChange={(e) => onInputChange?.("model", e.target.value)}
                className="w-40 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
              />
            ) : (
              car.model
            )}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Color
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="text"
                value={getInputValue(editedSpecs.color ?? car.color)}
                onChange={(e) => onInputChange?.("color", e.target.value)}
                className="w-40 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
              />
            ) : (
              car.color || "N/A"
            )}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Mileage
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
            {isEditMode ? (
              <MeasurementInputWithUnit
                value={
                  editedSpecs.mileage ?? {
                    value: car.mileage?.value ?? null,
                    unit: car.mileage?.unit ?? getUnitsForType("MILEAGE")[0],
                  }
                }
                onChange={(value) => onMeasurementChange?.("mileage", value)}
                availableUnits={getUnitsForType("MILEAGE")}
                className="justify-end"
              />
            ) : (
              formatMileage(car.mileage)
            )}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">VIN</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white font-mono pr-3">
            {isEditMode ? (
              <input
                type="text"
                value={getInputValue(editedSpecs.vin ?? car.vin)}
                onChange={(e) => onInputChange?.("vin", e.target.value)}
                className="w-40 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
              />
            ) : (
              car.vin || "N/A"
            )}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Client
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
            {isEditMode ? (
              <select
                value={editedSpecs.client ?? car.client ?? ""}
                onChange={(e) => onInputChange?.("client", e.target.value)}
                className="w-48 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name}
                  </option>
                ))}
              </select>
            ) : (
              car.clientInfo?.name || "N/A"
            )}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Location
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="text"
                value={getInputValue(editedSpecs.location ?? car.location)}
                onChange={(e) => onInputChange?.("location", e.target.value)}
                className="w-40 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
              />
            ) : (
              car.location || "N/A"
            )}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Price
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
            {isEditMode ? (
              <input
                type="number"
                value={getNumberInputValue(editedSpecs.price ?? car.price)}
                onChange={(e) => onInputChange?.("price", e.target.value)}
                className="w-28 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
              />
            ) : car.price ? (
              `$${car.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
            ) : car.price === 0 ? (
              "$0"
            ) : (
              ""
            )}
          </span>
        </div>

        {/* Engine Info */}
        {car.engine && (
          <>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Engine Type
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                {isEditMode ? (
                  <input
                    type="text"
                    value={editedSpecs.engine?.type ?? car.engine?.type ?? ""}
                    onChange={(e) =>
                      onInputChange?.("engine", e.target.value, "type")
                    }
                    className="w-48 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
                  />
                ) : (
                  car.engine?.type || "N/A"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Displacement
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      editedSpecs.engine?.displacement ??
                      car.engine?.displacement ?? {
                        value: null,
                        unit: "L",
                      }
                    }
                    onChange={(value) =>
                      onMeasurementChange?.("engine.displacement", value)
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
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Power Output
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                    {car.engine.power.hp} hp / {car.engine.power.kW} kW /{" "}
                    {car.engine.power.ps} ps
                  </span>
                </div>
              </>
            )}
            {car.engine.torque &&
              (car.engine.torque["lb-ft"] > 0 || car.engine.torque.Nm > 0) && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Torque
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                    {car.engine.torque["lb-ft"]} lb-ft / {car.engine.torque.Nm}{" "}
                    Nm
                  </span>
                </div>
              )}
            {car.engine.features && car.engine.features.length > 0 && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Engine Features
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
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
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Series
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={getInputValue(
                        editedSpecs.manufacturing?.series ??
                          car.manufacturing.series
                      )}
                      onChange={(e) =>
                        onInputChange?.(
                          "manufacturing",
                          e.target.value,
                          "series"
                        )
                      }
                      className="w-48 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
                    />
                  ) : (
                    car.manufacturing.series
                  )}
                </span>
              </div>
            )}
            {car.manufacturing.trim && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Trim
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={getInputValue(
                        editedSpecs.manufacturing?.trim ??
                          car.manufacturing.trim
                      )}
                      onChange={(e) =>
                        onInputChange?.("manufacturing", e.target.value, "trim")
                      }
                      className="w-48 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
                    />
                  ) : (
                    car.manufacturing.trim
                  )}
                </span>
              </div>
            )}
            {car.manufacturing.bodyClass && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Body Class
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={getInputValue(
                        editedSpecs.manufacturing?.bodyClass ??
                          car.manufacturing.bodyClass
                      )}
                      onChange={(e) =>
                        onInputChange?.(
                          "manufacturing",
                          e.target.value,
                          "bodyClass"
                        )
                      }
                      className="w-48 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
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
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Number of Doors
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
              {isEditMode ? (
                <input
                  type="number"
                  value={getNumberInputValue(editedSpecs.doors ?? car.doors)}
                  onChange={(e) => onInputChange?.("doors", e.target.value)}
                  className="w-24 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
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
            <span className="text-sm text-gray-600 dark:text-gray-400">
              TPMS Type
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
              {isEditMode ? (
                <input
                  type="text"
                  value={getInputValue(
                    editedSpecs.safety?.tpms?.type ?? car.safety.tpms.type
                  )}
                  onChange={(e) =>
                    onInputChange?.("safety.tpms", e.target.value, "type")
                  }
                  className="w-48 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
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
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Length
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      editedSpecs.dimensions?.length ?? {
                        value: car.dimensions?.length?.value ?? null,
                        unit:
                          car.dimensions?.length?.unit ??
                          getUnitsForType("LENGTH")[0],
                      }
                    }
                    onChange={(value) =>
                      onMeasurementChange?.("dimensions", value, "length")
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
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Width
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      editedSpecs.dimensions?.width ?? {
                        value: car.dimensions?.width?.value ?? null,
                        unit:
                          car.dimensions?.width?.unit ??
                          getUnitsForType("LENGTH")[0],
                      }
                    }
                    onChange={(value) =>
                      onMeasurementChange?.("dimensions", value, "width")
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
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Height
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      editedSpecs.dimensions?.height ?? {
                        value: car.dimensions?.height?.value ?? null,
                        unit:
                          car.dimensions?.height?.unit ??
                          getUnitsForType("LENGTH")[0],
                      }
                    }
                    onChange={(value) =>
                      onMeasurementChange?.("dimensions", value, "height")
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
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Wheelbase
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      editedSpecs.dimensions?.wheelbase ?? {
                        value: car.dimensions?.wheelbase?.value ?? null,
                        unit:
                          car.dimensions?.wheelbase?.unit ??
                          getUnitsForType("LENGTH")[0],
                      }
                    }
                    onChange={(value) =>
                      onMeasurementChange?.("dimensions", value, "wheelbase")
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
              <span className="text-sm text-gray-600 dark:text-gray-400">
                GVWR
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                {isEditMode ? (
                  <MeasurementInputWithUnit
                    value={
                      editedSpecs.dimensions?.gvwr ?? {
                        value: car.dimensions?.gvwr?.value ?? null,
                        unit:
                          car.dimensions?.gvwr?.unit ??
                          getUnitsForType("WEIGHT")[0],
                      }
                    }
                    onChange={(value) =>
                      onMeasurementChange?.("dimensions", value, "gvwr")
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
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Interior Color
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                {isEditMode ? (
                  <input
                    type="text"
                    value={getInputValue(
                      editedSpecs.interior_color ?? car.interior_color
                    )}
                    onChange={(e) =>
                      onInputChange?.("interior_color", e.target.value)
                    }
                    className="w-48 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
                  />
                ) : (
                  car.interior_color || "N/A"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Seats
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                {isEditMode ? (
                  <input
                    type="number"
                    value={getNumberInputValue(
                      editedSpecs.interior_features?.seats ??
                        car.interior_features?.seats
                    )}
                    onChange={(e) =>
                      onInputChange?.(
                        "interior_features",
                        e.target.value,
                        "seats"
                      )
                    }
                    className="w-24 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
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
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Transmission Type
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
              {isEditMode ? (
                <input
                  type="text"
                  value={getInputValue(
                    editedSpecs.transmission?.type ?? car.transmission.type
                  )}
                  onChange={(e) =>
                    onInputChange?.("transmission", e.target.value, "type")
                  }
                  className="w-48 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
                />
              ) : (
                car.transmission.type || "N/A"
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
